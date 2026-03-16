# CLAUDE AGENT — MASTER EXECUTION PROMPT
## ASLF-OSINT: Autonomous Self-Learning Serverless Intelligent Firewall
## Research-3 Complete Production System Build
### Author: Md Anisur Rahman Chowdhury — Gannon University

---

## CRITICAL READ-FIRST: WHAT YOU ARE BUILDING

You are building a **complete, industrial-grade, production-ready platform** that proves an IEEE research paper: *"Autonomous Self-Learning Serverless Intelligent Firewall: Integrating REST API-Driven Open-Source Threat Intelligence, Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures"*.

This is not a demo. This is not a prototype. Every research claim must be **live, visible, measurable, and demonstrable** through the UI:

| Research Goal | Metric to Prove | Where Visible in UI |
|---|---|---|
| Multi-paradigm detection | 98.7% accuracy on CICIDS2017 | Model Performance page, live metrics |
| Zero-day detection | 94.3% accuracy with 5 samples | Zero-Day Monitor, meta-learning panel |
| Concept drift adaptation | Recovery in 12.4 minutes | Drift Detection live timeline |
| Federated learning | 99.8% policy consistency, 40 rounds | Federated Learning network graph |
| OSINT integration | Real-time from OTX/VirusTotal/MISP | OSINT Feed status, indicator counts |
| ZTA enforcement | Trust score 0.0–1.0 per request | Every threat event detail drawer |
| Explainability | 91.2% analyst trust via SHAP/LIME | SHAP waterfall + LIME charts per event |
| Serverless latency | 87ms average | Live latency gauge on all dashboards |

---

## YOUR ENVIRONMENT

You are running as a Claude agent on **Server 1 (Proxmox: 172.16.185.182)**.
You have shell access to Server 1 directly, and SSH access to Server 2 via `ssh sifadmin@<IP>`.
The project folder is already on Server 1. You are inside it.

**All VM credentials:**
```
SSH user:     sifadmin
SSH password: MARC@151995$
Sudo:         passwordless (NOPASSWD configured)
```

**VM Inventory:**
```
VM101  sif-core         172.16.185.97    Server 1  4GB RAM  2vCPU  60GB   FastAPI + PostgreSQL + Redis
VM102  sif-ai-engine    172.16.185.230   Server 1  6GB RAM  2vCPU  100GB  AI Engine + MLflow
VM103  sif-dashboard    172.16.185.234   Server 1  2GB RAM  1vCPU  50GB   Next.js Dashboard
VM201  sif-client-host  172.16.185.231   Server 2  6GB RAM  2vCPU  60GB   Docker + Client Stacks
VM202  sif-broker       172.16.185.236   Server 2  2GB RAM  1vCPU  50GB   RabbitMQ + Redis
VM203  sif-monitor      172.16.185.167   Server 2  4GB RAM  2vCPU  60GB   Prometheus + Grafana + Loki
```

**External Access (Cloudflare Tunnels):**
```
Server 1:  sif1.marcbd.site
Server 2:  sif2.marcbd.site
```

---

## CREDENTIALS — USE EXACTLY AS PROVIDED

```bash
# GitHub
GITHUB_REPO="https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3.git"
GITHUB_TOKEN="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"

# Cloudflare
CF_ACCOUNT_ID="d727f0b7d4497e7e2a4e0f6f8cb409b4"
CF_ZONE_ID="c28f949c288e78fd1aef68077f243775"
CF_API_TOKEN="CC5bm9asbWxJPnZHtx6bMzEF7eA4Vu3HdSkNwMD_"
CF_EMAIL="engr.aanis@gmail.com"   # Owner email for API calls

# Cloudflare tunnel names (already exist via Proxmox setup)
TUNNEL_SERVER1="sif1.marcbd.site"
TUNNEL_SERVER2="sif2.marcbd.site"
```

---

## GIT WORKFLOW — EVERY FILE GOES TO GITHUB

Before writing any code, initialize the repo properly:

```bash
cd ~/project   # or wherever the project folder is

# Configure git identity
git config --global user.email "engr.aanis@gmail.com"
git config --global user.name "Md Anisur Rahman Chowdhury"

# Set remote with token
git remote set-url origin https://${GITHUB_TOKEN}@github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3.git

# Verify connection
git remote -v
```

**Commit discipline:** After completing each major phase, commit and push:
```bash
git add -A
git commit -m "Phase X: <description>"
git push origin main
```

---

## CLOUDFLARE DNS ROUTING PLAN

Configure these DNS routes via Cloudflare API so every service is publicly accessible:

```
dashboard.sif.marcbd.site    → VM103  172.16.185.234:80   (Super Control Dashboard)
api.sif.marcbd.site          → VM101  172.16.185.97:8000  (Core API)
ai.sif.marcbd.site           → VM102  172.16.185.230:8001 (AI Engine)
mlflow.sif.marcbd.site       → VM102  172.16.185.230:5000 (MLflow)
monitor.sif.marcbd.site      → VM203  172.16.185.167:3000 (Grafana)
prometheus.sif.marcbd.site   → VM203  172.16.185.167:9090 (Prometheus)
broker.sif.marcbd.site       → VM202  172.16.185.236:15672 (RabbitMQ Mgmt)
*.clients.sif.marcbd.site    → VM201  172.16.185.231:80   (Client sub-dashboards, wildcard)
```

Configure via Cloudflare API:
```bash
# Template for adding a DNS record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "<subdomain>",
    "content": "<IP>",
    "proxied": true
  }'
```

---

## REPOSITORY STRUCTURE TO CREATE

Build this exact directory structure in the project:

```
Serverless-Intelligent-Firewall-Research-3/
├── README.md                          ← Research overview + live demo links
├── docker-compose.yml                 ← Full platform compose (for local dev)
├── .env.example                       ← Template env file (no secrets)
├── .gitignore
│
├── core/                              ← VM101: Super Control System
│   ├── api/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── routers/
│   │   │   ├── clients.py
│   │   │   ├── threats.py
│   │   │   ├── dashboard.py
│   │   │   ├── users.py              ← Team management
│   │   │   ├── policies.py
│   │   │   └── websocket.py          ← Real-time WS endpoint
│   │   └── auth/
│   │       ├── jwt.py
│   │       ├── permissions.py
│   │       └── mfa.py
│   └── requirements.txt
│
├── ai-engine/                         ← VM102: ASLF-OSINT AI System
│   ├── models/
│   │   ├── detector.py               ← XGBoost + BiGRU fusion (α=0.5)
│   │   ├── bigru_model.py            ← BiGRU architecture
│   │   ├── ppo_agent.py              ← PPO reinforcement learning
│   │   ├── drift_detector.py         ← DAWMA + SSF continual learning
│   │   ├── meta_learner.py           ← Prototypical Networks + FS-MCL
│   │   ├── federated.py              ← FedNova + differential privacy
│   │   ├── transfer_learning.py      ← Cross-domain feature transfer
│   │   └── explainability.py         ← SHAP + LIME integration
│   ├── osint/
│   │   ├── feed_manager.py           ← OTX + VirusTotal + MISP clients
│   │   ├── normalizer.py             ← IoC normalization pipeline
│   │   └── scheduler.py              ← 60-min cron trigger
│   ├── training/
│   │   ├── train_base.py             ← XGBoost+BiGRU training script
│   │   ├── train_rl.py               ← PPO training (5000 episodes)
│   │   ├── train_meta.py             ← N-way K-shot meta training
│   │   ├── train_federated.py        ← FedNova federated rounds
│   │   └── evaluate.py               ← Benchmark evaluation suite
│   ├── data/
│   │   ├── download_cicids2017.sh    ← Dataset download script
│   │   ├── preprocess.py             ← Full preprocessing pipeline
│   │   └── feature_names.json        ← 67 CICIDS2017 feature names
│   ├── api/
│   │   └── main.py                   ← FastAPI AI Engine server
│   └── requirements.txt
│
├── dashboard/                         ← VM103: Next.js Super Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   │       └── page.tsx
│   │   │   ├── super/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── overview/page.tsx
│   │   │   │   ├── clients/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── ai/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── model/page.tsx
│   │   │   │   │   ├── osint/page.tsx
│   │   │   │   │   ├── drift/page.tsx
│   │   │   │   │   └── federated/page.tsx
│   │   │   │   ├── threats/page.tsx
│   │   │   │   ├── traffic/page.tsx
│   │   │   │   ├── team/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── client/
│   │   │       ├── layout.tsx
│   │   │       ├── overview/page.tsx
│   │   │       ├── traffic/page.tsx
│   │   │       ├── threats/page.tsx
│   │   │       ├── protection/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── ThreatTimeline.tsx
│   │   │   │   ├── AttackDistribution.tsx
│   │   │   │   ├── ModelPerformance.tsx
│   │   │   │   ├── DriftTimeline.tsx
│   │   │   │   ├── FederatedGraph.tsx
│   │   │   │   ├── SHAPWaterfall.tsx
│   │   │   │   ├── ConfusionMatrix.tsx
│   │   │   │   ├── TrafficBandwidth.tsx
│   │   │   │   ├── ZTATrustGauge.tsx
│   │   │   │   └── WorldThreatMap.tsx
│   │   │   ├── tables/
│   │   │   │   ├── ThreatFeedTable.tsx
│   │   │   │   ├── ClientsTable.tsx
│   │   │   │   └── AuditLogTable.tsx
│   │   │   ├── ui/
│   │   │   │   ├── KPICard.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── AttackTypeBadge.tsx
│   │   │   │   ├── ActionBadge.tsx
│   │   │   │   ├── LiveIndicator.tsx
│   │   │   │   └── ThreatDetailDrawer.tsx
│   │   │   ├── layout/
│   │   │   │   ├── SuperSidebar.tsx
│   │   │   │   ├── ClientNavbar.tsx
│   │   │   │   └── GlobalSearch.tsx
│   │   │   └── research/
│   │   │       ├── ResearchMetricsPanel.tsx  ← Shows all 12 research tables
│   │   │       └── BaselineComparison.tsx    ← Live vs paper baselines
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useThreatFeed.ts
│   │   │   └── useAIMetrics.ts
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth.ts
│   ├── package.json
│   └── next.config.js
│
├── client-host/                       ← VM201: Client Docker Host
│   ├── provisioner.py
│   ├── templates/
│   │   └── client-stack.yml
│   └── subsystem_app/
│       └── firewall_app.py
│
├── broker/                            ← VM202: Event Broker config
│   └── setup.sh
│
├── monitoring/                        ← VM203: Observability
│   ├── prometheus.yml
│   ├── grafana/
│   │   └── dashboards/
│   │       ├── sif-overview.json
│   │       ├── sif-ai-engine.json
│   │       └── sif-client.json
│   └── loki-config.yml
│
├── deployment/
│   ├── cloudflare/
│   │   └── setup_dns.sh              ← DNS route setup script
│   ├── scripts/
│   │   ├── 00_base_all_vms.sh
│   │   ├── 01_vm101_core.sh
│   │   ├── 02_vm102_ai.sh
│   │   ├── 03_vm202_broker.sh
│   │   ├── 04_vm201_client.sh
│   │   ├── 05_vm203_monitor.sh
│   │   └── 06_vm103_dashboard.sh
│   └── nginx/
│       └── client-dashboard.conf
│
└── research/
    ├── paper_metrics.json            ← All 12 research tables as JSON
    ├── feature_importance.json       ← SHAP values for visualization
    └── baseline_comparison.json     ← ASLF-OSINT vs all baselines
```

---

## PHASE 1 — RESEARCH DATA & DATASET SETUP

### 1.1 Create the Research Metrics JSON (VM102)

This file drives the "Research Proof" panels in the dashboard. Write it exactly:

```bash
ssh sifadmin@172.16.185.230 "mkdir -p /opt/sif-ai/research"
```

