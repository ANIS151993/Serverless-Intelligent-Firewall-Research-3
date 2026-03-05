# Proxmox Deployment Playbook (Server1 + Server2)

This guide deploys the Research-3 firewall stack on:
- `server1`: `172.16.185.182` (Cloudflare tunnel: `sif1.marcbd.site`)
- `server2`: `172.16.184.111` (Cloudflare tunnel: `sif2.marcbd.site`)

## 1. Base system preparation (both servers)

```bash
apt update && apt install -y python3 python3-venv python3-pip git jq
mkdir -p /opt/sif-research-3
cd /opt/sif-research-3
```

## 2. Pull repository

```bash
git clone https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3.git .
```

## 3. Configure environment

```bash
cp config/runtime.json config/runtime.local.json
cp config/threat_intel.json config/threat_intel.local.json
```

Edit `config/runtime.local.json`:
- On server1, keep peer list with server2 endpoint.
- On server2, keep peer list with server1 endpoint.

Set environment variables:

```bash
export SIF_DRY_RUN=false
export SIF_FEDERATION_PEERS="http://sif1.marcbd.site:9000/federation/ingest,http://sif2.marcbd.site:9000/federation/ingest"
export ABUSEIPDB_API_KEY="<your-key>"
export OTX_API_KEY="<your-key>"
```

## 4. Local validation before service mode

```bash
PYTHONPATH=src python3 run_firewall.py evaluate --event examples/events/benign.json
PYTHONPATH=src python3 -m unittest discover -s tests -p 'test_*.py' -v
```

## 5. Expose a lightweight API worker (systemd example)

Create `/opt/sif-research-3/app_server.py`:

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))
from sif.firewall import ServerlessIntelligentFirewall

fw = ServerlessIntelligentFirewall(ROOT)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path not in {"/evaluate", "/federation/ingest"}:
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        payload = json.loads(body or b"{}")
        if self.path == "/evaluate":
            result = fw.evaluate(payload)
        else:
            result = {"status": "ack", "received": payload.get("event_id", "unknown")}
        encoded = json.dumps(result).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

HTTPServer(("0.0.0.0", 9000), Handler).serve_forever()
```

Create `/etc/systemd/system/sif-research-3.service`:

```ini
[Unit]
Description=SIF Research-3 API
After=network.target

[Service]
WorkingDirectory=/opt/sif-research-3
Environment=PYTHONUNBUFFERED=1
Environment=PYTHONPATH=/opt/sif-research-3/src
ExecStart=/usr/bin/python3 /opt/sif-research-3/app_server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
systemctl daemon-reload
systemctl enable --now sif-research-3
systemctl status sif-research-3
```

## 6. Cloudflare tunnel routing

Map `sif1.marcbd.site` and `sif2.marcbd.site` to each server’s port `9000`.

## 7. Federation smoke test

From server1:

```bash
curl -X POST http://sif1.marcbd.site/evaluate \
  -H 'Content-Type: application/json' \
  --data @examples/events/ddos.json
```

Check logs:

```bash
journalctl -u sif-research-3 -f
```

## 8. Hardening checklist

- Enable firewall allowlist for management IP ranges.
- Protect API with mTLS or signed service tokens.
- Rotate threat-intel API keys monthly.
- Persist audit logs to external immutable storage.
- Add fail-closed policy for control-plane outages.
