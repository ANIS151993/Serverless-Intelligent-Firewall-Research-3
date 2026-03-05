# Proxmox Deployment Guide: ASLF-OSINT Super Control + Tenant Subsystems

This guide is the complete deployment runbook for your Research-3 system on two Proxmox servers with Cloudflare tunnel access.

## 0. Target topology

### Your servers
- `server1` (Super Control):
  - Proxmox: `172.16.185.182:8006`
  - Tunnel hostname: `sif1.marcbd.site`
  - Role: primary control plane, super dashboard/API, tenant provisioning, upgrade publication, global analytics
- `server2` (Tenant/Edge Runtime):
  - Proxmox: `172.16.184.111:8006`
  - Tunnel hostname: `sif2.marcbd.site`
  - Role: tenant-side edge runtime, local protection pipeline, telemetry forwarding, fallback runtime

### Access currently available
- SSH: port `22`
- user: `root`
- password: `MARC@151995$`

> Security note: rotate the root password and use SSH keys after first deployment. Do not store GitHub PAT or root password in repo files.

---

## 1. Architecture model implemented in this project

Research-3 implements a hierarchical model:

1. Super Control System (server1)
- creates corporate tenant accounts
- issues tenant API credentials
- maintains global policy and version lifecycle
- monitors all tenant dashboards and telemetry
- publishes upgrades for tenant auto-sync

2. Tenant Compact Subsystem (server2 or client side)
- protects local systems and cloud assets
- keeps local event scoring and response capability
- syncs policy/version from super control
- forwards telemetry for fleet-wide adaptation

3. Dashboard model
- super dashboard: fleet-level operations and governance
- tenant dashboard: client-level assets, threats, traffic, decisions
- real-time streaming through WebSocket endpoints

Research lineage integration:
- Research-1: LSTM baseline security foundation
- Research-2: cross-cloud adaptation and hybrid learning
- Research-3: OSINT-driven autonomous adaptation + super/tenant federation

---

## 2. Prerequisites on both servers

Run on both `server1` and `server2`:

```bash
apt update
apt install -y git python3 python3-venv python3-pip jq curl openssl
```

Optional but recommended:

```bash
timedatectl set-timezone UTC
```

Create deploy directory on both servers:

```bash
mkdir -p /opt/sif-research-3
cd /opt/sif-research-3
```

---

## 3. Clone and bootstrap application

On both servers:

```bash
cd /opt/sif-research-3
git clone https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3.git .
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Quick validation on both servers:

```bash
PYTHONPATH=src python3 run_firewall.py evaluate --event examples/events/benign.json
bash scripts/run_tests.sh
```

---

## 4. Configure runtime and security

### 4.1 Super control env (server1)

Create `/opt/sif-research-3/.env.super`:

```bash
cat >/opt/sif-research-3/.env.super <<'ENV'
PYTHONUNBUFFERED=1
PYTHONPATH=/opt/sif-research-3/src
ASLF_SUPER_ADMIN_USER=admin
ASLF_SUPER_ADMIN_PASS=change-this-now
ASLF_JWT_SECRETS=replace-with-new-signing-secret,replace-with-previous-secret
ASLF_ALLOW_EPHEMERAL_JWT=false
ASLF_ALLOWED_ORIGINS=https://anis151993.github.io
SIF_DRY_RUN=true
ENV
```

Recommended stronger password hash mode:

```bash
SUPER_PASS='change-this-now'
SUPER_HASH="$(printf '%s' "$SUPER_PASS" | openssl dgst -sha256 -r | awk '{print $1}')"