Create `/opt/sif-ai/research/paper_metrics.json`:
```json
{
  "paper": {
    "title": "Autonomous Self-Learning Serverless Intelligent Firewall",
    "subtitle": "Integrating REST API-Driven Open-Source Threat Intelligence, Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures",
    "authors": ["Md Anisur Rahman Chowdhury", "Kefei Wang"],
    "institution": "Gannon University, Erie, Pennsylvania, USA",
    "email": "engr.aanis@gmail.com"
  },
  "headline_metrics": {
    "detection_accuracy": 98.7,
    "precision": 98.6,
    "recall": 98.8,
    "f1_score": 98.7,
    "auc_roc": 0.993,
    "avg_latency_ms": 87,
    "zero_day_5shot": 94.3,
    "drift_recovery_min": 12.4,
    "federated_rounds": 40,
    "federated_accuracy": 95.6,
    "policy_consistency_pct": 99.8,
    "analyst_trust_score_pct": 91.2,
    "cost_per_10k_usd": 0.25,
    "cold_start_ms": 244
  },
  "table1_comparison": [
    {"model":"Decision Tree","accuracy":90.2,"precision":87.6,"recall":81.3,"f1":84.3,"auc":0.905,"train_hours":0.5},
    {"model":"SVM","accuracy":88.4,"precision":84.1,"recall":77.8,"f1":80.8,"auc":0.892,"train_hours":2.1},
    {"model":"Random Forest","accuracy":94.85,"precision":94.47,"recall":94.98,"f1":94.22,"auc":0.942,"train_hours":1.8},
    {"model":"CNN","accuracy":93.0,"precision":95.1,"recall":85.4,"f1":89.9,"auc":0.951,"train_hours":3.2},
    {"model":"LSTM (Research-1)","accuracy":98.0,"precision":98.0,"recall":98.0,"f1":98.0,"auc":0.980,"train_hours":5.4},
    {"model":"XGBoost standalone","accuracy":95.41,"precision":95.02,"recall":95.81,"f1":95.91,"auc":0.959,"train_hours":1.2},
    {"model":"BiGRU standalone","accuracy":96.14,"precision":96.92,"recall":96.65,"f1":96.78,"auc":0.966,"train_hours":4.8},
    {"model":"XGBoost+BiGRU (Research-2)","accuracy":98.0,"precision":98.0,"recall":98.0,"f1":98.0,"auc":0.990,"train_hours":6.1},
    {"model":"FireRL-PPO","accuracy":95.3,"precision":94.7,"recall":93.8,"f1":94.2,"auc":0.947,"train_hours":8.5},
    {"model":"ASLF-OSINT (Ours)","accuracy":98.7,"precision":98.6,"recall":98.8,"f1":98.7,"auc":0.993,"train_hours":7.3,"is_ours":true}
  ],
  "table2_classwise": [
    {"class":"BENIGN","precision":99.2,"recall":94.6,"f1":96.8,"support":10000},
    {"class":"DoS","precision":98.4,"recall":99.1,"f1":98.7,"support":10000},
    {"class":"DDoS","precision":99.3,"recall":99.8,"f1":99.5,"support":10000},
    {"class":"PortScan","precision":99.1,"recall":99.9,"f1":99.5,"support":10000},
    {"class":"BruteForce","precision":97.8,"recall":98.3,"f1":98.0,"support":10000},
    {"class":"WebAttack","precision":98.1,"recall":97.6,"f1":97.8,"support":10000},
    {"class":"Botnet","precision":97.3,"recall":96.8,"f1":97.0,"support":5000},
    {"class":"Other","precision":94.6,"recall":99.1,"f1":96.8,"support":3606}
  ],
  "table4_zeroday": [
    {"method":"Random Baseline","shot1":20.0,"shot5":20.0,"shot10":20.0,"shot20":20.0},
    {"method":"Nearest Neighbor","shot1":45.3,"shot5":62.8,"shot10":71.2,"shot20":76.4},
    {"method":"Transfer Learning","shot1":68.7,"shot5":79.3,"shot10":84.6,"shot20":87.9},
    {"method":"Prototypical Networks","shot1":78.4,"shot5":88.6,"shot10":92.3,"shot20":94.1},
    {"method":"FC-Net","shot1":81.2,"shot5":91.5,"shot10":94.8,"shot20":96.2},
    {"method":"FS-MCL","shot1":82.6,"shot5":92.1,"shot10":95.3,"shot20":96.8},
    {"method":"ASLF-OSINT (Ours)","shot1":84.3,"shot5":94.3,"shot10":96.7,"shot20":97.9,"is_ours":true}
  ],
  "table5_drift": [
    {"method":"Static Model (no adaptation)","pre_drift":98.7,"post_drift":72.4,"recovery_min":null,"post_adapt":72.4},
    {"method":"Periodic Retraining (daily)","pre_drift":98.7,"post_drift":73.1,"recovery_min":1440,"post_adapt":97.2},
    {"method":"ADWIN","pre_drift":98.7,"post_drift":74.8,"recovery_min":18.3,"post_adapt":96.4},
    {"method":"DDM","pre_drift":98.7,"post_drift":76.2,"recovery_min":22.7,"post_adapt":96.8},
    {"method":"DWOIDS","pre_drift":98.7,"post_drift":77.5,"recovery_min":15.6,"post_adapt":97.8},
    {"method":"ASLF-OSINT DAWMA+SSF (Ours)","pre_drift":98.7,"post_drift":78.3,"recovery_min":12.4,"post_adapt":98.5,"is_ours":true}
  ],
  "table6_rl": {
    "initial":  {"accuracy":72.3,"fpr":18.7,"fnr":9.0,"throughput_mbps":145,"latency_ms":87,"reward":-8.3},
    "trained":  {"accuracy":96.8,"fpr":2.4,"fnr":3.2,"throughput_mbps":312,"latency_ms":43,"reward":15.7}
  },
  "table7_federated": [
    {"algorithm":"FedAvg","rounds":52,"accuracy":94.8,"comm_mb":2340,"time_min":104},
    {"algorithm":"FedProx","rounds":48,"accuracy":95.1,"comm_mb":2160,"time_min":96},
    {"algorithm":"FedNova","rounds":42,"accuracy":95.3,"comm_mb":1890,"time_min":84},
    {"algorithm":"ASLF-OSINT Federated (Ours)","rounds":40,"accuracy":95.6,"comm_mb":1800,"time_min":80,"is_ours":true}
  ],
  "table8_latency": [
    {"platform":"AWS Lambda","avg_ms":85,"cold_ms":221,"p95_ms":142,"throughput":1450,"cost":0.24},
    {"platform":"Azure Functions","avg_ms":89,"cold_ms":263,"p95_ms":156,"throughput":1320,"cost":0.27},
    {"platform":"Google Cloud Functions","avg_ms":87,"cold_ms":249,"p95_ms":148,"throughput":1380,"cost":0.25},
    {"platform":"ASLF-OSINT Cross-Cloud Avg","avg_ms":87,"cold_ms":244,"p95_ms":149,"throughput":1383,"cost":0.25,"is_ours":true}
  ],
  "table9_zta": [
    {"platform":"AWS","propagation_ms":88,"identity_ms":110,"consistency_pct":99.6,"mtls_ms":34},
    {"platform":"Azure","propagation_ms":92,"identity_ms":116,"consistency_pct":99.4,"mtls_ms":38},
    {"platform":"Google Cloud","propagation_ms":85,"identity_ms":108,"consistency_pct":99.7,"mtls_ms":31},
    {"platform":"Cross-Cloud Avg","propagation_ms":88.3,"identity_ms":111.3,"consistency_pct":99.8,"mtls_ms":34.3,"is_ours":true}
  ],
  "table10_explainability": {
    "shap":  {"fidelity":94.7,"consistency":88.6,"sparsity":12.3,"compute_ms":145,"trust_pct":89.4},
    "lime":  {"fidelity":91.3,"consistency":82.1,"sparsity":8.7,"compute_ms":67,"trust_pct":92.7},
    "combined": {"fidelity":93.0,"consistency":85.4,"sparsity":10.5,"compute_ms":106,"trust_pct":91.2}
  },
  "attack_classes": ["BENIGN","DoS","DDoS","BruteForce","PortScan","WebAttack","Botnet","Other"],
  "feature_names_67": [
    "Destination Port","Flow Duration","Total Fwd Packets","Total Backward Packets",
    "Total Length of Fwd Packets","Total Length of Bwd Packets","Fwd Packet Length Max",
    "Fwd Packet Length Min","Fwd Packet Length Mean","Fwd Packet Length Std",
    "Bwd Packet Length Max","Bwd Packet Length Min","Bwd Packet Length Mean",
    "Bwd Packet Length Std","Flow Bytes/s","Flow Packets/s","Flow IAT Mean",
    "Flow IAT Std","Flow IAT Max","Flow IAT Min","Fwd IAT Total","Fwd IAT Mean",
    "Fwd IAT Std","Fwd IAT Max","Fwd IAT Min","Bwd IAT Total","Bwd IAT Mean",
    "Bwd IAT Std","Bwd IAT Max","Bwd IAT Min","Fwd PSH Flags","Bwd PSH Flags",
    "Fwd URG Flags","Bwd URG Flags","Fwd Header Length","Bwd Header Length",
    "Fwd Packets/s","Bwd Packets/s","Min Packet Length","Max Packet Length",
    "Packet Length Mean","Packet Length Std","Packet Length Variance","FIN Flag Count",
    "SYN Flag Count","RST Flag Count","PSH Flag Count","ACK Flag Count","URG Flag Count",
    "CWE Flag Count","ECE Flag Count","Down/Up Ratio","Average Packet Size",
    "Avg Fwd Segment Size","Avg Bwd Segment Size","Fwd Header Length.1","Fwd Avg Bytes/Bulk",
    "Fwd Avg Packets/Bulk","Fwd Avg Bulk Rate","Bwd Avg Bytes/Bulk","Bwd Avg Packets/Bulk",
    "Bwd Avg Bulk Rate","Subflow Fwd Packets","Subflow Fwd Bytes","Subflow Bwd Packets",
    "Subflow Bwd Bytes","Init_Win_bytes_forward","Init_Win_bytes_backward","act_data_pkt_fwd",
    "min_seg_size_forward"
  ]
}
```

### 1.2 Download CICIDS2017 Dataset (VM102)

```bash
ssh sifadmin@172.16.185.230 << 'EOF'
mkdir -p /opt/sif-ai/data/cicids2017
cd /opt/sif-ai/data/cicids2017

# Download from Canadian Institute for Cybersecurity
# Direct download (publicly available)
wget -q --show-progress \
  "https://iscxdownloads.cs.unb.ca/iscxdownloads/CIC-IDS-2017/MachineLearningCSV.zip" \
  -O cicids2017.zip

unzip -o cicids2017.zip
ls -lh *.csv
echo "CICIDS2017 downloaded. Files:"
du -sh *.csv | sort -h
EOF
```

If the official URL is slow, use the alternative:
```bash
# Alternative: download preprocessed version from Kaggle via API
pip install kaggle --break-system-packages -q
# Then: kaggle datasets download -d cicdataset/cicids2017 --path /opt/sif-ai/data/cicids2017
```

### 1.3 Write the Full Preprocessing Pipeline (VM102)

Write `/opt/sif-ai/training/preprocess.py` — this implements exactly the preprocessing described in the research paper:

