# Dashboard Online Deployment

## Recommended Architecture

Use this stack for production:

- GitHub: source of truth for code, release history, and CI/CD.
- Cloudflare Tunnel + Cloudflare Access: public entrypoint and identity layer.
- VM103 `sif-dashboard`: Super Dashboard for internal engineers and administrators.
- VM201 `sif-client-host`: per-client dashboard ingress and client subsystem runtime.
- VM101 `sif-core`: control plane API and authoritative client registry.

Do not use Firebase Hosting for the main dashboards.

- The Super Dashboard is a server-side Next.js app that depends on private internal APIs.
- The Client Dashboard is a server-side per-client runtime behind VM201, not a static SPA.
- Firebase can still be useful later for push notifications, analytics, or a public landing site, but it is not the best primary runtime for this platform.

## Target Domains

Use two separate DNS patterns.

Your current production plan is:

- Super Dashboard: `sif-admin.marcbd.site`
- Client Dashboards: `*.marcbd.site`

In generic form, the pattern is:

- Super Dashboard: `ops.example.com`
- Client Dashboards: `*.clients.example.com`

Then set the same client base domain in both places:

- VM101 `sif-core`: `SIF_PUBLIC_CLIENT_DOMAIN=marcbd.site`
- VM201 `sif-provisioner`: `PUBLIC_BASE_DOMAIN=marcbd.site`

If those two values do not match, the links returned by `sif-core` will not match the actual nginx routes on `sif-client-host`.

## Certificate Note

This runbook uses the free-friendly hostname pattern:

- Super Dashboard: `sif-admin.marcbd.site`
- Client Dashboards: `<client-subdomain>.marcbd.site`

Cloudflare Universal SSL already covers `*.marcbd.site`, so this pattern avoids the Advanced Certificate Manager requirement that applies to multi-level wildcards such as `*.sif.marcbd.site`.

## Step 1: Update Domain Settings On The VMs

On VM101, edit the systemd unit:

```bash
sudo systemctl edit --full sif-core
```

Add this environment line under `[Service]`:

```ini
Environment=SIF_PUBLIC_CLIENT_DOMAIN=marcbd.site
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart sif-core
```

On VM201, edit the provisioner unit:

```bash
sudo systemctl edit --full sif-provisioner
```

Add this environment line under `[Service]`:

```ini
Environment=PUBLIC_BASE_DOMAIN=marcbd.site
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart sif-provisioner
```

## Step 2: Publish The Super Dashboard Through Cloudflare

On VM103:

1. Install `cloudflared`.
2. Authenticate the machine with your Cloudflare account.
3. Create a tunnel for the Super Dashboard.
4. Point the tunnel to local nginx on port `80`.
5. Route `sif-admin.marcbd.site` to that tunnel.

Example flow:

```bash
cloudflared tunnel login
cloudflared tunnel create sif-super-dashboard
cloudflared tunnel route dns sif-super-dashboard sif-admin.marcbd.site
```

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <SUPER_TUNNEL_ID>
credentials-file: /root/.cloudflared/<SUPER_TUNNEL_ID>.json

ingress:
  - hostname: sif-admin.marcbd.site
    service: http://localhost:80
  - service: http_status:404
```

Install and start the service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Step 3: Protect The Super Dashboard With Cloudflare Access

In Cloudflare Zero Trust:

1. Go to `Access`.
2. Create a self-hosted application for `sif-admin.marcbd.site`.
3. Restrict it to your engineering/admin identities.
4. Prefer email + IdP-backed groups over one-time pins for staff access.

Recommended policy split:

- `Allow`: your company email domain and engineering/admin groups.
- `Block`: everyone else.

## Step 4: Publish Client Dashboards Through Cloudflare

On VM201:

1. Install `cloudflared`.
2. Create a second tunnel dedicated to client dashboards.
3. Point the tunnel to local nginx on port `80`.
4. In the Cloudflare dashboard, add a published application route for `*.marcbd.site` to `http://localhost:80`.
5. Keep `sif-admin.marcbd.site` as a separate explicit DNS hostname pointing to the Super Dashboard tunnel.
6. If your account or workflow does not use wildcard tunnel routes, create one public hostname per client instead and keep the nginx side the same.