echo "ASLF_SUPER_ADMIN_PASS_SHA256=$SUPER_HASH" >> /opt/sif-research-3/.env.super
```

### 4.2 Tenant/edge env (server2)

Create `/opt/sif-research-3/.env.tenant`:

```bash
cat >/opt/sif-research-3/.env.tenant <<'ENV'
PYTHONUNBUFFERED=1
PYTHONPATH=/opt/sif-research-3/src
ASLF_JWT_SECRETS=replace-with-new-signing-secret,replace-with-previous-secret
ASLF_ALLOW_EPHEMERAL_JWT=false
ASLF_ALLOWED_ORIGINS=https://anis151993.github.io
SIF_DRY_RUN=true
ENV
```

JWT keying notes:
- recommended: set `ASLF_JWT_SECRETS` for rotation (`new,old,...`)
- fallback: set `ASLF_JWT_SECRET`
- startup fails if neither key variable is set unless `ASLF_ALLOW_EPHEMERAL_JWT=true`

### 4.3 Runtime peer configuration (both)

Edit `/opt/sif-research-3/config/runtime.json` and set:

```json
{
  "dry_run_mode": true,
  "peers": [
    "https://sif1.marcbd.site",
    "https://sif2.marcbd.site"
  ],
  "model_state_path": "state/model_state.json"
}
```

> Recommended: keep `"dry_run_mode": true` for the default deployment unless you also deploy dedicated federation ingest endpoints. This avoids event-flow delays from unreachable peer ingest URLs.

### 4.5 Optional: enable active federation mode later

Only switch to active federation after you deploy peer ingest endpoints.

Example toggle:

```bash
# in .env.super and .env.tenant
SIF_DRY_RUN=false
```

And set `config/runtime.json` peer URLs to real ingest receivers, for example:

```json
{
  "peers": [
    "https://sif1.marcbd.site/federation/ingest",
    "https://sif2.marcbd.site/federation/ingest"
  ]
}
```

### 4.4 Threat-intel keys (optional but recommended)

Set real API keys in environment (or in secured secrets manager):

```bash
export ABUSEIPDB_API_KEY='<your_key>'
export OTX_API_KEY='<your_key>'
```

---

## 5. Start services with systemd

### 5.1 Super control API service on server1

Create `/etc/systemd/system/aslf-super.service`:

```ini
[Unit]
Description=ASLF-OSINT Super Control API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sif-research-3
EnvironmentFile=/opt/sif-research-3/.env.super
ExecStart=/opt/sif-research-3/.venv/bin/python /opt/sif-research-3/run_control_api.py --host 0.0.0.0 --port 9000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable --now aslf-super
systemctl status aslf-super --no-pager
```

### 5.2 Tenant edge runtime service on server2

Create `/etc/systemd/system/aslf-tenant.service`:

```ini
[Unit]
Description=ASLF-OSINT Tenant Edge Runtime
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sif-research-3
EnvironmentFile=/opt/sif-research-3/.env.tenant
ExecStart=/opt/sif-research-3/.venv/bin/python /opt/sif-research-3/run_control_api.py --host 0.0.0.0 --port 9000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable --now aslf-tenant
systemctl status aslf-tenant --no-pager
```

---

## 6. Cloudflare tunnel routing

Ensure tunnel routes map correctly:

- `sif1.marcbd.site` -> `http://127.0.0.1:9000` on server1
- `sif2.marcbd.site` -> `http://127.0.0.1:9000` on server2

If using `cloudflared` config, example ingress:

```yaml
ingress:
  - hostname: sif1.marcbd.site
    service: http://127.0.0.1:9000
  - hostname: sif2.marcbd.site
    service: http://127.0.0.1:9000
  - service: http_status:404
```

---

## 7. Super control bootstrap flow (JWT-based)

All `/super/*` and `/tenant/*` APIs are authenticated.

### 7.1 Login as super admin

```bash
SUPER_TOKEN=$(curl -s -X POST https://sif1.marcbd.site/auth/super/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"change-this-now"}' | jq -r .token)

echo "$SUPER_TOKEN" | cut -c1-32
```

### 7.2 Create a corporate tenant

```bash
TENANT_JSON=$(curl -s -X POST https://sif1.marcbd.site/super/tenants \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"organization_name":"Acme Corp","admin_email":"soc@acme.example"}')

echo "$TENANT_JSON" | jq
TENANT_ID=$(echo "$TENANT_JSON" | jq -r .tenant_id)
TENANT_API_TOKEN=$(echo "$TENANT_JSON" | jq -r .api_token)
```

### 7.3 Login as tenant admin

```bash
TENANT_TOKEN=$(curl -s -X POST https://sif1.marcbd.site/auth/tenant/login \
  -H 'Content-Type: application/json' \
  -d "{\"tenant_id\":\"$TENANT_ID\",\"api_token\":\"$TENANT_API_TOKEN\"}" | jq -r .token)

echo "$TENANT_TOKEN" | cut -c1-32
```

---

## 8. Add tenant assets (local + cloud + network)

Examples:

### 8.1 Local network asset

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/assets" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "asset_type":"local-network",
    "provider":"onprem",
    "name":"HQ LAN",
    "endpoint":"10.0.0.0/24",
    "criticality":"high",
    "tags":["corp","lan"]
  }' | jq
```

### 8.2 AWS service asset

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/assets" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "asset_type":"cloud-service",
    "provider":"aws",
    "name":"prod-api-gateway",
    "endpoint":"arn:aws:apigateway:region::/restapis/example",
    "criticality":"high",
    "tags":["public","critical"]
  }' | jq
```

### 8.3 Azure service asset

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/assets" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "asset_type":"cloud-service",
    "provider":"azure",
    "name":"prod-function-app",
    "endpoint":"/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Web/sites/app",
    "criticality":"high",
    "tags":["serverless"]
  }' | jq
```

---

## 9. Send events and validate protection behavior

Use tenant token to send an event:

```bash
curl -s -X POST "https://sif1.marcbd.site/tenant/$TENANT_ID/events" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "event_id":"evt-live-001",
    "provider":"aws",
    "src_ip":"198.51.100.45",
    "dst_service":"api-gateway",
    "protocol":"https",
    "requests_per_second":820,
    "failed_auth":9,
    "geo_velocity":4,
    "anomaly_score":88,
    "lateral_hops":3,
    "policy_drift":27,
    "payload_entropy":7.2,
    "identity_confidence":0.58,
    "mfa_verified":false,
    "user_id":"user-447"
  }' | jq
```

Get tenant dashboard payload:

```bash
curl -s "https://sif1.marcbd.site/tenant/$TENANT_ID/dashboard" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq
```

---

## 10. Dashboard operations

### Super dashboard
- URL: `https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/super-dashboard.html`
- API base URL: `https://sif1.marcbd.site`
- Login with super admin user/password (configured in `.env.super`)

### Tenant dashboard
- URL: `https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/tenant-dashboard.html`
- API base URL: `https://sif1.marcbd.site`
- Login with `tenant_id` + `api_token`

Real-time channels:
- `GET /ws/super?token=<jwt>`
- `GET /ws/tenant/<tenant_id>?token=<jwt>`

---

## 11. Automatic upgrade and tenant synchronization

### 11.1 Publish an upgrade from super control

```bash
curl -s -X POST https://sif1.marcbd.site/super/upgrades \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "version":"3.1.0",
    "release_notes":"Improved policy optimizer, sync hardening, dashboard stream refinements",
    "policy_patch":{"block_threshold":78,"challenge_threshold":52}
  }' | jq
```

### 11.2 Tenant sync pull

```bash
curl -s -X POST "https://sif1.marcbd.site/tenant/$TENANT_ID/sync" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq
```

### 11.3 Verify from super dashboard API

```bash
curl -s https://sif1.marcbd.site/super/dashboard \
  -H "Authorization: Bearer $SUPER_TOKEN" | jq '.tenants[] | select(.tenant_id=="'"$TENANT_ID"'")'
```

### 11.4 Tenant lifecycle controls + audit

Disable a tenant:

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/disable" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"incident_triage"}' | jq
```

Rotate tenant API token:

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/rotate-token" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq
```

Reactivate tenant:

```bash
curl -s -X POST "https://sif1.marcbd.site/super/tenants/$TENANT_ID/reactivate" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq
```

Read audit events:

```bash
curl -s "https://sif1.marcbd.site/super/audit?tenant_id=$TENANT_ID&limit=20" \
  -H "Authorization: Bearer $SUPER_TOKEN" | jq
```

Delete tenant:

```bash
curl -s -X DELETE "https://sif1.marcbd.site/super/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $SUPER_TOKEN" | jq
```

---

## 12. Edge fallback mode (reduced dependency)

If super control is temporarily unavailable, run local edge evaluation on tenant node (server2):

```bash
cd /opt/sif-research-3
. .venv/bin/activate
PYTHONPATH=src python3 run_firewall.py evaluate --event examples/events/ddos.json
```

Use this for local protection continuity until sync is restored.

---

## 13. Operational checks and health

### Health endpoint

```bash
curl -s https://sif1.marcbd.site/health
curl -s https://sif2.marcbd.site/health
```

### Service logs

```bash
journalctl -u aslf-super -f
journalctl -u aslf-tenant -f
```