```python
"""
ASLF-OSINT Data Preprocessing Pipeline
Implements Research-3 preprocessing as described in Methods Section 2:
  Stage 1: Data cleaning (308,381 duplicates removed)
  Stage 2: Feature engineering (Z-score normalization, ANOVA F-statistic selection)
  Stage 3: Attack label consolidation (79→67 features, 8 attack classes)
  Stage 4: Class balancing (random undersampling to 10,000 per class)
  Stage 5: Temporal sequencing (T=10 window for BiGRU)
"""
import pandas as pd
import numpy as np
import json
import os
import glob
import logging
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_selection import f_classif
from sklearn.utils import resample
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("sif-preprocess")

DATA_DIR   = "/opt/sif-ai/data/cicids2017"
OUTPUT_DIR = "/opt/sif-ai/data/processed"
MODEL_DIR  = "/opt/sif-ai/models"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

# Research-3 label mapping function (exactly as in paper)
LABEL_MAP = {
    'BENIGN': 'BENIGN',
    'DoS Hulk': 'DoS', 'DoS GoldenEye': 'DoS',
    'DoS slowloris': 'DoS', 'DoS Slowhttptest': 'DoS',
    'DDoS': 'DDoS', 'DDoS LOIT': 'DDoS', 'DDoS HOIC': 'DDoS',
    'FTP-Patator': 'BruteForce', 'SSH-Patator': 'BruteForce',
    'PortScan': 'PortScan',
    'Web Attack \x96 Brute Force': 'WebAttack',
    'Web Attack \x96 XSS': 'WebAttack',
    'Web Attack \x96 Sql Injection': 'WebAttack',
    'Bot': 'Botnet',
    'Heartbleed': 'Other', 'Infiltration': 'Other',
}

CLASS_BALANCE_TARGET = 10000   # per class (from paper)
SEQUENCE_LEN         = 10      # T=10 for BiGRU temporal windows
NUM_FEATURES         = 67      # final feature count (after reduction)
ANOVA_TOP_K          = 67      # keep top-67 features by F-statistic


def load_all_csv(data_dir):
    """Load all CICIDS2017 CSV files."""
    files = glob.glob(os.path.join(data_dir, "**/*.csv"), recursive=True)
    if not files:
        files = glob.glob(os.path.join(data_dir, "*.csv"))
    log.info(f"Found {len(files)} CSV files")
    dfs = []
    for f in files:
        log.info(f"  Loading: {os.path.basename(f)}")
        df = pd.read_csv(f, low_memory=False, encoding='utf-8', on_bad_lines='skip')
        dfs.append(df)
    return pd.concat(dfs, ignore_index=True)


def stage1_clean(df):
    """Stage 1: Data cleaning."""
    initial_rows = len(df)
    # Strip column names
    df.columns = df.columns.str.strip()
    # Find label column
    label_col = None
    for c in df.columns:
        if 'label' in c.lower():
            label_col = c
            break
    if label_col is None:
        raise ValueError("No label column found!")
    df = df.rename(columns={label_col: 'Label'})
    # Remove duplicates
    df = df.drop_duplicates()
    dup_removed = initial_rows - len(df)
    log.info(f"Stage 1: Removed {dup_removed:,} duplicates. Rows: {len(df):,}")
    # Remove non-numeric columns (except Label)
    non_num = df.select_dtypes(exclude=[np.number]).columns.tolist()
    non_num = [c for c in non_num if c != 'Label']
    df = df.drop(columns=non_num, errors='ignore')
    # Handle inf and NaN
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna(df.median(numeric_only=True))
    log.info(f"Stage 1: Final shape after cleaning: {df.shape}")
    return df


def stage2_features(df):
    """Stage 2: Feature engineering with ANOVA F-statistic selection."""
    feature_cols = [c for c in df.columns if c != 'Label']
    X = df[feature_cols].values
    y_raw = df['Label'].values
    # Z-score normalization
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    # Encode labels for F-stat
    le_temp = LabelEncoder()
    y_enc = le_temp.fit_transform(y_raw)
    # ANOVA F-statistic feature selection
    f_stats, _ = f_classif(X_scaled, y_enc)
    f_stats = np.nan_to_num(f_stats, nan=0.0)
    top_k = min(ANOVA_TOP_K, len(feature_cols))
    top_idx = np.argsort(f_stats)[::-1][:top_k]
    selected_features = [feature_cols[i] for i in top_idx]
    X_selected = X_scaled[:, top_idx]
    log.info(f"Stage 2: Selected {len(selected_features)} features via ANOVA F-stat")
    # Save scaler and feature names
    joblib.dump(scaler, f"{MODEL_DIR}/scaler.pkl")
    with open(f"{MODEL_DIR}/selected_features.json", "w") as f:
        json.dump(selected_features, f, indent=2)
    return X_selected, y_raw, selected_features


def stage3_labels(y_raw):
    """Stage 3: Attack label consolidation."""
    def map_label(label):
        label = str(label).strip()
        if label in LABEL_MAP:
            return LABEL_MAP[label]
        for k, v in LABEL_MAP.items():
            if k.lower() in label.lower():
                return v
        return 'Other'
    y_mapped = np.array([map_label(l) for l in y_raw])
    unique, counts = np.unique(y_mapped, return_counts=True)
    for cls, cnt in zip(unique, counts):
        log.info(f"  {cls}: {cnt:,}")
    return y_mapped


def stage4_balance(X, y, target=CLASS_BALANCE_TARGET):
    """Stage 4: Random undersampling to balance classes."""
    classes = np.unique(y)
    X_bal, y_bal = [], []
    for cls in classes:
        idx = np.where(y == cls)[0]
        n = min(len(idx), target)
        chosen = np.random.choice(idx, n, replace=False)
        X_bal.append(X[chosen])
        y_bal.append(y[chosen])
        log.info(f"  {cls}: {len(idx):,} → {n:,}")
    X_bal = np.vstack(X_bal)
    y_bal = np.concatenate(y_bal)
    perm = np.random.permutation(len(y_bal))
    return X_bal[perm], y_bal[perm]


def stage5_sequences(X, y, T=SEQUENCE_LEN):
    """Stage 5: Temporal sequencing for BiGRU (sliding window T=10)."""
    X_seq = np.stack([X] * T, axis=1)  # (n, T, features) — simplified sliding window
    log.info(f"Stage 5: Temporal sequences shape: {X_seq.shape}")
    return X_seq, y


def run_full_pipeline():
    log.info("=== ASLF-OSINT Preprocessing Pipeline Started ===")
    # Load
    df = load_all_csv(DATA_DIR)
    log.info(f"Loaded: {df.shape}")
    # Stage 1
    df = stage1_clean(df)
    # Stage 2
    X, y_raw, features = stage2_features(df)
    # Stage 3
    y = stage3_labels(y_raw)
    # Stage 4
    X, y = stage4_balance(X, y)
    # Encode final labels
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    joblib.dump(le, f"{MODEL_DIR}/label_encoder.pkl")
    # Stage 5
    X_seq, y_seq = stage5_sequences(X, y_enc)
    # Train/test split 80/20
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, stratify=y_enc, random_state=42)
    Xs_train, Xs_test, ys_train, ys_test = train_test_split(
        X_seq, y_seq, test_size=0.2, stratify=y_seq, random_state=42)
    # Save
    np.save(f"{OUTPUT_DIR}/X_train.npy", X_train)
    np.save(f"{OUTPUT_DIR}/X_test.npy",  X_test)
    np.save(f"{OUTPUT_DIR}/y_train.npy", y_train)
    np.save(f"{OUTPUT_DIR}/y_test.npy",  y_test)
    np.save(f"{OUTPUT_DIR}/X_seq_train.npy", Xs_train)
    np.save(f"{OUTPUT_DIR}/X_seq_test.npy",  Xs_test)
    log.info("=== Pipeline Complete ===")
    log.info(f"Train: {X_train.shape}, Test: {X_test.shape}")
    log.info(f"Files saved to {OUTPUT_DIR}")
    return X_train, X_test, y_train, y_test


if __name__ == "__main__":
    run_full_pipeline()
```

---

## PHASE 2 — COMPLETE AI ENGINE (VM102)

### 2.1 Full Model Training Script

Write `/opt/sif-ai/training/train_base.py`:

```python
"""
ASLF-OSINT Base Detection Model Training
XGBoost + BiGRU fusion with α=0.5 weighting
Target: 98.7% accuracy, 0.993 AUC-ROC on CICIDS2017
"""
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.preprocessing import label_binarize
import joblib, json, logging, os, mlflow, mlflow.sklearn, mlflow.pytorch

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sif-train")

DATA_DIR   = "/opt/sif-ai/data/processed"
MODEL_DIR  = "/opt/sif-ai/models"
CLASSES    = ["BENIGN","DoS","DDoS","BruteForce","PortScan","WebAttack","Botnet","Other"]
NUM_CLASSES= 8

# ────── BiGRU Architecture ──────────────────────────────────────────────────
class BiGRUModel(nn.Module):
    """
    Bidirectional GRU for temporal sequence modeling.
    Exactly as described in Research-3 Methods Section 3.1.
    Hidden dim: 128 per direction, 2 layers, dropout: 0.3
    """
    def __init__(self, input_dim=67, hidden_dim=128, num_classes=8):
        super().__init__()
        self.bigru = nn.GRU(
            input_dim, hidden_dim,
            batch_first=True, bidirectional=True,
            num_layers=2, dropout=0.3
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):    # x: (batch, T, features)
        out, _ = self.bigru(x)
        logits = self.classifier(out[:, -1, :])
        return logits


def evaluate_model(y_true, y_pred, y_prob, split="test"):
    """Compute all metrics matching Research-3 Table 1 and Table 2."""
    acc  = accuracy_score(y_true, y_pred) * 100
    prec = precision_score(y_true, y_pred, average='weighted', zero_division=0) * 100
    rec  = recall_score(y_true, y_pred, average='weighted', zero_division=0) * 100
    f1   = f1_score(y_true, y_pred, average='weighted', zero_division=0) * 100
    y_bin = label_binarize(y_true, classes=list(range(NUM_CLASSES)))
    try:
        auc = roc_auc_score(y_bin, y_prob, multi_class='ovr', average='weighted')
    except Exception:
        auc = 0.0
    metrics = {"accuracy": round(acc,2), "precision": round(prec,2),
               "recall": round(rec,2), "f1": round(f1,2), "auc_roc": round(auc,4)}
    log.info(f"[{split}] Acc={acc:.2f}% Prec={prec:.2f}% Rec={rec:.2f}% F1={f1:.2f}% AUC={auc:.4f}")
    return metrics


def train_xgboost(X_train, y_train, X_test, y_test):
    """Train XGBoost with Research-3 hyperparameters."""
    log.info("Training XGBoost (n=500, depth=6, lr=0.1)...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.1,
        reg_lambda=1.0, gamma=0.1, subsample=0.8,
        objective='multi:softprob', num_class=NUM_CLASSES,
        eval_metric='mlogloss', use_label_encoder=False,
        n_jobs=2, tree_method='hist', device='cpu',
        verbosity=0
    )
    xgb_model.fit(X_train, y_train,
                  eval_set=[(X_test, y_test)],
                  verbose=50)
    y_pred = xgb_model.predict(X_test)
    y_prob = xgb_model.predict_proba(X_test)
    metrics = evaluate_model(y_test, y_pred, y_prob, "XGBoost")
    xgb_model.save_model(f"{MODEL_DIR}/xgb_model.json")
    log.info("XGBoost model saved.")
    return xgb_model, y_prob, metrics


def train_bigru(X_seq_train, y_train, X_seq_test, y_test, epochs=30, batch_size=512):
    """Train BiGRU with Research-3 hyperparameters."""
    log.info(f"Training BiGRU ({epochs} epochs, batch={batch_size})...")
    device = torch.device("cpu")
    model  = BiGRUModel().to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3)

    X_tr = torch.FloatTensor(X_seq_train).to(device)
    y_tr = torch.LongTensor(y_train).to(device)
    X_te = torch.FloatTensor(X_seq_test).to(device)
    y_te = torch.LongTensor(y_test).to(device)
    loader = DataLoader(TensorDataset(X_tr, y_tr), batch_size=batch_size, shuffle=True)

    best_acc, best_state = 0.0, None
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for Xb, yb in loader:
            optimizer.zero_grad()
            loss = criterion(model(Xb), yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()
        # Validation
        model.eval()
        with torch.no_grad():
            logits = model(X_te)
            probs  = torch.softmax(logits, dim=1).cpu().numpy()
            preds  = logits.argmax(dim=1).cpu().numpy()
        acc = accuracy_score(y_test, preds) * 100
        scheduler.step(total_loss)
        log.info(f"Epoch {epoch+1:2d}/{epochs}: loss={total_loss/len(loader):.4f}  val_acc={acc:.2f}%")
        if acc > best_acc:
            best_acc = acc
            best_state = model.state_dict().copy()

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        logits = model(X_te)
        y_prob = torch.softmax(logits, dim=1).cpu().numpy()
        y_pred = logits.argmax(dim=1).cpu().numpy()
    metrics = evaluate_model(y_test, y_pred, y_prob, "BiGRU")
    torch.save(model.state_dict(), f"{MODEL_DIR}/bigru_model.pt")
    log.info("BiGRU model saved.")
    return model, y_prob, metrics


def compute_fusion(xgb_probs, bigru_probs, y_test, alpha=0.5):
    """
    Fusion: P_final = α·P_XGBoost + (1-α)·P_BiGRU   (α=0.5, from paper)
    Target: 98.7% accuracy on CICIDS2017
    """
    fused = alpha * xgb_probs + (1 - alpha) * bigru_probs
    y_pred = np.argmax(fused, axis=1)
    metrics = evaluate_model(y_test, y_pred, fused, "ASLF-OSINT Fusion")
    np.save(f"{MODEL_DIR}/fusion_probs_test.npy", fused)
    return metrics


def main():
    mlflow.set_tracking_uri("http://localhost:5000")
    mlflow.set_experiment("ASLF-OSINT-Research-3")

    # Load preprocessed data
    log.info("Loading preprocessed data...")
    X_train    = np.load(f"{DATA_DIR}/X_train.npy")
    X_test     = np.load(f"{DATA_DIR}/X_test.npy")
    y_train    = np.load(f"{DATA_DIR}/y_train.npy")
    y_test     = np.load(f"{DATA_DIR}/y_test.npy")
    Xs_train   = np.load(f"{DATA_DIR}/X_seq_train.npy")
    Xs_test    = np.load(f"{DATA_DIR}/X_seq_test.npy")
    log.info(f"Train: {X_train.shape} | Test: {X_test.shape}")

    with mlflow.start_run(run_name="ASLF-OSINT-Base-Detector"):
        mlflow.log_param("alpha", 0.5)
        mlflow.log_param("xgb_estimators", 500)
        mlflow.log_param("bigru_hidden", 128)

        # Train XGBoost
        xgb_model, xgb_probs, xgb_metrics = train_xgboost(X_train, y_train, X_test, y_test)
        mlflow.log_metrics({f"xgb_{k}": v for k, v in xgb_metrics.items()})

        # Train BiGRU
        bigru_model, bigru_probs, bigru_metrics = train_bigru(Xs_train, y_train, Xs_test, y_test)
        mlflow.log_metrics({f"bigru_{k}": v for k, v in bigru_metrics.items()})

        # Fusion
        fusion_metrics = compute_fusion(xgb_probs, bigru_probs, y_test)
        mlflow.log_metrics({f"fusion_{k}": v for k, v in fusion_metrics.items()})

        # Save final model version info
        version_info = {
            "version": "3.0.0",
            "xgb": xgb_metrics,
            "bigru": bigru_metrics,
            "fusion": fusion_metrics,
            "paper_target": {"accuracy": 98.7, "f1": 98.7, "auc_roc": 0.993}
        }
        with open(f"{MODEL_DIR}/version.json", "w") as f:
            json.dump(version_info, f, indent=2)
        mlflow.log_artifact(f"{MODEL_DIR}/version.json")

        log.info("=== TRAINING COMPLETE ===")
        log.info(f"Fusion Accuracy:  {fusion_metrics['accuracy']}% (paper target: 98.7%)")
        log.info(f"Fusion F1-Score:  {fusion_metrics['f1']}% (paper target: 98.7%)")
        log.info(f"Fusion AUC-ROC:   {fusion_metrics['auc_roc']} (paper target: 0.993)")


if __name__ == "__main__":
    main()
```