Example tunnel flow:

```bash
cloudflared tunnel login
cloudflared tunnel create sif-client-dashboards
cloudflared tunnel route dns sif-client-dashboards '*.marcbd.site'
```

If the wildcard DNS command is not accepted in your setup, create the tunnel first, then add the published application in the Cloudflare dashboard or create a proxied CNAME record:

```dns
*.marcbd.site -> <CLIENT_TUNNEL_ID>.cfargotunnel.com
```

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <CLIENT_TUNNEL_ID>
credentials-file: /root/.cloudflared/<CLIENT_TUNNEL_ID>.json

ingress:
  - hostname: "*.marcbd.site"
    service: http://localhost:80
  - service: http_status:404
```

Install and start the service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Step 5: How Client Dashboards Are Created

The current flow is:

1. An engineer provisions a client from the Super Dashboard or the `sif-core` API.
2. VM101 stores the client record and calls VM201.
3. VM201 creates a dedicated Docker stack for that client.
4. VM201 assigns a localhost port for the client dashboard.
5. VM201 writes an nginx vhost for `<client-subdomain>.marcbd.site`.
6. Cloudflare sends the public request to VM201.
7. nginx proxies that request to the correct client container.

This means every client dashboard is isolated at the container level but still managed centrally.

## Step 6: Recommended Access Model For Clients

Use Cloudflare Access in front of client dashboards too.

Recommended policy options:

- Strongest: one Access application per client hostname, restricted to that client’s named users.
- Operationally simpler: one wildcard Access app for `*.marcbd.site`, but only if you also implement client-level auth inside the dashboard or maintain subdomain-specific allow rules.

Do not put all client users behind one broad wildcard allow rule today. The current client dashboard does not yet enforce its own per-client user auth, so a broad wildcard Access policy would allow an authenticated client user to reach other client hostnames.

If you expect many clients, automate client Access app creation through the Cloudflare API instead of managing each one manually.

For your current requirement, the recommended production split is:

- One staff Access application for `sif-admin.marcbd.site`.
- One client Access application per concrete client hostname such as `acme.marcbd.site`.
- Automation later, once you want self-service onboarding at scale.

## Step 7: GitHub Workflow

Use GitHub this way:

1. Keep `main` as the deployable branch.
2. Add a lightweight CI workflow for:
   - Python `compileall`
   - shell `bash -n`
   - optional future API tests
3. Add a separate deploy workflow later that SSHs into the VMs and runs the deploy scripts.

Do not push directly from production VMs back into GitHub. Treat GitHub as the source of truth and the VMs as deployment targets.

## Step 8: Operational Model

Your clarified product goal maps cleanly to this split:

- Super Dashboard:
  - used by system engineers and administrators
  - provisions clients
  - monitors all client subsystems
  - monitors AI, broker, and observability services
  - handles global policy and model rollout

- Client Dashboard:
  - dedicated hostname per client
  - scoped visibility into that client’s subsystem events
  - future place for local network connectors, cloud account connectors, service inventory, and customer alerts

## Step 9: Next Product Steps

The current client dashboard is a baseline operational dashboard, not yet a full customer portal.

To reach your full target state, add:

1. Local network collectors on the client side.
2. Cloud connectors for AWS, Azure, and GCP.
3. Asset inventory and service inventory models in `sif-core`.
4. Client-scoped RBAC and user management.
5. Alerting and notification workflows.
6. Per-client dashboard views for assets, threats, services, and posture.

## Deployment Checklist

- VM101 `sif-core` running and `SIF_PUBLIC_CLIENT_DOMAIN` set correctly.
- VM103 `sif-dashboard` reachable locally on port `80`.
- VM201 `sif-provisioner` running and `PUBLIC_BASE_DOMAIN` set correctly.
- VM201 nginx running and returning `404` for unknown hosts.
- Cloudflare tunnel for `sif-admin.marcbd.site` active.
- Cloudflare tunnel for client dashboards active.
- Cloudflare Access policies applied for staff and clients.
- Provisioning a new client returns the expected public dashboard URL.