### Smoke test matrix
1. super login success
2. tenant creation success
3. tenant login success
4. asset add success
5. event protection response success
6. super dashboard and tenant dashboard data present
7. WebSocket live updates visible
8. upgrade publish + tenant sync success
9. tenant disable/reactivate/rotate-token/delete success
10. super audit contains lifecycle entries

Optional scripted smoke:

```bash
API_BASE=https://sif1.marcbd.site SUPER_USER=admin SUPER_PASS='change-this-now' \
  bash scripts/smoke_super_tenant.sh
```

---

## 14. Codex prompt pack for continuous development

Use these prompts inside Codex on server1 to keep improving the platform.

### Prompt A: Enterprise tenant lifecycle hardening
"Read `src/sif/api_server.py`, `src/sif/multi_tenant.py`, and dashboard files. Implement full tenant lifecycle controls (create, disable, rotate api token, reactivate, delete) with audit trail and tests."

### Prompt B: Edge collector pipeline
"Create a production-ready edge collector service for tenant sites that ingests local syslog/NetFlow and forwards normalized events to `/tenant/{tenant_id}/events` with retry, backoff, and disk spool buffering."

### Prompt C: Automated tenant sync agent
"Implement a sync agent that runs on tenant nodes, calls `/tenant/{tenant_id}/sync`, applies policy/version updates locally, and reports status back to super control. Include systemd unit and tests."

### Prompt D: Multi-cloud asset connector pack
"Add connectors for AWS CloudWatch, Azure Monitor, and GCP Logging to map events into the project event schema and feed the tenant event endpoint."

### Prompt E: Real-time dashboard analytics
"Enhance `docs/dashboard.js` and APIs to include rolling 1m/5m/1h threat trend analytics, top attacker IPs, and decision heatmaps with WebSocket streaming."

### Prompt F: Upgrade safety workflow
"Add staged rollout controls for upgrades (pilot tenant ring, progressive rollout, rollback endpoint) with verification checks before full deployment."

### Prompt G: Security hardening
"Enforce stronger auth controls: refresh tokens, JWT key rotation support, brute-force lockout, and structured audit logging for all auth and admin actions."

### Prompt H: Proxmox automation
"Create Ansible playbooks to deploy ASLF-OSINT on two Proxmox nodes (super and tenant edge), configure systemd services, and perform post-deploy verification automatically."

### Prompt I: Reproducibility package
"Generate a full reproducibility package: deployment script, sample tenant onboarding script, synthetic traffic generator, and verification report artifacts."

### Prompt J: Bench and stress test
"Create load test scenarios for super API and WebSockets (1, 10, 100 tenants), report latency/throughput/error metrics, and propose tuning changes."

---

## 15. Git workflow to publish changes

From `/opt/sif-research-3` on server1:

```bash
git status
git add .
git commit -m "deploy: update proxmox super-tenant production runbook"
git push origin main
```

Do not store PAT tokens in tracked files.

---

## 16. Infrastructure-as-Code (Ansible)

The repository now includes automated deployment assets:

- `infra/ansible/inventory/prod.yml`
- `infra/ansible/group_vars/all.yml`
- `infra/ansible/playbooks/site.yml`

Run:

```bash
cd /opt/sif-research-3/infra/ansible
ansible-playbook -i inventory/prod.yml playbooks/site.yml
```

---

## 17. Important API endpoints reference

- `GET /health`
- `POST /auth/super/login`
- `POST /auth/tenant/login`
- `GET /super/dashboard`
- `GET /super/tenants`
- `GET /super/tenants/{tenant_id}`
- `GET /super/audit`
- `POST /super/tenants`
- `POST /super/tenants/{tenant_id}/assets`
- `POST /super/tenants/{tenant_id}/disable`
- `POST /super/tenants/{tenant_id}/reactivate`
- `POST /super/tenants/{tenant_id}/rotate-token`
- `DELETE /super/tenants/{tenant_id}`
- `POST /super/upgrades`
- `GET /tenant/{tenant_id}/dashboard`
- `GET /tenant/{tenant_id}/sync`
- `POST /tenant/{tenant_id}/events`
- `POST /tenant/{tenant_id}/sync`
- `GET /ws/super?token=<jwt>`
- `GET /ws/tenant/{tenant_id}?token=<jwt>`

This is the full deployment baseline for your two-node Proxmox + Cloudflare environment and matches the current Research-3 implementation.