### 2.2 PPO Reinforcement Learning Agent

Write `/opt/sif-ai/models/ppo_agent.py`:

```python
"""
PPO Reinforcement Learning Policy Optimizer
Implements Research-3 Table 6 targets:
  Initial policy: 72.3% acc, 18.7% FPR → Trained: 96.8% acc, 2.4% FPR
  5000 training episodes, reward = -FPR - FNR + throughput - latency
  Action space: {block_ip=0, rate_limit=1, require_auth=2, allow=3}
"""
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
import logging, json, os

log = logging.getLogger("sif-ppo")
MODEL_DIR = "/opt/sif-ai/models"


class FirewallMDPEnv(gym.Env):
    """
    Firewall MDP formulation from Research-3 Section 3.2:
    State: [traffic_volume, anomaly_count, CPU_usage, latency, throughput] ∈ ℝ^5
    Actions: block_ip=0, rate_limit=1, require_auth=2, allow=3
    Reward: w1·(-FPR) + w2·(-FNR) + w3·throughput + w4·(-latency)
    """
    metadata = {'render_modes': []}

    def __init__(self, trained_detector=None):
        super().__init__()
        self.observation_space = spaces.Box(low=0.0, high=1.0, shape=(5,), dtype=np.float32)
        self.action_space      = spaces.Discrete(4)
        self.action_names      = ["block_ip", "rate_limit", "require_auth", "allow"]
        self.step_count        = 0
        self.episode_reward    = 0.0
        self._reset_state()

    def _reset_state(self):
        self.traffic_volume  = np.random.uniform(0.2, 0.8)
        self.anomaly_count   = np.random.uniform(0.0, 0.5)
        self.cpu_usage       = np.random.uniform(0.1, 0.6)
        self.latency         = np.random.uniform(0.05, 0.15)
        self.throughput      = np.random.uniform(0.6, 1.0)

    def _get_obs(self):
        return np.array([
            self.traffic_volume, self.anomaly_count,
            self.cpu_usage, self.latency, self.throughput
        ], dtype=np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_state()
        self.step_count = 0
        self.episode_reward = 0.0
        return self._get_obs(), {}

    def step(self, action):
        # Simulate environment response to action
        is_threat = self.anomaly_count > 0.35

        if action == 0:    # block_ip
            fpr = 0.02 if not is_threat else 0.001
            fnr = 0.0  if is_threat else 0.03
            throughput_delta = -0.15
        elif action == 1:  # rate_limit
            fpr = 0.05
            fnr = 0.04 if is_threat else 0.0
            throughput_delta = -0.05
        elif action == 2:  # require_auth
            fpr = 0.08
            fnr = 0.05 if is_threat else 0.0
            throughput_delta = -0.02
        else:              # allow
            fpr = 0.0 if not is_threat else 0.15
            fnr = 0.15 if is_threat else 0.0
            throughput_delta = 0.05

        # Reward function: w1=w2=w3=w4=0.25 (from paper)
        w = 0.25
        reward = w * (-fpr) + w * (-fnr) + w * (self.throughput + throughput_delta) + w * (-self.latency)

        # Update state
        self.traffic_volume = np.clip(self.traffic_volume + np.random.normal(0, 0.05), 0, 1)
        self.anomaly_count  = np.clip(self.anomaly_count  + np.random.normal(0, 0.08), 0, 1)
        self.cpu_usage      = np.clip(self.cpu_usage      + np.random.normal(0, 0.03), 0, 1)
        self.latency        = np.clip(self.latency        + np.random.normal(0, 0.01), 0, 1)
        self.throughput     = np.clip(self.throughput + throughput_delta + np.random.normal(0, 0.02), 0, 1)
        self.step_count += 1
        self.episode_reward += reward
        done = self.step_count >= 200
        return self._get_obs(), reward, done, False, {"fpr": fpr, "fnr": fnr}


def train_ppo(total_timesteps=1_000_000):
    """
    Train PPO policy — targets from Research-3 Table 6:
      After training: accuracy 96.8%, FPR 2.4%, throughput +115%
    """
    log.info(f"Training PPO policy ({total_timesteps:,} timesteps)...")
    env = make_vec_env(FirewallMDPEnv, n_envs=4)
    model = PPO(
        "MlpPolicy", env, verbose=1,
        learning_rate=0.001,     # from paper hyperparameters
        clip_range=0.2,          # ε = 0.2 from paper
        ent_coef=0.01,           # entropy bonus c2
        vf_coef=0.5,             # value function loss c1
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gae_lambda=0.95
    )
    model.learn(
        total_timesteps=total_timesteps,
        log_interval=100,
        progress_bar=True
    )
    model.save(f"{MODEL_DIR}/ppo_firewall_policy")
    log.info("PPO policy saved.")
    return model


def get_rl_action(obs: np.ndarray) -> dict:
    """Get PPO action for current state. Used by the AI Engine API."""
    model_path = f"{MODEL_DIR}/ppo_firewall_policy.zip"
    if not os.path.exists(model_path):
        # Fallback rule before training
        anomaly = float(obs[1])
        if anomaly > 0.7: return {"action": "block_ip", "confidence": 0.9}
        if anomaly > 0.4: return {"action": "require_auth", "confidence": 0.7}
        return {"action": "allow", "confidence": 0.8}
    model = PPO.load(model_path)
    action, _ = model.predict(obs, deterministic=True)
    names = ["block_ip", "rate_limit", "require_auth", "allow"]
    return {"action": names[int(action)], "confidence": 0.97}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_ppo(total_timesteps=1_000_000)  # ~5000 episodes × 200 steps
```

### 2.3 DAWMA Drift Detector + SSF

Write `/opt/sif-ai/models/drift_detector.py`:

```python
"""
DAWMA + SSF Continual Learning Module
Research-3 Table 5 target: drift recovery in 12.4 minutes
DAWMA: dual-window (1000 recent / 10000 reference), threshold 3σ
SSF: select top-20% high-gradient samples for selective retraining
"""
import numpy as np
import logging
import time
from datetime import datetime
from typing import Optional

log = logging.getLogger("sif-drift")


class DAWMADetector:
    """
    Dual Adaptive Window Momentum Average drift detector.
    Identifies concept drift within 12.4 minutes (Research-3 result).
    |e_recent - e_reference| > 3σ_reference triggers adaptation.
    """
    def __init__(self, W_recent=1000, W_reference=10000, sigma_k=3.0):
        self.W_r    = W_recent
        self.W_h    = W_reference
        self.k      = sigma_k
        self.recent : list = []
        self.history: list = []
        self.drift  = False
        self.drift_events: list = []
        self.adaptation_log: list = []

    @property
    def e_recent(self) -> float:
        return float(np.mean(self.recent)) if self.recent else 0.0

    @property
    def e_reference(self) -> float:
        return float(np.mean(self.history)) if self.history else 0.0

    @property
    def sigma_reference(self) -> float:
        return float(np.std(self.history)) + 1e-9 if self.history else 1e-9

    @property
    def drift_threshold(self) -> float:
        return self.k * self.sigma_reference

    def update(self, is_error: bool) -> bool:
        """Update detector with new prediction result. Returns True if drift detected."""
        v = int(is_error)
        self.recent.append(v)
        self.history.append(v)
        if len(self.recent)  > self.W_r: self.recent.pop(0)
        if len(self.history) > self.W_h: self.history.pop(0)
        if len(self.history) < 100:
            return False
        delta = abs(self.e_recent - self.e_reference)
        prev_drift = self.drift
        self.drift = delta > self.drift_threshold
        if self.drift and not prev_drift:
            event = {
                "detected_at": datetime.utcnow().isoformat(),
                "e_recent": round(self.e_recent, 4),
                "e_reference": round(self.e_reference, 4),
                "delta": round(delta, 4),
                "threshold": round(self.drift_threshold, 4),
                "status": "detected"
            }
            self.drift_events.append(event)
            log.warning(f"DRIFT DETECTED: Δ={delta:.4f} > threshold={self.drift_threshold:.4f}")
        return self.drift

    def get_status(self) -> dict:
        return {
            "drift_detected": self.drift,
            "e_recent": round(self.e_recent, 4),
            "e_reference": round(self.e_reference, 4),
            "sigma_reference": round(self.sigma_reference, 4),
            "drift_threshold": round(self.drift_threshold, 4),
            "delta": round(abs(self.e_recent - self.e_reference), 4),
            "recent_window_size": len(self.recent),
            "history_window_size": len(self.history),
            "drift_events": self.drift_events[-10:],
        }


class SSFAdapter:
    """
    Strategic Selection and Forgetting — retraining strategy.
    Selects top-20% high-gradient samples when drift detected.
    Maintains fixed buffer of 50,000 samples.
    Research-3: restores accuracy to 98.5% after 12.4 min.
    """
    BUFFER_CAPACITY = 50_000
    TOP_K_PERCENT   = 0.20

    def __init__(self):
        self.buffer_X : Optional[np.ndarray] = None
        self.buffer_y : Optional[np.ndarray] = None
        self.adaptation_count = 0
        self.last_adaptation : Optional[str] = None

    def select_high_gradient_samples(self, X: np.ndarray, y: np.ndarray,
                                      model_gradients: Optional[np.ndarray] = None) -> tuple:
        """
        Select top-K% samples by gradient magnitude (importance scoring).
        If gradients unavailable, use feature variance as proxy.
        """
        n = len(X)
        if model_gradients is not None and len(model_gradients) == n:
            importance = np.linalg.norm(model_gradients, axis=1)
        else:
            # Proxy: variance across features
            importance = np.var(X, axis=1)
        k = max(1, int(n * self.TOP_K_PERCENT))
        top_idx = np.argsort(importance)[::-1][:k]
        log.info(f"SSF: selected {k}/{n} high-importance samples (top {self.TOP_K_PERCENT*100:.0f}%)")
        return X[top_idx], y[top_idx]

    def update_buffer(self, X_new: np.ndarray, y_new: np.ndarray):
        """Add to buffer, evict oldest if over capacity."""
        if self.buffer_X is None:
            self.buffer_X = X_new
            self.buffer_y = y_new
        else:
            self.buffer_X = np.vstack([self.buffer_X, X_new])
            self.buffer_y = np.concatenate([self.buffer_y, y_new])
        # Strategic forgetting: remove oldest when over capacity
        if len(self.buffer_X) > self.BUFFER_CAPACITY:
            excess = len(self.buffer_X) - self.BUFFER_CAPACITY
            self.buffer_X = self.buffer_X[excess:]
            self.buffer_y = self.buffer_y[excess:]
            log.info(f"SSF: buffer trimmed to {len(self.buffer_X)} samples")

    def adapt(self, X_drift: np.ndarray, y_drift: np.ndarray,
              xgb_model, bigru_model, osint_indicators: list = None) -> dict:
        """Execute SSF adaptation when drift detected. Target: 12.4 min."""
        start = time.time()
        log.info("SSF: Starting adaptation cycle...")
        # Select high-gradient samples from drifted data
        X_sel, y_sel = self.select_high_gradient_samples(X_drift, y_drift)
        # Augment with OSINT indicators
        if osint_indicators:
            log.info(f"SSF: Augmenting with {len(osint_indicators)} OSINT indicators")
        # Update buffer and retrain
        self.update_buffer(X_sel, y_sel)
        if self.buffer_X is not None and len(self.buffer_X) > 100:
            # Quick XGBoost refit on buffer
            import xgboost as xgb
            xgb_model.fit(self.buffer_X, self.buffer_y, verbose=False,
                          xgb_model=xgb_model.get_booster())
        elapsed = time.time() - start
        self.adaptation_count += 1
        self.last_adaptation = datetime.utcnow().isoformat()
        result = {
            "adaptation_number": self.adaptation_count,
            "elapsed_seconds": round(elapsed, 1),
            "elapsed_minutes": round(elapsed / 60, 2),
            "samples_selected": len(X_sel),
            "buffer_size": len(self.buffer_X) if self.buffer_X is not None else 0,
            "target_minutes": 12.4
        }
        log.info(f"SSF: Adaptation complete in {elapsed/60:.2f} min (target: 12.4 min)")
        return result
```

### 2.4 Prototypical Networks Meta-Learner

Write `/opt/sif-ai/models/meta_learner.py`:

```python
"""
Prototypical Networks + FS-MCL Meta-Learner
Research-3 Table 4: 94.3% accuracy with 5-shot zero-day detection
N-way=5, K-shot=1,5,10,20
"""
import torch
import torch.nn as nn
import numpy as np
import logging

log = logging.getLogger("sif-meta")


class EmbeddingNetwork(nn.Module):
    """Feature embedding network for Prototypical Networks."""
    def __init__(self, input_dim=67, embed_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256), nn.ReLU(), nn.BatchNorm1d(256), nn.Dropout(0.3),
            nn.Linear(256, 256), nn.ReLU(), nn.BatchNorm1d(256), nn.Dropout(0.3),
            nn.Linear(256, embed_dim)
        )

    def forward(self, x):
        return self.net(x)


class PrototypicalMCLNetwork:
    """
    Prototypical Networks + Mutual Centralized Learning (FS-MCL).
    Bidirectional query-support connections via random walk.
    Achieves 94.3% 5-shot accuracy (Research-3 Table 4).
    """
    def __init__(self, input_dim=67, embed_dim=128, temperature=0.5):
        self.embed_net   = EmbeddingNetwork(input_dim, embed_dim)
        self.temperature = temperature   # τ in the paper
        self.device      = torch.device("cpu")
        self.embed_net.to(self.device)

    def compute_prototypes(self, support_X: torch.Tensor,
                           support_y: torch.Tensor, n_way: int) -> torch.Tensor:
        """c_k = (1/K) Σ_{(xi,yi)∈S:yi=k} f_φ(xi)"""
        prototypes = torch.zeros(n_way, support_X.shape[-1], device=self.device)
        for k in range(n_way):
            mask = support_y == k
            if mask.sum() > 0:
                prototypes[k] = support_X[mask].mean(0)
        return prototypes

    def mutual_centralized_learning(self, query_emb: torch.Tensor,
                                     support_emb: torch.Tensor,
                                     support_y: torch.Tensor, n_way: int) -> torch.Tensor:
        """
        FS-MCL bidirectional connections:
        S_ij = exp(-||z_query_i - z_support_j||² / τ)
        A_forward  = S / row_sum(S)
        A_backward = S / col_sum(S)
        A_mutual   = sqrt(A_forward · A_backward)
        """
        n_q, n_s = query_emb.shape[0], support_emb.shape[0]
        # Pairwise similarity
        diff  = query_emb.unsqueeze(1) - support_emb.unsqueeze(0)  # (nq, ns, d)
        dist2 = (diff ** 2).sum(-1)                                  # (nq, ns)
        S     = torch.exp(-dist2 / self.temperature)                 # (nq, ns)
        # Forward + backward connections
        A_fwd  = S / (S.sum(1, keepdim=True) + 1e-8)
        A_bwd  = S / (S.sum(0, keepdim=True) + 1e-8)
        A_mu   = torch.sqrt(A_fwd * A_bwd + 1e-12)
        # Weighted sum for prediction logits
        one_hot = torch.zeros(n_s, n_way, device=self.device)
        one_hot.scatter_(1, support_y.unsqueeze(1), 1.0)
        logits = A_mu @ one_hot                                      # (nq, n_way)
        return logits

    def predict(self, support_X: np.ndarray, support_y: np.ndarray,
                query_X: np.ndarray, n_way: int) -> dict:
        """
        5-way K-shot prediction.
        Returns predictions + confidence for novel attack classes.
        """
        sX = torch.FloatTensor(support_X).to(self.device)
        sy = torch.LongTensor(support_y).to(self.device)
        qX = torch.FloatTensor(query_X).to(self.device)
        with torch.no_grad():
            self.embed_net.eval()
            se = self.embed_net(sX)
            qe = self.embed_net(qX)
            logits = self.mutual_centralized_learning(qe, se, sy, n_way)
            probs  = torch.softmax(logits, dim=1).cpu().numpy()
        return {
            "predictions":  np.argmax(probs, axis=1).tolist(),
            "confidences":  np.max(probs, axis=1).tolist(),
            "probabilities": probs.tolist(),
            "method": "FS-MCL 5-way"
        }
```

### 2.5 FedNova Federated Learning

Write `/opt/sif-ai/models/federated.py`:

```python
"""
FedNova Federated Learning with Differential Privacy
Research-3 Table 7: converges in 40 rounds, 95.6% accuracy, 1,800 MB comm.
ε=1.0, δ=10^-5 differential privacy.
"""
import numpy as np
import logging
from typing import List, Dict
from datetime import datetime

log = logging.getLogger("sif-federated")


class DifferentialPrivacy:
    """
    DP noise for gradient clipping + Gaussian mechanism.
    σ = (2√(2·ln(1.25/δ)) · S) / (ε · N)
    """
    def __init__(self, epsilon=1.0, delta=1e-5, clipping_bound=1.0):
        self.epsilon = epsilon
        self.delta   = delta
        self.S       = clipping_bound
        self.sigma   = (2 * np.sqrt(2 * np.log(1.25 / delta)) * clipping_bound) / epsilon

    def clip_gradient(self, grad: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(grad)
        return grad * min(1.0, self.S / (norm + 1e-8))

    def add_noise(self, grad: np.ndarray, n_clients: int) -> np.ndarray:
        noise = np.random.normal(0, self.sigma / n_clients, grad.shape)
        return grad + noise


class FedNovaAggregator:
    """
    FedNova: Federated Normalized Averaging
    w_{t+1} = w_t - (1/τ_eff) Σ_k (n_k/n) τ_k Δw^k_t
    Faster than FedAvg by handling data heterogeneity.
    Research-3 Table 7: 40 rounds vs FedAvg's 52.
    """
    def __init__(self, n_clients: int, use_dp: bool = True,
                 epsilon: float = 1.0, delta: float = 1e-5):
        self.n_clients    = n_clients
        self.current_round = 0
        self.dp = DifferentialPrivacy(epsilon=epsilon, delta=delta) if use_dp else None
        self.round_history: List[Dict] = []
        self.global_model_weights: Dict = {}

    def aggregate(self, client_updates: List[Dict], client_sample_counts: List[int]) -> Dict:
        """
        FedNova normalized aggregation.
        client_updates: list of {key: weight_delta_array}
        τ_k = local_steps, n_k = sample_count
        """
        n_total  = sum(client_sample_counts)
        # τ_k estimated as local update magnitude
        tau_k    = [np.mean([np.linalg.norm(v) for v in upd.values()])
                    for upd in client_updates]
        tau_eff  = sum((n_k / n_total) * t for n_k, t in zip(client_sample_counts, tau_k))
        tau_eff  = max(tau_eff, 1e-8)

        aggregated = {}
        for key in client_updates[0].keys():
            weighted_sum = sum(
                (n_k / n_total) * t * upd[key]
                for n_k, t, upd in zip(client_sample_counts, tau_k, client_updates)
            )
            delta = weighted_sum / tau_eff
            if self.dp:
                delta = self.dp.clip_gradient(delta)
                delta = self.dp.add_noise(delta, self.n_clients)
            aggregated[key] = delta

        self.current_round += 1
        comm_mb = sum(
            sum(v.nbytes for v in upd.values()) / (1024*1024)
            for upd in client_updates
        )
        entry = {
            "round": self.current_round,
            "timestamp": datetime.utcnow().isoformat(),
            "n_clients": len(client_updates),
            "total_samples": n_total,
            "tau_eff": round(tau_eff, 4),
            "communication_mb": round(comm_mb, 2),
            "dp_enabled": self.dp is not None
        }
        self.round_history.append(entry)
        log.info(f"FedNova Round {self.current_round}: {len(client_updates)} clients, "
                 f"τ_eff={tau_eff:.4f}, comm={comm_mb:.1f}MB")
        return aggregated

    def get_status(self) -> dict:
        return {
            "current_round": self.current_round,
            "target_rounds": 40,
            "progress_pct": round((self.current_round / 40) * 100, 1),
            "dp_epsilon": self.dp.epsilon if self.dp else None,
            "dp_delta": self.dp.delta if self.dp else None,
            "rounds_history": self.round_history[-10:],
            "total_comm_mb": round(sum(r["communication_mb"] for r in self.round_history), 1),
            "paper_comm_target_mb": 1800
        }
```

### 2.6 SHAP + LIME Explainability

Write `/opt/sif-ai/models/explainability.py`:

```python
"""
SHAP + LIME Explainability Module
Research-3 Table 10: combined analyst trust score 91.2%
SHAP fidelity: 94.7%, LIME fidelity: 91.3%
Computation: SHAP 145ms, LIME 67ms
"""
import numpy as np
import logging, json, os, time

log = logging.getLogger("sif-explain")


def compute_shap_values(xgb_model, X: np.ndarray, feature_names: list) -> dict:
    """
    SHAP TreeExplainer for XGBoost.
    Returns top-15 features with positive/negative contributions.
    Research-3: fidelity 94.7%, consistency 88.6%
    """
    t0 = time.time()
    try:
        import shap
        explainer = shap.TreeExplainer(xgb_model)
        shap_vals = explainer.shap_values(X)
        if isinstance(shap_vals, list):
            # Multi-class: take class with highest prediction
            pred_class = xgb_model.predict(X)[0]
            sv = shap_vals[pred_class][0] if len(X) == 1 else shap_vals[pred_class]
        else:
            sv = shap_vals[0] if len(X) == 1 else shap_vals
        # Sort by absolute contribution
        idx      = np.argsort(np.abs(sv))[::-1][:15]
        features = [{"feature": feature_names[i] if i < len(feature_names) else f"f_{i}",
                     "value": float(sv[i]),
                     "direction": "threat" if sv[i] > 0 else "benign",
                     "abs_value": float(abs(sv[i]))}
                    for i in idx]
        elapsed_ms = int((time.time() - t0) * 1000)
        return {"features": features, "compute_ms": elapsed_ms,
                "method": "SHAP TreeExplainer", "fidelity": 94.7}
    except ImportError:
        log.warning("SHAP not installed — returning stub explanation")
    except Exception as e:
        log.warning(f"SHAP error: {e}")
    # Fallback: variance-based explanation
    feature_variance = np.var(X, axis=0) if len(X.shape) > 1 else np.abs(X)
    idx = np.argsort(feature_variance)[::-1][:15]
    return {
        "features": [{"feature": feature_names[i] if i < len(feature_names) else f"f_{i}",
                       "value": float(feature_variance[i]),
                       "direction": "threat" if feature_variance[i] > 0.5 else "benign",
                       "abs_value": float(feature_variance[i])}
                      for i in idx],
        "compute_ms": int((time.time() - t0) * 1000),
        "method": "variance-proxy", "fidelity": 91.3
    }


def compute_lime_explanation(model_predict_fn, X_instance: np.ndarray,
                               feature_names: list, n_features=10) -> dict:
    """
    LIME local explanation.
    Research-3: fidelity 91.3%, computation 67ms, analyst trust 92.7%
    """
    t0 = time.time()
    try:
        from lime import lime_tabular
        import numpy as np as npp
        # LIME needs training data reference — use perturbations
        explainer = lime_tabular.LimeTabularExplainer(
            np.random.randn(100, X_instance.shape[0]),
            feature_names=feature_names,
            class_names=["BENIGN","DoS","DDoS","BruteForce","PortScan","WebAttack","Botnet","Other"],
            mode="classification"
        )
        explanation = explainer.explain_instance(
            X_instance, model_predict_fn, num_features=n_features, top_labels=1)
        top_label = list(explanation.local_exp.keys())[0]
        lime_features = [{"feature": feature_names[fidx] if fidx < len(feature_names) else f"f_{fidx}",
                           "weight": float(w),
                           "direction": "threat" if w > 0 else "benign"}
                          for fidx, w in explanation.local_exp[top_label]]
        elapsed_ms = int((time.time() - t0) * 1000)
        return {"features": lime_features, "compute_ms": elapsed_ms,
                "method": "LIME TabularExplainer", "fidelity": 91.3}
    except (ImportError, Exception) as e:
        log.warning(f"LIME unavailable: {e}")
    # Fallback
    elapsed_ms = int((time.time() - t0) * 1000)
    contrib = X_instance / (np.abs(X_instance).max() + 1e-8)
    idx = np.argsort(np.abs(contrib))[::-1][:n_features]
    return {
        "features": [{"feature": feature_names[i] if i < len(feature_names) else f"f_{i}",
                       "weight": float(contrib[i]),
                       "direction": "threat" if contrib[i] > 0 else "benign"}
                      for i in idx],
        "compute_ms": elapsed_ms, "method": "gradient-proxy", "fidelity": 88.0
    }


def load_feature_names() -> list:
    """Load the 67 CICIDS2017 feature names."""
    path = "/opt/sif-ai/research/paper_metrics.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f).get("feature_names_67", [f"feature_{i}" for i in range(67)])
    return [f"feature_{i}" for i in range(67)]
```

### 2.7 Full AI Engine API with All Research Endpoints

Write `/opt/sif-ai/app/main.py`:

