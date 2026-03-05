# Proxmox Deployment Guide (Super Control + Tenant Subsystems)

Target nodes:
- `server1` (`172.16.185.182`, tunnel: `sif1.marcbd.site`) -> super control + tenant runtime
- `server2` (`172.16.184.111`, tunnel: `sif2.marcbd.site`) -> tenant runtime / federation peer

## 1. Prepare both servers

```bash
apt update && apt install -y python3 python3-venv python3-pip git
mkdir -p /opt/sif-research-3
cd /opt/sif-research-3
```

## 2. Clone repository

```bash
git clone https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3.git .
```

## 3. Configure runtime

Edit `config/runtime.json` and set peer endpoints for your environment.  
Set optional threat-intel API keys:

```bash
export ABUSEIPDB_API_KEY="<key>"
export OTX_API_KEY="<key>"
export SIF_DRY_RUN=false
export ASLF_SUPER_ADMIN_USER=admin
export ASLF_SUPER_ADMIN_PASS='change-me-now'
export ASLF_JWT_SECRET='replace-with-strong-entropy-secret'
```

## 4. Validate before service mode

```bash
PYTHONPATH=src python3 run_firewall.py evaluate --event examples/events/ddos.json
bash scripts/run_tests.sh
```

## 5. Run API server manually (quick test)

```bash
python3 run_control_api.py --host 0.0.0.0 --port 9000
```

Main endpoints:
- `GET /health`
- `POST /auth/super/login`
- `POST /auth/tenant/login`
- `POST /super/tenants`
- `POST /super/tenants/{tenant_id}/assets`
- `GET /super/dashboard`
- `POST /super/upgrades`
- `POST /tenant/{tenant_id}/events`
- `GET /tenant/{tenant_id}/dashboard`
- `POST /tenant/{tenant_id}/sync`
- `GET /ws/super?token=<jwt>`
- `GET /ws/tenant/{tenant_id}?token=<jwt>`

## 6. Systemd service

Create `/etc/systemd/system/aslf-osint.service`:

```ini
[Unit]
Description=ASLF-OSINT Super/Tenant API
After=network.target

[Service]
WorkingDirectory=/opt/sif-research-3
Environment=PYTHONUNBUFFERED=1
Environment=PYTHONPATH=/opt/sif-research-3/src
ExecStart=/usr/bin/python3 /opt/sif-research-3/run_control_api.py --host 0.0.0.0 --port 9000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
systemctl daemon-reload
systemctl enable --now aslf-osint
systemctl status aslf-osint
```

## 7. Cloudflare tunnel routing

Expose both nodes:
- `sif1.marcbd.site` -> `http://127.0.0.1:9000`
- `sif2.marcbd.site` -> `http://127.0.0.1:9000`

## 8. Bootstrap first tenant

```bash
curl -s -X POST http://sif1.marcbd.site/super/tenants \
  -H 'Content-Type: application/json' \
  -d '{"organization_name":"Demo Corp","admin_email":"soc@demo.example"}'
```

Use returned `tenant_id` to add assets:

```bash
curl -s -X POST http://sif1.marcbd.site/super/tenants/<tenant_id>/assets \
  -H 'Content-Type: application/json' \
  -d '{"asset_type":"local-network","provider":"onprem","name":"HQ LAN","endpoint":"10.0.0.0/24","criticality":"high"}'
```

## 9. Dashboard use

- Super control page: `https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/super-dashboard.html`
- Tenant page: `https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/tenant-dashboard.html`

Set API base URL in both dashboards to:
- `https://sif1.marcbd.site`

## 10. Upgrade rollout

Publish a new platform release:

```bash
curl -s -X POST http://sif1.marcbd.site/super/upgrades \
  -H 'Content-Type: application/json' \
  -d '{"version":"3.1.0","release_notes":"Policy optimizer and tenant sync patch"}'
```

Tenants receive the update on next `/tenant/{tenant_id}/sync` cycle.
