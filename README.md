# Serverless Intelligent Firewall Research-3 (ASLF-OSINT)

## Autonomous Self-Learning Serverless Intelligent Firewall
Integrating REST API-Driven Open-Source Threat Intelligence, Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures

This repository is the combined and extended Research-3 artifact built from the Research-1 and Research-2 lineage.

## Live Portal (GitHub Pages)

- Main portal: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/>
- HTML report: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/report.html>
- Poster page: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/poster.html>
- Implementation guide: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/implementation.html>
- Super control dashboard: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/super-dashboard.html>
- Tenant dashboard: <https://anis151993.github.io/Serverless-Intelligent-Firewall-Research-3/tenant-dashboard.html>

## What is included

1. Interactive research website with:
- graph dashboards (bar, line, pie, radar, scatter)
- stage-by-stage architecture explorer
- browser test lab for simulated security events
- overview video section
- profile hub (LinkedIn, GitHub, Scholar, Portfolio, ResearchGate)

2. Runnable firewall reference implementation:
- REST API-driven OSINT integration (`src/sif/threat_intel.py`)
- adaptive multi-paradigm scoring (`src/sif/model.py`)
- federated zero-trust policy engine (`src/sif/zero_trust.py`)
- provider action orchestration (`src/sif/orchestrator.py`)
- federated propagation coordinator (`src/sif/federation.py`)
- multi-tenant super control + tenant subsystem (`src/sif/multi_tenant.py`)
- control API server (`src/sif/api_server.py`, `run_control_api.py`)

3. Encrypted document distribution flow:
- first-page public preview PDF
- encrypted manuscript bundle (`.doc` + `.pdf`)
- encrypted LaTeX source bundle
- policy gate requiring GitHub follow + YouTube subscribe + email request + password

## Quickstart (local)

```bash
cd /path/to/Serverless-Intelligent-Firewall-Research-3
PYTHONPATH=src python3 run_firewall.py evaluate --event examples/events/benign.json
bash scripts/run_tests.sh
python3 run_control_api.py --host 0.0.0.0 --port 9000
```

## Rebuild encrypted artifacts

```bash
bash scripts/package_encrypted_artifacts.sh
```

Default password used by gate/hash and artifact packaging:

`MARC@151995$`

## Repository structure

```text
.
├── docs/                         # GitHub Pages website
│   ├── index.html
│   ├── report.html
│   ├── poster.html
│   ├── implementation.html
│   ├── super-dashboard.html
│   ├── tenant-dashboard.html
│   ├── styles.css
│   ├── script.js
│   ├── dashboard.js
│   └── assets/
│       ├── images/
│       └── papers/
├── src/sif/                      # Runnable reference firewall implementation
├── config/                       # Policy/runtime/threat-intel config
├── examples/events/              # Deterministic test events
├── tests/                        # Unit tests
├── artifacts/                    # Paper + LaTeX source payloads before encryption
├── scripts/                      # Validation and packaging scripts
├── DEPLOYMENT_PROXMOX_GUIDE.md
├── JOURNAL_MANUSCRIPT_DRAFT.md
└── PROMPTS.md
```

## Proxmox rollout

Use the full two-node playbook:

- [DEPLOYMENT_PROXMOX_GUIDE.md](DEPLOYMENT_PROXMOX_GUIDE.md)

## Security access policy for downloads

1. Follow GitHub: <https://github.com/ANIS151993>
2. Subscribe YouTube: <https://youtu.be/O_pLEz7cyaY>
3. Send password request to: `engr.aanis@gmail.com`
4. Enter password in website gate and then extract encrypted archives locally

## Research lineage

- Research-1 repository: <https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-1>
- Research-2 repository: <https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-2>
- Research-3 repository: <https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3>