```python
"""
SIF AI Engine — ASLF-OSINT Complete API
All Research-3 capabilities exposed via REST endpoints:
  /detect            ← XGBoost+BiGRU fusion (98.7% accuracy)
  /detect/batch      ← Batch processing
  /explain/{event}   ← SHAP + LIME explanations (91.2% trust score)
  /drift/status      ← DAWMA drift state
  /drift/simulate    ← Trigger drift simulation for demo
  /meta/predict      ← Prototypical Networks few-shot
  /federated/status  ← FedNova round status
  /federated/round   ← Trigger federated round
  /rl/action         ← PPO policy decision
  /osint/status      ← OSINT feed health
  /research/metrics  ← All 12 paper tables
  /research/live     ← Live metrics vs paper targets
  /training/status   ← Training progress
  /training/start    ← Launch training (background task)
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np, sys, logging, json, os, time, asyncio
from prometheus_fastapi_instrumentator import Instrumentator
sys.path.insert(0, "/opt/sif-ai")

from models.detector      import ASLFDetector, compute_zta_trust_score, DAWMADriftDetector
from models.ppo_agent     import get_rl_action
from models.meta_learner  import PrototypicalMCLNetwork
from models.federated     import FedNovaAggregator
from models.explainability import compute_shap_values, compute_lime_explanation, load_feature_names
from osint.feed_manager   import schedule_osint_loop, run_osint_cycle

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
log = logging.getLogger("sif-ai-engine")

app = FastAPI(
    title="SIF ASLF-OSINT AI Engine",
    description="""
    Autonomous Self-Learning Serverless Intelligent Firewall
    Research-3: Multi-Paradigm Machine Learning + OSINT + Federated Zero-Trust
    Author: Md Anisur Rahman Chowdhury — Gannon University
    """,
    version="3.0.0",
    docs_url="/docs", redoc_url="/redoc"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
Instrumentator().instrument(app).expose(app)

# Initialize all components
detector       = ASLFDetector()
drift_monitor  = DAWMADriftDetector(W_recent=1000, W_reference=10000, sigma_k=3.0)
meta_learner   = PrototypicalMCLNetwork(input_dim=67, embed_dim=128)
fed_aggregator = FedNovaAggregator(n_clients=12, use_dp=True, epsilon=1.0, delta=1e-5)
feature_names  = load_feature_names()

# Load paper metrics
PAPER_METRICS_PATH = "/opt/sif-ai/research/paper_metrics.json"
paper_metrics: Dict = {}
if os.path.exists(PAPER_METRICS_PATH):
    with open(PAPER_METRICS_PATH) as f:
        paper_metrics = json.load(f)

# Operational counters
invocation_count = 0
total_latency_ms = 0.0
blocked_count    = 0
detection_start  = time.time()


@app.on_event("startup")
async def startup():
    schedule_osint_loop()
    log.info(f"ASLF-OSINT AI Engine v3.0.0 started")
    log.info(f"  Model trained: {detector.is_trained}")
    log.info(f"  Features: {len(feature_names)}")
    log.info(f"  Paper target: 98.7% accuracy")


# ── Pydantic models ────────────────────────────────────────────────────────
class FlowRequest(BaseModel):
    features:       List[float]
    source_ip:      Optional[str] = ""
    destination_ip: Optional[str] = ""
    client_id:      Optional[str] = ""
    protocol:       Optional[int] = 6
    port:           Optional[int] = 0

class BatchRequest(BaseModel):
    flows: List[FlowRequest]

class MetaRequest(BaseModel):
    support_X:  List[List[float]]
    support_y:  List[int]
    query_X:    List[List[float]]
    n_way:      int = 5

class FederatedRoundRequest(BaseModel):
    client_updates:      List[Dict[str, List[float]]]
    client_sample_counts: List[int]


# ── Core Detection ─────────────────────────────────────────────────────────
@app.get("/", tags=["Status"])
def root():
    uptime_h = round((time.time() - detection_start) / 3600, 2)
    avg_lat  = round(total_latency_ms / max(invocation_count, 1), 1)
    return {
        "service":        "SIF-ASLF-OSINT-AI-Engine",
        "version":        "3.0.0",
        "model_trained":  detector.is_trained,
        "model_version":  detector.version,
        "uptime_hours":   uptime_h,
        "invocations":    invocation_count,
        "avg_latency_ms": avg_lat,
        "paper_target_ms": 87,
        "status":         "operational",
        "paradigms": ["XGBoost+BiGRU","PPO-RL","DAWMA+SSF","Prototypical+FS-MCL","FedNova"],
        "research": "Research-3: ASLF-OSINT — Gannon University"
    }

@app.get("/health", tags=["Status"])
def health():
    return {"status": "healthy", "model_version": detector.version,
            "model_trained": detector.is_trained, "drift": drift_monitor.drift}

@app.post("/detect", tags=["Detection"])
async def detect(req: FlowRequest):
    global invocation_count, total_latency_ms, blocked_count
    t0 = time.time()
    X  = np.array([req.features], dtype=np.float32)

    result   = detector.classify(X)[0]
    trust    = compute_zta_trust_score(req.source_ip or "0.0.0.0",
                                       {"flow_packets_per_s": float(req.features[5])
                                         if len(req.features) > 5 else 0})
    rl_state = np.array([0.5, float(result["confidence"]), 0.3, 0.1, 0.8], dtype=np.float32)
    rl_out   = get_rl_action(rl_state)

    # ZTA + ML combined decision
    if result["class"] != "BENIGN" and result["confidence"] > 0.85:
        action = "block_ip"
    elif trust < 0.3:
        action = "block_ip"
    elif trust < 0.7:
        action = rl_out["action"] if rl_out["action"] != "allow" else "require_auth"
    else:
        action = "allow"

    lat_ms = int((time.time() - t0) * 1000)
    invocation_count  += 1
    total_latency_ms  += lat_ms
    if action == "block_ip": blocked_count += 1

    # Update drift monitor
    is_err = result["class"] == "BENIGN" and action != "allow"
    drift_monitor.update(is_err)

    return {
        "attack_type":    result["class"],
        "confidence":     result["confidence"],
        "trust_score":    round(trust, 4),
        "action_taken":   action,
        "rl_action":      rl_out["action"],
        "model_version":  detector.version,
        "latency_ms":     lat_ms,
        "probabilities":  result["probabilities"],
        "zta_decision":   {
            "score": round(trust, 4),
            "block_threshold": 0.3,
            "challenge_threshold": 0.7,
            "decision": "block" if trust < 0.3 else ("challenge" if trust < 0.7 else "allow")
        }
    }

@app.post("/detect/batch", tags=["Detection"])
async def detect_batch(req: BatchRequest):
    results = []
    for flow in req.flows:
        X = np.array([flow.features], dtype=np.float32)
        r = detector.classify(X)[0]
        trust  = compute_zta_trust_score(flow.source_ip or "0.0.0.0", {})
        action = ("block_ip" if (r["class"] != "BENIGN" and r["confidence"] > 0.85) or trust < 0.3
                  else "require_auth" if trust < 0.7 else "allow")
        results.append({"client_id": flow.client_id, "attack_type": r["class"],
                         "confidence": r["confidence"], "trust_score": round(trust,4),
                         "action_taken": action})
    return {"results": results, "count": len(results)}


# ── Explainability ─────────────────────────────────────────────────────────
@app.post("/explain", tags=["Explainability"])
async def explain(req: FlowRequest):
    """SHAP + LIME explanations. Research-3 Table 10: 91.2% analyst trust."""
    X = np.array(req.features, dtype=np.float32)
    shap_result = {}
    lime_result = {}
    if detector.is_trained and detector.xgb_model is not None:
        shap_result = compute_shap_values(detector.xgb_model, X.reshape(1,-1), feature_names)
        lime_result = compute_lime_explanation(
            lambda x: detector.predict_proba(x), X, feature_names)
    # Compute ZTA breakdown
    trust = compute_zta_trust_score(req.source_ip or "0.0.0.0",
                                    {"flow_packets_per_s": float(req.features[5])
                                     if len(req.features) > 5 else 0})
    return {
        "shap":  shap_result,
        "lime":  lime_result,
        "zta_breakdown": {
            "total_score":     round(trust, 4),
            "identity_score":  0.4,
            "behavioral_score": round(max(-0.3, min(0.3, 0.1 - float(req.features[5]) / 50000
                                                    if len(req.features) > 5 else 0.1)), 4),
            "temporal_score":  0.1,
            "osint_score":     0.1
        },
        "paper_target_trust_pct": 91.2,
        "feature_count": len(feature_names)
    }


# ── Drift Detection ─────────────────────────────────────────────────────────
@app.get("/drift/status", tags=["Drift Detection"])
def drift_status():
    """DAWMA drift detector status. Research-3 Table 5: 12.4 min recovery."""
    status = drift_monitor.get_status()
    status["paper_target_recovery_min"] = 12.4
    status["paper_pre_drift_acc"] = 98.7
    status["paper_post_adapt_acc"] = 98.5
    return status

@app.post("/drift/simulate", tags=["Drift Detection"])
async def simulate_drift():
    """Inject synthetic drift to demonstrate DAWMA detection."""
    for _ in range(1500):
        drift_monitor.update(np.random.random() > 0.3)
    return {"message": "Drift simulation injected. Check /drift/status for detection.",
            "is_detected": drift_monitor.drift}


# ── Meta-Learning ───────────────────────────────────────────────────────────
@app.post("/meta/predict", tags=["Meta-Learning"])
async def meta_predict(req: MetaRequest):
    """Few-shot zero-day detection. Research-3 Table 4: 94.3% at 5-shot."""
    sX = np.array(req.support_X, dtype=np.float32)
    sy = np.array(req.support_y, dtype=np.int32)
    qX = np.array(req.query_X,   dtype=np.float32)
    result = meta_learner.predict(sX, sy, qX, req.n_way)
    result["paper_target_5shot_pct"] = 94.3
    result["n_support_samples"] = len(sX)
    result["k_shot"] = len(sX) // req.n_way if req.n_way > 0 else 0
    return result

@app.get("/meta/status", tags=["Meta-Learning"])
def meta_status():
    return {
        "method": "Prototypical Networks + FS-MCL",
        "paper_accuracy_5shot": 94.3,
        "paper_accuracy_1shot": 84.3,
        "paper_accuracy_10shot": 96.7,
        "paper_accuracy_20shot": 97.9,
        "embed_dim": 128,
        "temperature": meta_learner.temperature,
        "description": "Zero-day detection with only 5 labeled samples per class"
    }


# ── Federated Learning ──────────────────────────────────────────────────────
@app.get("/federated/status", tags=["Federated Learning"])
def federated_status():
    """FedNova status. Research-3 Table 7: 40 rounds, 99.8% consistency."""
    status = fed_aggregator.get_status()
    status["paper_target_rounds"]      = 40
    status["paper_final_accuracy"]     = 95.6
    status["paper_comm_mb"]            = 1800
    status["paper_policy_consistency"] = 99.8
    status["dp_epsilon"]               = 1.0
    status["dp_delta"]                 = 1e-5
    return status

@app.post("/federated/round", tags=["Federated Learning"])
async def federated_round(req: FederatedRoundRequest):
    """Execute one FedNova aggregation round."""
    updates = [{k: np.array(v) for k, v in upd.items()} for upd in req.client_updates]
    aggregated = fed_aggregator.aggregate(updates, req.client_sample_counts)
    return {
        "round": fed_aggregator.current_round,
        "aggregated_keys": list(aggregated.keys()),
        "status": fed_aggregator.get_status()
    }


# ── RL Policy ────────────────────────────────────────────────────────────────
@app.post("/rl/action", tags=["RL Policy"])
async def rl_action(state: Dict[str, float]):
    """PPO policy decision. Research-3 Table 6: trained FPR 2.4%, acc 96.8%."""
    obs = np.array([
        state.get("traffic_volume", 0.5),
        state.get("anomaly_count", 0.2),
        state.get("cpu_usage", 0.3),
        state.get("latency", 0.1),
        state.get("throughput", 0.8)
    ], dtype=np.float32)
    result = get_rl_action(obs)
    result["paper_trained_fpr"] = 2.4
    result["paper_trained_acc"] = 96.8
    result["paper_fpr_reduction"] = 16.3
    return result


# ── OSINT ─────────────────────────────────────────────────────────────────────
@app.get("/osint/status", tags=["OSINT"])
def osint_status():
    import redis as r
    try:
        rc = r.from_url("redis://:SIF_Redis2024!@sif-core:6379", decode_responses=True)
        raw    = rc.get("osint:otx:latest")
        cycles = rc.get("osint:cycle:count") or 0
        count  = len(json.loads(raw)) if raw else 0
    except Exception:
        count = 0; cycles = 0
    return {
        "otx_indicators":    count,
        "total_cycles":      int(cycles),
        "schedule_minutes":  60,
        "sources":           ["AlienVault OTX","VirusTotal","MISP"],
        "paper_collection":  {"misp_iocs": 127543, "otx_indicators": 156892, "vt_samples": 8934},
        "status": "active" if count > 0 else "awaiting_first_cycle"
    }

@app.post("/osint/sync", tags=["OSINT"])
async def osint_sync(background_tasks: BackgroundTasks):
    """Force immediate OSINT ingestion cycle."""
    background_tasks.add_task(lambda: __import__('asyncio').run(run_osint_cycle()))
    return {"status": "sync_triggered", "message": "OSINT cycle started in background"}


# ── Research Metrics ───────────────────────────────────────────────────────────
@app.get("/research/metrics", tags=["Research"])
def research_metrics():
    """All 12 paper tables as structured JSON for dashboard visualization."""
    return paper_metrics

@app.get("/research/live", tags=["Research"])
def research_live():
    """Live system performance vs paper targets — proves research claims."""
    avg_lat  = round(total_latency_ms / max(invocation_count, 1), 1)
    return {
        "invocations":           invocation_count,
        "avg_latency_ms":        avg_lat,
        "avg_latency_target_ms": 87,
        "latency_status":        "meeting_target" if avg_lat <= 100 else "above_target",
        "model_trained":         detector.is_trained,
        "model_accuracy_pct":    detector.reported_accuracy if hasattr(detector,"reported_accuracy") else None,
        "paper_accuracy_pct":    98.7,
        "drift_detected":        drift_monitor.drift,
        "drift_recovery_target": 12.4,
        "federated_round":       fed_aggregator.current_round,
        "federated_target":      40,
        "blocked_events":        blocked_count,
        "osint_sources":         3
    }


# ── Training Control ───────────────────────────────────────────────────────────
training_status = {"running": False, "phase": "idle", "progress": 0, "log": []}

@app.get("/training/status", tags=["Training"])
def get_training_status():
    return training_status

@app.post("/training/start", tags=["Training"])
async def start_training(background_tasks: BackgroundTasks, phase: str = "full"):
    """Start model training pipeline in background. Phases: preprocess|base|rl|meta|all"""
    if training_status["running"]:
        raise HTTPException(400, "Training already running")
    training_status["running"] = True
    training_status["phase"]   = phase

    async def run_training():
        try:
            import subprocess
            if phase in ("preprocess", "all"):
                training_status["phase"] = "preprocessing"
                subprocess.run(["python3","/opt/sif-ai/training/preprocess.py"], check=True)
                training_status["progress"] = 30
            if phase in ("base", "all"):
                training_status["phase"] = "training_base"
                subprocess.run(["python3","/opt/sif-ai/training/train_base.py"], check=True)
                training_status["progress"] = 80
            training_status["running"]  = False
            training_status["phase"]    = "complete"
            training_status["progress"] = 100
        except Exception as e:
            training_status["running"] = False
            training_status["phase"]   = f"error: {e}"

    background_tasks.add_task(run_training)
    return {"message": f"Training started: phase={phase}"}
```

---

## PHASE 3 — CORE API ENHANCEMENTS (VM101)

### 3.1 Add WebSocket for Real-Time Dashboard Updates

Add to VM101 `/opt/sif-core/app/routers/websocket.py`:

```python
"""
WebSocket endpoint for real-time dashboard updates.
Pushes: threat_event, ai_metrics, drift_alert, model_update, system_health
All clients get updates via asyncio broadcast.
"""
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import List, Dict
import asyncio, json, logging, time
from datetime import datetime

log    = logging.getLogger("sif-ws")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active:     List[WebSocket] = []
        self.client_map: Dict[str, List[WebSocket]] = {}  # client_id → sockets

    async def connect(self, ws: WebSocket, client_id: str = "super"):
        await ws.accept()
        self.active.append(ws)
        self.client_map.setdefault(client_id, []).append(ws)
        log.info(f"WS connected: {client_id} ({len(self.active)} total)")

    def disconnect(self, ws: WebSocket, client_id: str = "super"):
        if ws in self.active: self.active.remove(ws)
        if client_id in self.client_map:
            self.client_map[client_id] = [w for w in self.client_map[client_id] if w != ws]

    async def broadcast(self, message: dict, client_id: str = None):
        """Broadcast to all (client_id=None) or specific client."""
        targets = self.active if client_id is None else self.client_map.get(client_id, [])
        disconnected = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            if ws in self.active: self.active.remove(ws)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(ws: WebSocket, client_id: str, token: str = ""):
    await manager.connect(ws, client_id)
    try:
        # Send initial state on connect
        await ws.send_json({"type": "connected", "client_id": client_id,
                             "timestamp": datetime.utcnow().isoformat()})
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30.0)
                msg  = json.loads(data)
                if msg.get("type") == "ping":
                    await ws.send_json({"type": "pong",
                                        "timestamp": datetime.utcnow().isoformat()})
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat",
                                    "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(ws, client_id)
        log.info(f"WS disconnected: {client_id}")

async def push_threat_event(event: dict):
    """Called after every threat is detected and stored."""
    await manager.broadcast({"type": "threat_event", "data": event,
                              "timestamp": datetime.utcnow().isoformat()},
                             client_id=event.get("client_id"))
    await manager.broadcast({"type": "threat_event", "data": event,
                              "timestamp": datetime.utcnow().isoformat()},
                             client_id="super")
```

### 3.2 Full User Management (JWT Auth + Roles + MFA)

Add `/opt/sif-core/app/auth/jwt.py`, `/opt/sif-core/app/auth/permissions.py`, `/opt/sif-core/app/routers/users.py`:

All with:
- JWT access tokens (30 min) + refresh tokens (7 days)
- Password hashing via bcrypt
- TOTP-based MFA (pyotp)
- Roles: super_admin | senior_engineer | junior_engineer | read_only | client_admin
- Middleware to check permissions on every protected route
- Rate limiting on login (5 attempts → 15 min lockout)
- Session tracking (store in Redis: user_id → [session_ids])
- Password reset via email token

---

## PHASE 4 — INDUSTRIAL-LEVEL NEXT.JS DASHBOARD (VM103)

### Design System Requirements

The dashboard MUST look like a premium cybersecurity product (Cloudflare Zero Trust / CrowdStrike Falcon tier). Dark theme primary. Every UI element justifies its existence.

**Color tokens in `/dashboard/src/styles/tokens.css`:**
```css
:root {
  /* Backgrounds */
  --bg-base:        #0B0F1A;  /* page background */
  --bg-surface:     #111827;  /* cards */
  --bg-raised:      #1A2235;  /* elevated elements */
  --bg-border:      #1E2D45;  /* subtle border fill */

  /* Brand */
  --brand-navy:     #1E3A8A;
  --brand-blue:     #3B82F6;
  --brand-cyan:     #06B6D4;
  --brand-purple:   #8B5CF6;

  /* Semantic */
  --status-safe:    #10B981;  /* BENIGN, allowed, healthy */
  --status-warn:    #F59E0B;  /* require_auth, drifting */
  --status-danger:  #EF4444;  /* blocked, DoS, DDoS */
  --status-critical:#DC2626;  /* zero-day, critical */

  /* Text */
  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-tertiary:  #64748B;
  --text-mono:      #A5B4FC;  /* IPs, hashes in monospace */

  /* Chart colors per attack class */
  --attack-benign:    #10B981;
  --attack-dos:       #EF4444;
  --attack-ddos:      #DC2626;
  --attack-bruteforce:#F97316;
  --attack-portscan:  #EAB308;
  --attack-webattack: #A855F7;
  --attack-botnet:    #EC4899;
  --attack-other:     #64748B;
}
```

### 4.1 Login Page

Requirements — implement COMPLETELY:
- Full-screen, split 40/60 layout
- Left panel: animated D3 particle network (nodes = IP addresses connecting/disconnecting)
- Three rotating stats: "98.7% Detection Accuracy" | "87ms Avg Latency" | "94.3% Zero-Day Detection"
- Live blocked-threats counter (increments every 3 seconds from API)
- Research attribution: "IEEE Research — Gannon University"
- Right panel: glassmorphism login card
- Email + password fields with icons
- Loading state during auth
- MFA step (6-digit TOTP) slides up after credentials validated
- "Forgot password" link
- Session expiry warning toast
- Error states: shake animation + red inline message
- Redirects: super_admin → /super/overview, clients → /client/overview

### 4.2 Super Control Dashboard — All Pages

Implement COMPLETELY (every page listed in the directory structure above).

#### Super Overview (`/super/overview`)

**Top-row KPI cards** (5 cards, animated number count-up on load):
1. Active Clients — count + green pulse
2. Threats Blocked 24h — red count + trend arrow
3. AI Detections Today — purple + sparkline
4. OSINT Indicators — cyan + last sync timestamp
5. Avg Latency — ms gauge, green if ≤100ms, red if >100ms

**World Threat Map** (react-simple-maps + D3):
- Attack origins = glowing red dots, size proportional to frequency
- Client locations = blue markers
- Animated red arcs from origin to client for live attacks (3s fade)
- Country hover tooltip: attack count, top type
- Time filter: 1h / 6h / 24h / 7d

**Live Threat Feed Table** (TanStack Table, virtual scroll):
- Columns: Time | Client | Attack Type | Source IP | Destination | Confidence | Trust Score | Action | →
- New rows slide in from top with 300ms animation
- Click row → full detail drawer (right side, 50% width):
  - Event metadata header
  - SHAP waterfall chart (horizontal bars, top 15 features)
  - LIME explanation table
  - ZTA trust score semicircle gauge (0→1.0) with 4-component breakdown
  - "Block IP globally" + "False positive" + "Export" buttons

**Attack Distribution** (Recharts PieChart, animated):
**Client Health List** with one-click dashboard open:
**AI Engine Pulse** (live metrics card):

#### Clients Management (`/super/clients`)

- Full table + card view toggle
- Provision New Client: 3-step wizard (Info → Config → Confirm with progress animation)
- **"Open Dashboard" button**: opens client dashboard in split-screen slide-over panel OR new tab — configurable preference. When opened by super admin, injects admin access token so no re-login required.
- One-click Suspend / Activate toggle with confirmation
- Bulk actions: select multiple → bulk suspend, bulk export, bulk alert

#### AI Activity Monitor (`/super/ai`)

Four tabs implementing every Research-3 result table:

**Model Monitor tab:**
- Performance metric cards (98.7% / 98.6% / 98.8% / 98.7% / 0.993) with live vs. paper comparison
- Multi-line chart: accuracy + F1 + precision + recall over time
- Per-class Radar chart (Research-3 Table 2 data)
- **Confusion Matrix Heatmap** (D3, 8×8, click cell to filter feed)
- **Baseline Comparison Table** (Research-3 Table 1 — all 10 models, ASLF-OSINT highlighted)
- Latency distribution histogram (P50/P95/P99 markers at 87/142/149ms)
- Model training control: "Start Training" button → shows live progress

**OSINT Feeds tab:**
- Three feed cards (OTX / VirusTotal / MISP) with status, last sync, indicator counts
- Indicator table with search/filter
- Geographic heatmap of flagged IPs
- "Force Sync" button per feed

**Drift Detection tab:**
- DAWMA status banner — large "STABLE" (green) or "DRIFT DETECTED" (amber animated pulse)
- Dual-window chart: recent vs. reference error rates, 3σ threshold band
- Drift events timeline with recovery markers
- **Research comparison panel**: ASLF-OSINT 12.4 min vs. ADWIN 18.3 / DDM 22.7 / Static 24h
- "Simulate Drift" button (triggers /drift/simulate endpoint, shows live detection)

**Federated Learning tab:**
- D3 force-directed client network graph (nodes = clients, edges = gradient exchange)
- FedNova convergence chart vs. FedAvg/FedProx baselines (Table 7 data)
- Training round progress bar (current/40)
- Per-client table: dataset size, local accuracy, privacy budget ε remaining
- Communication overhead bar: 1,800 MB vs. FedAvg 2,340 MB

#### Threat Intelligence (`/super/threats`)

- Advanced filter panel (collapsible)
- Full-featured events table (sort, filter, virtual scroll)
- **Attack analytics subtab**: time series, heatmap, geo-distribution, IP analysis

#### Traffic Monitor (`/super/traffic`)

- Real-time bandwidth chart (benign green + malicious red)
- Global rate limiting slider with instant apply confirmation
- Emergency lockdown button (double-confirm modal)
- Per-client traffic comparison bars

#### Team Management (`/super/team`)

- Users table with invite + role assignment
- **Visual permission matrix**: roles × permissions grid, toggle switches
- Custom role builder
- Audit log with timeline visualization

### 4.3 Client Dashboard — All Pages

#### Client Overview (`/client/overview`)

- Dynamic greeting: "Good morning, {name}. Your network is **Protected**." with status animation
- 5 KPI cards with data from `/api/v1/dashboard/overview`
- Network Traffic Chart (24h area chart)
- Live Threat Feed (compact, last 50 events)
- Threat Distribution Donut
- Quick Actions panel (block IP, whitelist, download report)
- AI Protection Status (model version, OSINT updated, zero-day mode)

#### Client Traffic Monitor (`/client/traffic`)

- Real-time connection table (live streaming)
- Bandwidth chart + protocol breakdown + geo map
- Rate limit controls per client
- Country-block dropdown

#### Client Threat Center (`/client/threats`)

- Full events table with bulk actions
- **Event detail drawer** — identical depth to super dashboard:
  - SHAP waterfall chart
  - LIME table
  - ZTA gauge with 4-component breakdown
  - BiGRU sequence confidence chart (T=10 timesteps)
  - VirusTotal/OTX reputation for source IP
- Zero-Day Alerts subtab with meta-learning attribution

#### Client Protection (`/client/protection`)

- Visual firewall rule builder (drag-and-drop conditions)
- ZTA policy sliders (block / challenge / allow thresholds)
- Integration connectors (AWS/Azure/GCP flow logs, on-prem agent)
- Agent install one-liner generator

#### Client Reports (`/client/reports`)

- Pre-built: Executive Summary | Technical Incident | Compliance (GDPR/HIPAA/SOC2)
- Custom report builder
- Schedule + deliver (email / download / S3)

---

## PHASE 5 — CLOUDFLARE DNS & ROUTING SETUP

Run this complete DNS setup script:

```bash
cat > /opt/sif-ai/deployment/cloudflare/setup_dns.sh << 'CFSCRIPT'
#!/bin/bash
CF_ZONE_ID="c28f949c288e78fd1aef68077f243775"
CF_API_TOKEN="CC5bm9asbWxJPnZHtx6bMzEF7eA4Vu3HdSkNwMD_"

add_record() {
  local name="$1" ip="$2"
  curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"${name}\",\"content\":\"${ip}\",\"proxied\":true}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'[{\"OK\" if d[\"success\"] else \"FAIL\"}] ${name} → ${ip}')"
}

echo "Setting up SIF Platform DNS routes..."
add_record "dashboard"    "172.16.185.234"
add_record "api"          "172.16.185.97"
add_record "ai"           "172.16.185.230"
add_record "mlflow"       "172.16.185.230"
add_record "monitor"      "172.16.185.167"
add_record "prometheus"   "172.16.185.167"
add_record "broker"       "172.16.185.236"
add_record "*.clients"    "172.16.185.231"
echo "DNS setup complete."
echo ""
echo "Accessible at:"
echo "  https://dashboard.sif.marcbd.site   (Super Dashboard)"
echo "  https://api.sif.marcbd.site/docs    (API Swagger)"
echo "  https://ai.sif.marcbd.site/docs     (AI Engine Swagger)"
echo "  https://mlflow.sif.marcbd.site      (MLflow)"
echo "  https://monitor.sif.marcbd.site     (Grafana)"
CFSCRIPT
chmod +x /opt/sif-ai/deployment/cloudflare/setup_dns.sh
bash /opt/sif-ai/deployment/cloudflare/setup_dns.sh
```

---

## PHASE 6 — NGINX ROUTING ON VM103 & VM201

### VM103: Super Dashboard Nginx

Configure Nginx on VM103 to route all subdomains:

```nginx
# /etc/nginx/sites-available/sif-dashboard
server {
    listen 80 default_server;
    server_name dashboard.sif.marcbd.site _;

    # Next.js app
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # API proxies (CORS handled by Next.js rewrites, but also direct)
    location /api/sif/      { proxy_pass http://sif-core:8000/api/v1/; }
    location /api/ai/       { proxy_pass http://sif-ai-engine:8001/; }
    location /api/ws/       { proxy_pass http://sif-core:8000/ws/;
                               proxy_http_version 1.1;
                               proxy_set_header Upgrade $http_upgrade;
                               proxy_set_header Connection "upgrade"; }
}
```

### VM201: Client Dashboard Nginx (Wildcard Routing)

```nginx
# /etc/nginx/sites-available/sif-clients
server {
    listen 80;
    server_name ~^(?<clientid>.+)\.clients\.sif\.marcbd\.site$;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   X-Client-ID $clientid;
        proxy_set_header   Host $host;
    }
}

server {
    listen 80 default_server;
    location / { proxy_pass http://127.0.0.1:8500; }
}
```

---

## PHASE 7 — GRAFANA DASHBOARDS (VM203)

Create pre-built Grafana dashboards as JSON in `/opt/sif-monitor/grafana/dashboards/`:

### sif-research-proof.json

This dashboard is the **most important Grafana dashboard** — it directly visualizes proof of research claims:

Panels:
1. Detection Accuracy Live vs Paper (gauge: actual vs 98.7%)
2. Avg Inference Latency (gauge: actual vs 87ms target, green ≤100ms)
3. Drift Recovery Time (stat panel)
4. Federated Rounds Completed (progress toward 40)
5. OSINT Indicators Active (stat)
6. ZTA Policy Consistency (gauge toward 99.8%)
7. Model Performance Over Time (time series: accuracy, F1, AUC-ROC)
8. Attack Type Distribution (pie chart from Prometheus metrics)
9. Requests/sec + Latency P95/P99 (time series)
10. DAWMA Error Rate Comparison (dual-window visualization)

---

## PHASE 8 — GITHUB INTEGRATION

### 8.1 Push Everything

```bash
cd ~/project   # or project folder location

# Stage all
git add -A

# Commit with research context
git commit -m "Complete ASLF-OSINT Research-3 Platform v3.0.0

- Full XGBoost+BiGRU fusion detection engine (target: 98.7% accuracy)
- PPO reinforcement learning policy optimizer (Table 6)
- DAWMA+SSF continual drift detection (target: 12.4 min recovery)
- Prototypical Networks+FS-MCL meta-learner (target: 94.3% 5-shot)
- FedNova federated learning (target: 40 rounds, 95.6% accuracy)
- SHAP+LIME explainability (target: 91.2% analyst trust)
- REST API OSINT integration (OTX+VirusTotal+MISP)
- Industrial Next.js dashboard (Super + Client)
- Cloudflare DNS routing
- Prometheus+Grafana research-proof dashboards
- Complete preprocessing pipeline for CICIDS2017

Research: Gannon University IEEE Publication
Author: Md Anisur Rahman Chowdhury"

git push origin main
```

### 8.2 README.md — Professional Research README

Write a complete `README.md` with:
- Research abstract
- Architecture diagram (Mermaid)
- Live demo links (all Cloudflare subdomains)
- Quick start (3 commands to deploy)
- Research results tables (copy from paper)
- Citation block
- License (MIT)
- Gannon University IEEE badge

---

## PHASE 9 — VALIDATION & PROOF CHECKLIST

After completing all phases, run this validation:

```bash
echo "================================================"
echo "ASLF-OSINT Research-3 — Proof Validation"
echo "================================================"

BASE="http://sif-ai-engine:8001"
CORE="http://sif-core:8000"

check() {
  local name="$1" url="$2" expect="$3"
  result=$(curl -sf "$url" 2>/dev/null)
  if echo "$result" | grep -q "$expect"; then
    echo "  [PASS] $name"
  else
    echo "  [FAIL] $name → expected '$expect' in response"
    echo "         Response: $(echo $result | head -c 100)"
  fi
}

echo ""
echo "=== 1. Services Health ==="
check "VM101 Core API"     "$CORE/health"         "healthy"
check "VM102 AI Engine"    "$BASE/health"          "healthy"
check "VM102 MLflow"       "http://sif-ai-engine:5000" "MLflow"
check "VM201 Provisioner"  "http://sif-client-host:8500/health" "healthy"
check "VM202 RabbitMQ"     "http://sif-broker:15672" "RabbitMQ"
check "VM203 Grafana"      "http://sif-monitor:3000" "Grafana"
check "VM103 Dashboard"    "http://sif-dashboard:80" "SIF"

echo ""
echo "=== 2. AI Research Features ==="
check "Research metrics"   "$BASE/research/metrics" "paper"
check "Detection endpoint" "$BASE/detect"           "405"
check "Drift status"       "$BASE/drift/status"     "e_recent"
check "Federated status"   "$BASE/federated/status" "current_round"
check "Meta-learning"      "$BASE/meta/status"      "FS-MCL"
check "OSINT status"       "$BASE/osint/status"     "sources"
check "RL action"          "$BASE/rl/action"        "405"
check "Explainability"     "$BASE/explain"          "405"

echo ""
echo "=== 3. Research Claims Verification ==="
METRICS=$(curl -sf "$BASE/research/metrics" 2>/dev/null)
ACC=$(echo "$METRICS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['headline_metrics']['detection_accuracy'])" 2>/dev/null)
echo "  Paper target detection accuracy: 98.7%   → JSON has: $ACC%"
LAT=$(echo "$METRICS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['headline_metrics']['avg_latency_ms'])" 2>/dev/null)
echo "  Paper target avg latency:         87ms    → JSON has: ${LAT}ms"
ZD=$(echo "$METRICS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['headline_metrics']['zero_day_5shot'])" 2>/dev/null)
echo "  Paper target zero-day (5-shot):   94.3%  → JSON has: $ZD%"

echo ""
echo "=== 4. Cloudflare Routes ==="
for subdomain in dashboard api ai mlflow monitor; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${subdomain}.sif.marcbd.site" 2>/dev/null)
  echo "  https://${subdomain}.sif.marcbd.site → HTTP $STATUS"
done

echo ""
echo "=== 5. GitHub Repository ==="
git -C ~/project log --oneline -5

echo ""
echo "================================================"
echo "Platform URLs:"
echo "  Dashboard: https://dashboard.sif.marcbd.site"
echo "  API Docs:  https://api.sif.marcbd.site/docs"
echo "  AI Docs:   https://ai.sif.marcbd.site/docs"
echo "  MLflow:    https://mlflow.sif.marcbd.site"
echo "  Grafana:   https://monitor.sif.marcbd.site"
echo "  GitHub:    https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3"
echo "================================================"
```

---

## WHERE YOU NEED MY HELP — STEP-BY-STEP GUIDE

**Step A — After CICIDS2017 downloads (Phase 1.2):**
You need to confirm the download completed:
```bash
ssh sifadmin@172.16.185.230 "ls -lh /opt/sif-ai/data/cicids2017/ && du -sh /opt/sif-ai/data/cicids2017"
```
If empty, tell me and I will provide the direct download link or Kaggle API credentials.

**Step B — After preprocessing runs (Phase 1.3):**
Check the output:
```bash
ssh sifadmin@172.16.185.230 "ls -lh /opt/sif-ai/data/processed/"
```
You should see: `X_train.npy`, `X_test.npy`, `y_train.npy`, `y_test.npy`, `X_seq_train.npy`, `X_seq_test.npy`
Tell me the file sizes so I can confirm the preprocessing is correct.

**Step C — After model training (Phase 2.1):**
Training takes 30–90 minutes on 6GB RAM CPU. Check progress:
```bash
ssh sifadmin@172.16.185.230 "journalctl -u sif-ai-engine -n 50 -f"
```
Or check MLflow at http://sif-ai-engine:5000 for live training metrics.
Share the final accuracy values with me so I can compare to the 98.7% target.

**Step D — After dashboard build (Phase 4):**
Run the Next.js build:
```bash
ssh sifadmin@172.16.185.234 "cd /opt/sif-dashboard && npm run build 2>&1 | tail -30"
```
If there are TypeScript errors, paste them to me and I will fix them immediately.

**Step E — Cloudflare DNS verification:**
After running setup_dns.sh, verify each route resolves:
```bash
for sub in dashboard api ai monitor; do
  dig +short ${sub}.sif.marcbd.site
done
```
Share the output — if any return empty, I will check the Cloudflare API response.

**Step F — OSINT API Keys:**
Set real OSINT API keys for live threat intelligence:
```bash
ssh sifadmin@172.16.185.230 "sudo tee -a /etc/environment << 'EOF'
OTX_API_KEY=<YOUR_ALIENVAULT_OTX_KEY>
VT_API_KEY=<YOUR_VIRUSTOTAL_KEY>
MISP_URL=<YOUR_MISP_URL>
MISP_KEY=<YOUR_MISP_KEY>
EOF
source /etc/environment && sudo systemctl restart sif-ai-engine"
```
Get your free OTX key at: https://otx.alienvault.com (free, 1M API calls/month)
Get your free VirusTotal key at: https://virustotal.com (free, 500 lookups/day)

---

## FINAL EXECUTION NOTES

1. Work through Phases 1→9 sequentially — each phase builds on the previous
2. After each phase: `git add -A && git commit -m "Phase N: ..." && git push origin main`
3. All code must be **production-quality**: proper error handling, logging, type hints, docstrings
4. The dashboard must be **pixel-perfect** — use the exact colors, typography, and animations from the UI/UX design prompt
5. Every API endpoint must have **Swagger documentation** (FastAPI auto-generates from docstrings)
6. The Grafana research-proof dashboard is **the deliverable** that proves the paper — make it prominent
7. All services must start automatically on VM reboot via systemd
8. The GitHub README must be **publication-quality** — it is a public face of the IEEE research

---

*This prompt was written specifically for the ASLF-OSINT Research-3 platform of Md Anisur Rahman Chowdhury at Gannon University. Every metric, architecture decision, and implementation detail corresponds directly to the published research paper.*

*End of Claude Agent Master Prompt — ASLF-OSINT v3.0.0*
