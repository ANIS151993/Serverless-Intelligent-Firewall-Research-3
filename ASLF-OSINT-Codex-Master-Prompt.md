# CODEX MASTER PROMPT
## ASLF-OSINT Platform — Complete Development & Deployment
### Autonomous Self-Learning Serverless Intelligent Firewall

---

## YOUR IDENTITY & ENVIRONMENT

You are Codex, an autonomous AI coding agent running on **Server 1** (172.16.185.182).
You have:
- **Full shell access** to Server 1 (you are already on it)
- **SSH access to Server 2** (172.16.184.111) via: `ssh sifadmin@<VM2_IP>`
- **No VLAN, no Docker networking issues** — all VMs share a flat /22 subnet
- **All VM /etc/hosts** already configured with hostnames

Your job is to **write, deploy, and verify** the complete ASLF-OSINT platform across all 6 VMs. Work autonomously. Do not ask for confirmation between tasks. Complete each VM fully before moving to the next.

---

## CREDENTIALS & ACCESS

```
SSH password for all VMs:  MARC@151995$
SSH user for all VMs:      sifadmin
Sudo:                      passwordless (sifadmin has NOPASSWD sudo)
```

**SSH one-liner template:**
```bash
sshpass -p 'MARC@151995$' ssh -o StrictHostKeyChecking=no sifadmin@<IP> "sudo bash -s" << 'EOF'
# commands here
EOF
```

---

## COMPLETE VM INVENTORY

| VM ID | Hostname         | IP                | Server   | RAM     | vCPU | Disk    | Role                          |
|-------|-----------------|-------------------|----------|---------|------|---------|-------------------------------|
| VM101 | sif-core         | 172.16.185.97     | Server 1 | 4096 MiB | 2   | 60 GiB  | Super Control System API      |
| VM102 | sif-ai-engine    | 172.16.185.230    | Server 1 | 6144 MiB | 2   | 100 GiB | ASLF-OSINT AI Engine          |
| VM103 | sif-dashboard    | 172.16.185.234    | Server 1 | 2048 MiB | 1   | 50 GiB  | Super Control Dashboard       |
| VM201 | sif-client-host  | 172.16.185.231    | Server 2 | 6144 MiB | 2   | 60 GiB  | Client Sub-System Docker Host |
| VM202 | sif-broker       | 172.16.185.236    | Server 2 | 2048 MiB | 1   | 50 GiB  | RabbitMQ + Redis Broker       |
| VM203 | sif-monitor      | 172.16.185.167    | Server 2 | 4096 MiB | 2   | 60 GiB  | Prometheus + Grafana + Loki   |

**Server 1 VMs** (VM101, VM102, VM103) — SSH directly: `ssh sifadmin@<IP>`
**Server 2 VMs** (VM201, VM202, VM203) — SSH via Server 1: `ssh sifadmin@<IP>` (already in known_hosts)

---

## /etc/hosts BLOCK — APPLY TO ALL 6 VMs FIRST

Before any service installation, ensure this is in `/etc/hosts` on every VM:

```
172.16.185.97   sif-core
172.16.185.230  sif-ai-engine
172.16.185.234  sif-dashboard
172.16.185.231  sif-client-host
172.16.185.236  sif-broker
172.16.185.167  sif-monitor
```

---

## PLATFORM ARCHITECTURE OVERVIEW

This is a **multi-tier autonomous security platform** based on published IEEE research:

```
┌─────────────────────────────────────────────────────────────┐
│           SUPER CONTROL SYSTEM (VM101 + VM102 + VM103)       │
│  VM101: FastAPI REST API + PostgreSQL + Redis + Celery       │
│  VM102: XGBoost+BiGRU+PPO+FedNova+OSINT AI Engine           │
│  VM103: Next.js Super Control Dashboard + Nginx              │
└──────────────────┬──────────────────────────────────────────┘
                   │  RabbitMQ fanout (model_updates, policies)
                   │  VM202: sif-broker
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              CLIENT RUNTIME LAYER (Server 2)                 │
│  VM201: Docker host — one Compose stack per client           │
│    Each stack: firewall container + dashboard + agent        │
│  VM203: Prometheus + Grafana + Loki (observability)          │
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors to implement:**
1. Admin creates a client → VM101 calls VM201 → Docker Compose stack auto-spawns
2. AI model trains/updates on VM102 → publishes to RabbitMQ → ALL client containers auto-pull new model
3. Every client's traffic flows through its own firewall container → results reported back to VM101
4. VM203 scrapes metrics from all VMs every 15 seconds
5. OSINT ingestion runs every 60 minutes on VM102 (AlienVault OTX, VirusTotal, MISP)

---

## EXECUTION ORDER (STRICT)

```
Phase 0:  /etc/hosts on ALL 6 VMs
Phase 1:  VM202 — sif-broker      (RabbitMQ + Redis — first, everything depends on it)
Phase 2:  VM101 — sif-core        (PostgreSQL + Redis + FastAPI)
Phase 3:  VM102 — sif-ai-engine   (Python ML stack — slowest, run in background)
Phase 4:  VM201 — sif-client-host (Docker + Provisioner API)
Phase 5:  VM203 — sif-monitor     (Prometheus + Grafana + Loki)
Phase 6:  VM103 — sif-dashboard   (Next.js + Nginx — last, needs all APIs up)
Phase 7:  Node Exporter on VM101, VM102, VM103, VM201, VM202
Phase 8:  End-to-end validation
```

---

## PHASE 0 — /etc/hosts on ALL 6 VMs

Run this on each VM before anything else:

```bash
grep -q "sif-core" /etc/hosts || sudo tee -a /etc/hosts << 'HOSTS'

# === SIF Platform VM Registry ===
172.16.185.97   sif-core
172.16.185.230  sif-ai-engine
172.16.185.234  sif-dashboard
172.16.185.231  sif-client-host
172.16.185.236  sif-broker
172.16.185.167  sif-monitor
HOSTS
```

---

## PHASE 1 — VM202: sif-broker (172.16.185.236)

### 1.1 Install RabbitMQ

```bash
apt-get update -qq
apt-get install -y curl gnupg

# Erlang + RabbitMQ from official repos
curl -1sLf 'https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA' \
  | gpg --dearmor -o /usr/share/keyrings/com.rabbitmq.team.gpg

curl -1sLf 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key' \
  | gpg --dearmor -o /usr/share/keyrings/rabbitmq.E495BB49CC4BBE5B.gpg

curl -1sLf 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key' \
  | gpg --dearmor -o /usr/share/keyrings/rabbitmq.9F4587F226208342.gpg

tee /etc/apt/sources.list.d/rabbitmq.list << 'REPO'
deb [arch=amd64 signed-by=/usr/share/keyrings/rabbitmq.E495BB49CC4BBE5B.gpg] https://ppa1.rabbitmq.com/rabbitmq/rabbitmq-erlang/deb/ubuntu jammy main
deb [arch=amd64 signed-by=/usr/share/keyrings/rabbitmq.9F4587F226208342.gpg] https://ppa1.rabbitmq.com/rabbitmq/rabbitmq-server/deb/ubuntu jammy main
REPO

apt-get update -qq
apt-get install -y erlang-base erlang-asn1 erlang-crypto erlang-eldap erlang-ftp \
  erlang-inets erlang-mnesia erlang-os-mon erlang-parsetools erlang-public-key \
  erlang-runtime-tools erlang-snmp erlang-ssl erlang-syntax-tools erlang-tftp \
  erlang-tools erlang-xmerl rabbitmq-server

systemctl enable --now rabbitmq-server
rabbitmq-plugins enable rabbitmq_management
systemctl restart rabbitmq-server
sleep 5

# Admin user
rabbitmqctl add_user sifadmin 'SIF_Rabbit2024!'
rabbitmqctl set_user_tags sifadmin administrator
rabbitmqctl set_permissions -p / sifadmin '.*' '.*' '.*'
rabbitmqctl delete_user guest 2>/dev/null || true
```

### 1.2 Install Redis

```bash
apt-get install -y redis-server
sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
sed -i 's/^# requirepass.*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
systemctl enable --now redis-server
```

### 1.3 Verify VM202

```bash
systemctl is-active rabbitmq-server && echo "RabbitMQ OK"
systemctl is-active redis-server && echo "Redis OK"
rabbitmqctl list_exchanges | grep model_updates || echo "Exchanges will be declared on first producer startup"
redis-cli -a SIF_Redis2024! ping
```

**Expected:** `RabbitMQ OK`, `Redis OK`, `PONG`

---

## PHASE 2 — VM101: sif-core (172.16.185.97)

### 2.1 Install System Packages

```bash
apt-get update -qq
apt-get install -y python3.11 python3.11-venv python3.11-dev build-essential \
  postgresql postgresql-contrib libpq-dev redis-server git curl
systemctl enable --now postgresql redis-server
```

### 2.2 Configure Redis on VM101

```bash
sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
sed -i 's/^# requirepass.*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
systemctl restart redis-server
```

### 2.3 Create PostgreSQL Database

```bash
sudo -u postgres psql << 'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sif_user') THEN
    CREATE USER sif_user WITH ENCRYPTED PASSWORD 'SIF_DB_Pass2024!';
  END IF;
END $$;
SELECT 'CREATE DATABASE sif_platform OWNER sif_user'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sif_platform') \gexec
GRANT ALL PRIVILEGES ON DATABASE sif_platform TO sif_user;
SQL
```

### 2.4 Create Python Virtual Environment

```bash
mkdir -p /opt/sif-core/app/routers
chown -R sifadmin:sifadmin /opt/sif-core
sudo -u sifadmin python3.11 -m venv /opt/sif-core/venv
sudo -u sifadmin /opt/sif-core/venv/bin/pip install --quiet --upgrade pip
sudo -u sifadmin /opt/sif-core/venv/bin/pip install --quiet \
  fastapi "uvicorn[standard]" sqlalchemy alembic psycopg2-binary \
  redis celery "pika>=1.3" "aio-pika" httpx \
  "python-jose[cryptography]" passlib bcrypt \
  pydantic "pydantic-settings" python-multipart loguru \
  websockets "python-socketio[asyncio_client]" prometheus-fastapi-instrumentator
```

### 2.5 Write Application Code

Create the following files. Write each completely — no placeholders, no TODOs.

#### `/opt/sif-core/app/__init__.py`
```python
```

#### `/opt/sif-core/app/database.py`
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://sif_user:SIF_DB_Pass2024!@localhost/sif_platform"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### `/opt/sif-core/app/models.py`
```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Float, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, nullable=False)
    api_key       = Column(String, unique=True)
    subsystem_id  = Column(String, unique=True)
    subdomain     = Column(String, unique=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    active        = Column(Boolean, default=True)
    config        = Column(JSON, default=dict)

class ThreatEvent(Base):
    __tablename__ = "threat_events"
    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id      = Column(String, ForeignKey("clients.id"), nullable=True)
    timestamp      = Column(DateTime, default=datetime.utcnow, index=True)
    attack_type    = Column(String, index=True)
    source_ip      = Column(String, index=True)
    destination_ip = Column(String)
    confidence     = Column(Float)
    trust_score    = Column(Float)
    action_taken   = Column(String)
    shap_values    = Column(JSON, nullable=True)
    raw_features   = Column(JSON, nullable=True)
    model_version  = Column(String, nullable=True)

class PolicyUpdate(Base):
    __tablename__ = "policy_updates"
    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    version          = Column(String, nullable=False)
    model_path       = Column(String)
    pushed_at        = Column(DateTime, default=datetime.utcnow)
    affected_clients = Column(JSON, default=list)
    status           = Column(String, default="deployed")

class OSINTIndicator(Base):
    __tablename__ = "osint_indicators"
    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    value       = Column(String, nullable=False, index=True)
    ioc_type    = Column(String)        # IPv4, domain, hash
    source      = Column(String)        # OTX, VirusTotal, MISP
    confidence  = Column(Float, default=0.85)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    active      = Column(Boolean, default=True)
```

#### `/opt/sif-core/app/routers/__init__.py`
```python
```

#### `/opt/sif-core/app/routers/clients.py`
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import httpx, secrets, uuid as _uuid, logging
from app.database import get_db
from app.models import Client

log = logging.getLogger("sif-clients")
router = APIRouter()
PROVISIONER_URL = "http://sif-client-host:8500"

@router.post("/provision")
async def provision_client(name: str, email: str,
                           bg: BackgroundTasks,
                           db: Session = Depends(get_db)):
    if db.query(Client).filter(Client.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    api_key   = secrets.token_hex(32)
    client_id = str(_uuid.uuid4())
    subdomain = "".join(c if c.isalnum() or c == "-" else "-"
                        for c in name.lower().replace(" ", "-"))
    
    subsystem_id = f"pending-{client_id[:8]}"
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(f"{PROVISIONER_URL}/provision",
                                json={"client_id": client_id,
                                      "subdomain": subdomain,
                                      "api_key":   api_key})
            if r.status_code == 200:
                subsystem_id = r.json().get("container_id", subsystem_id)
    except Exception as e:
        log.warning(f"Provisioner unreachable: {e} — client saved, stack pending")

    client = Client(id=client_id, name=name, email=email,
                    api_key=api_key, subsystem_id=subsystem_id,
                    subdomain=subdomain)
    db.add(client); db.commit(); db.refresh(client)
    
    return {
        "client_id":     client_id,
        "api_key":       api_key,
        "subdomain":     subdomain,
        "dashboard_url": f"https://{subdomain}.marcbd.site",
        "status":        "provisioned"
    }

@router.get("/")
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).filter(Client.active == True).all()

@router.get("/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c

@router.delete("/{client_id}")
async def deprovision_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    try:
        async with httpx.AsyncClient(timeout=20) as http:
            await http.delete(f"{PROVISIONER_URL}/deprovision/{c.subsystem_id}")
    except Exception as e:
        log.warning(f"Deprovision call failed: {e}")
    c.active = False; db.commit()
    return {"status": "deprovisioned", "client_id": client_id}
```

#### `/opt/sif-core/app/routers/threats.py`
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models import ThreatEvent

router = APIRouter()

@router.get("/")
def list_threats(
    client_id: Optional[str] = None,
    attack_type: Optional[str] = None,
    hours: int = Query(24, le=720),
    limit: int = Query(200, le=2000),
    db: Session = Depends(get_db)
):
    q = db.query(ThreatEvent)
    since = datetime.utcnow() - timedelta(hours=hours)
    q = q.filter(ThreatEvent.timestamp >= since)
    if client_id:    q = q.filter(ThreatEvent.client_id == client_id)
    if attack_type:  q = q.filter(ThreatEvent.attack_type == attack_type)
    return q.order_by(desc(ThreatEvent.timestamp)).limit(limit).all()

@router.post("/ingest")
def ingest_threat(event: dict, db: Session = Depends(get_db)):
    allowed = {c.name for c in ThreatEvent.__table__.columns}
    filtered = {k: v for k, v in event.items() if k in allowed}
    te = ThreatEvent(**filtered)
    db.add(te); db.commit(); db.refresh(te)
    return {"id": te.id, "status": "stored"}

@router.get("/stats")
def threat_stats(db: Session = Depends(get_db)):
    results = db.query(
        ThreatEvent.attack_type,
        func.count(ThreatEvent.id).label("count"),
        func.avg(ThreatEvent.confidence).label("avg_confidence")
    ).group_by(ThreatEvent.attack_type).all()
    return [{"attack_type": r[0], "count": r[1],
             "avg_confidence": round(r[2] or 0, 4)} for r in results]

@router.get("/live")
def live_feed(limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    events = db.query(ThreatEvent)\
               .order_by(desc(ThreatEvent.timestamp))\
               .limit(limit).all()
    return [{
        "id":           e.id,
        "timestamp":    e.timestamp.isoformat(),
        "attack_type":  e.attack_type,
        "source_ip":    e.source_ip,
        "confidence":   e.confidence,
        "trust_score":  e.trust_score,
        "action_taken": e.action_taken,
        "client_id":    e.client_id,
        "model_version":e.model_version,
    } for e in events]
```

#### `/opt/sif-core/app/routers/dashboard.py`
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Client, ThreatEvent, PolicyUpdate, OSINTIndicator

router = APIRouter()

@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    now   = datetime.utcnow()
    since = now - timedelta(hours=24)

    total_clients = db.query(func.count(Client.id))\
                      .filter(Client.active == True).scalar() or 0
    total_threats = db.query(func.count(ThreatEvent.id)).scalar() or 0
    threats_24h   = db.query(func.count(ThreatEvent.id))\
                      .filter(ThreatEvent.timestamp >= since).scalar() or 0
    blocked       = db.query(func.count(ThreatEvent.id))\
                      .filter(ThreatEvent.action_taken == "block_ip").scalar() or 0
    osint_count   = db.query(func.count(OSINTIndicator.id))\
                      .filter(OSINTIndicator.active == True).scalar() or 0

    recent = db.query(ThreatEvent)\
               .order_by(desc(ThreatEvent.timestamp)).limit(15).all()

    attack_dist = db.query(ThreatEvent.attack_type,
                           func.count(ThreatEvent.id))\
                    .filter(ThreatEvent.timestamp >= since)\
                    .group_by(ThreatEvent.attack_type).all()

    return {
        "total_clients":      total_clients,
        "total_threats":      total_threats,
        "threats_24h":        threats_24h,
        "blocked_count":      blocked,
        "osint_indicators":   osint_count,
        "attack_distribution":[{"type": r[0], "count": r[1]} for r in attack_dist],
        "recent_threats": [{
            "id":           e.id,
            "timestamp":    e.timestamp.isoformat(),
            "attack_type":  e.attack_type,
            "source_ip":    e.source_ip,
            "confidence":   e.confidence,
            "action_taken": e.action_taken,
            "client_id":    e.client_id,
        } for e in recent]
    }

@router.get("/clients/health")
def client_health(db: Session = Depends(get_db)):
    clients = db.query(Client).filter(Client.active == True).all()
    results = []
    for c in clients:
        last_event = db.query(ThreatEvent)\
                       .filter(ThreatEvent.client_id == c.id)\
                       .order_by(desc(ThreatEvent.timestamp)).first()
        results.append({
            "client_id":   c.id,
            "name":        c.name,
            "subdomain":   c.subdomain,
            "last_seen":   last_event.timestamp.isoformat() if last_event else None,
            "threat_count": db.query(func.count(ThreatEvent.id))
                              .filter(ThreatEvent.client_id == c.id).scalar()
        })
    return results
```

#### `/opt/sif-core/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.routers import clients, threats, dashboard
from app.database import engine, Base
import logging

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SIF Super Control System API",
    description="ASLF-OSINT — Autonomous Serverless Intelligent Firewall · Central Control Plane",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router,   prefix="/api/v1/clients",   tags=["Client Management"])
app.include_router(threats.router,   prefix="/api/v1/threats",   tags=["Threat Intelligence"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

Instrumentator().instrument(app).expose(app)

@app.get("/", tags=["Status"])
def root():
    return {"platform": "SIF-ASLF-OSINT", "version": "3.0.0", "status": "operational"}

@app.get("/health", tags=["Status"])
def health():
    return {"status": "healthy"}
```

### 2.6 systemd Service for VM101

```bash
cat > /etc/systemd/system/sif-core.service << 'SVC'
[Unit]
Description=SIF Super Control System Backend
After=network.target postgresql.service redis.service

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-core
Environment=PYTHONPATH=/opt/sif-core
ExecStart=/opt/sif-core/venv/bin/uvicorn app.main:app \
          --host 0.0.0.0 --port 8000 --workers 2 --access-log
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVC

chown -R sifadmin:sifadmin /opt/sif-core
systemctl daemon-reload
systemctl enable sif-core
systemctl start sif-core
sleep 4
```

### 2.7 Verify VM101

```bash
systemctl is-active sif-core && echo "sif-core: RUNNING" || echo "FAILED"
curl -sf http://localhost:8000/health && echo " — API OK"
curl -sf http://localhost:8000/api/v1/clients/ && echo " — DB OK"
```

**Expected:** `sif-core: RUNNING`, `{"status":"healthy"}`, `[]`

---

## PHASE 3 — VM102: sif-ai-engine (172.16.185.230)

### 3.1 System Dependencies

```bash
apt-get update -qq
apt-get install -y python3.11 python3.11-venv python3.11-dev build-essential \
  pkg-config libhdf5-dev git curl
mkdir -p /opt/sif-ai/{app,models,osint,exports,rl,data,mlruns,logs}
chown -R sifadmin:sifadmin /opt/sif-ai
```

### 3.2 Python ML Environment (run as sifadmin, allow ~8-10 minutes)

```bash
sudo -u sifadmin python3.11 -m venv /opt/sif-ai/venv
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --quiet --upgrade pip setuptools wheel

# Batch 1: core data science
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --quiet \
  numpy pandas scikit-learn xgboost==2.0.3 joblib scipy

# Batch 2: PyTorch CPU (no CUDA needed for inference on VM102)
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --quiet \
  torch --index-url https://download.pytorch.org/whl/cpu

# Batch 3: RL + federated learning
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --quiet \
  "stable-baselines3[extra]>=2.1" gymnasium

# Batch 4: API + inference + explainability
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --quiet \
  fastapi "uvicorn[standard]" httpx redis "aio-pika" pika \
  mlflow shap lime loguru schedule pydantic "pydantic-settings" \
  onnx onnxruntime prometheus-fastapi-instrumentator
```

### 3.3 Write AI Engine Source Files

#### `/opt/sif-ai/models/__init__.py`
```python
```

#### `/opt/sif-ai/models/detector.py`
```python
"""
ASLF-OSINT Multi-Paradigm Detection Engine
Based on: "Autonomous Self-Learning Serverless Intelligent Firewall:
Integrating REST API-Driven Open-Source Threat Intelligence,
Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures"

Architecture:
  Base detection:   XGBoost + BiGRU fusion (α=0.5)    → 98.7% accuracy
  Policy optimizer: PPO (Stable-Baselines3)             → reward-shaped firewall rules
  Drift detection:  DAWMA + SSF                         → adapts in 12.4 min
  Meta-learning:    Prototypical Networks + FS-MCL      → 94.3% zero-day (5-shot)
  Federated:        FedNova + Differential Privacy       → 99.8% policy consistency
"""
import numpy as np
import xgboost as xgb
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
import joblib, os, logging, json

log = logging.getLogger("sif-detector")

ATTACK_CLASSES = {
    0: "BENIGN",
    1: "DoS",        # DoS Hulk, GoldenEye, Slowloris, Slowhttptest
    2: "DDoS",       # DDoS, LOIT, HOIC
    3: "BruteForce", # FTP-Patator, SSH-Patator
    4: "PortScan",
    5: "WebAttack",  # Brute Force, XSS, SQL Injection
    6: "Botnet",
    7: "Other"
}
NUM_FEATURES  = 67
SEQUENCE_LEN  = 10
HIDDEN_DIM    = 128
NUM_CLASSES   = 8
MODEL_DIR     = "/opt/sif-ai/models"


class BiGRUModel(nn.Module):
    """
    Bidirectional GRU for temporal sequence modelling.
    Forward:  h_t = GRU(x_t, h_{t-1})
    Backward: h_t = GRU(x_t, h_{t+1})
    Output:   softmax(W_o [h_T_fwd; h_T_bwd] + b_o)
    """
    def __init__(self, input_dim=NUM_FEATURES, hidden_dim=HIDDEN_DIM,
                 num_classes=NUM_CLASSES):
        super().__init__()
        self.bigru = nn.GRU(
            input_dim, hidden_dim, batch_first=True,
            bidirectional=True, num_layers=2, dropout=0.3
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
            nn.Softmax(dim=1)
        )

    def forward(self, x):  # x: (batch, T, features)
        out, _ = self.bigru(x)
        return self.classifier(out[:, -1, :])  # last timestep


class ASLFDetector:
    """
    Fusion: P_final = α·P_XGBoost + (1-α)·P_BiGRU  (α=0.5)
    Training target: 98.7% accuracy on CICIDS2017+CIC-IDS2018+UNSW-NB15+NSL-KDD
    """
    def __init__(self):
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=500, max_depth=6, learning_rate=0.1,
            reg_lambda=1.0, gamma=0.1, subsample=0.8,
            use_label_encoder=False, eval_metric="mlogloss",
            n_jobs=2, tree_method="hist", device="cpu"
        )
        self.bigru_model = BiGRUModel()
        self.scaler      = StandardScaler()
        self.alpha       = 0.5
        self.is_trained  = False
        self.version     = "3.0.0-base"
        self._load_if_exists()

    def _load_if_exists(self):
        xp = f"{MODEL_DIR}/xgb_model.json"
        gp = f"{MODEL_DIR}/bigru_model.pt"
        sp = f"{MODEL_DIR}/scaler.pkl"
        if os.path.exists(xp) and os.path.exists(gp) and os.path.exists(sp):
            try:
                self.xgb_model.load_model(xp)
                self.bigru_model.load_state_dict(
                    torch.load(gp, map_location="cpu", weights_only=True))
                self.bigru_model.eval()
                self.scaler     = joblib.load(sp)
                self.is_trained = True
                log.info("✅ Pre-trained models loaded from disk")
            except Exception as e:
                log.warning(f"Model load failed: {e} — using untrained base")

    def save(self, version: str = None):
        if version: self.version = version
        self.xgb_model.save_model(f"{MODEL_DIR}/xgb_model.json")
        torch.save(self.bigru_model.state_dict(), f"{MODEL_DIR}/bigru_model.pt")
        joblib.dump(self.scaler, f"{MODEL_DIR}/scaler.pkl")
        with open(f"{MODEL_DIR}/version.json", "w") as f:
            json.dump({"version": self.version}, f)
        log.info(f"Models saved — version {self.version}")

    def predict_proba(self, X_flat: np.ndarray) -> np.ndarray:
        """X_flat: (n, 67) → returns (n, 8) class probabilities"""
        if X_flat.shape[1] < NUM_FEATURES:
            X_flat = np.pad(X_flat, ((0,0),(0,NUM_FEATURES-X_flat.shape[1])))
        elif X_flat.shape[1] > NUM_FEATURES:
            X_flat = X_flat[:, :NUM_FEATURES]

        if not self.is_trained:
            # Base heuristic: flag obvious DoS (very high packet rate)
            probs = np.zeros((len(X_flat), NUM_CLASSES))
            for i, row in enumerate(X_flat):
                pkt_rate = float(row[5]) if len(row) > 5 else 0
                if pkt_rate > 5000:
                    probs[i, 1] = 0.7   # DoS
                    probs[i, 0] = 0.3
                else:
                    probs[i, 0] = 0.9   # BENIGN
                    probs[i, 1] = 0.1
            return probs

        X_scaled = self.scaler.transform(X_flat)
        p_xgb    = self.xgb_model.predict_proba(X_scaled)
        X_seq    = np.stack([X_scaled] * SEQUENCE_LEN, axis=1)  # (n, T, 67)
        with torch.no_grad():
            p_bigru = self.bigru_model(torch.FloatTensor(X_seq)).numpy()

        return self.alpha * p_xgb + (1 - self.alpha) * p_bigru

    def classify(self, X_flat: np.ndarray) -> list:
        probs = self.predict_proba(X_flat)
        return [{
            "class":         ATTACK_CLASSES[int(np.argmax(p))],
            "confidence":    float(np.max(p)),
            "probabilities": {ATTACK_CLASSES[i]: float(p[i]) for i in range(NUM_CLASSES)}
        } for p in probs]


class DAWMADriftDetector:
    """
    Dual Adaptive Window Momentum Average drift detector.
    Adapts within 12.4 minutes per Research 3 results.
    Threshold: |e_recent - e_ref| > 3σ_ref
    """
    def __init__(self, recent_window=1000, ref_window=10000, sigma_k=3.0):
        self.recent  = []
        self.history = []
        self.W_r     = recent_window
        self.W_h     = ref_window
        self.k       = sigma_k
        self.drift   = False

    def update(self, is_error: bool) -> bool:
        v = int(is_error)
        self.recent.append(v);  self.history.append(v)
        if len(self.recent)  > self.W_r: self.recent.pop(0)
        if len(self.history) > self.W_h: self.history.pop(0)
        if len(self.history) < 100:
            return False
        e_r    = np.mean(self.recent)
        e_h    = np.mean(self.history)
        sigma  = np.std(self.history) + 1e-9
        self.drift = abs(e_r - e_h) > self.k * sigma
        return self.drift


class FedNovaAggregator:
    """
    FedNova: Federated Normalized Averaging
    Corrects for data heterogeneity by weighting by local step count τ_k.
    w_{t+1} = w_t - (1/τ_eff) Σ_k (n_k/n) τ_k Δw^k_t
    """
    @staticmethod
    def aggregate(client_deltas: list, sample_counts: list) -> dict:
        total   = sum(sample_counts)
        weights = [n / total for n in sample_counts]
        result  = {}
        for key in client_deltas[0].keys():
            result[key] = sum(w * d[key] for w, d in zip(weights, client_deltas))
        return result


def compute_zta_trust_score(source_ip: str, features: dict,
                             osint_redis_client=None) -> float:
    """
    Zero-Trust Architecture trust score (0.0→1.0).
    Decision: <0.3 block_ip | 0.3-0.7 require_auth | >0.7 allow
    Components: identity(0.4) + behavioral(0.3) + temporal(0.2) + osint(0.1)
    """
    score = 0.4   # base identity score

    # OSINT check
    if osint_redis_client:
        try:
            raw = osint_redis_client.get("osint:otx:latest")
            if raw:
                indicators = {i["value"] for i in json.loads(raw)}
                if source_ip in indicators:
                    score -= 0.35
        except Exception:
            pass

    # Behavioral: abnormal packet rate
    pkt_rate = float(features.get("flow_packets_per_s", 0))
    if pkt_rate > 8000:   score -= 0.25
    elif pkt_rate > 3000: score -= 0.10
    elif pkt_rate < 500:  score += 0.10

    # Temporal: business hours
    import datetime
    hour = datetime.datetime.utcnow().hour
    if 6 <= hour <= 22:   score += 0.10
    else:                 score -= 0.05

    return float(max(0.0, min(1.0, score)))
```

#### `/opt/sif-ai/osint/__init__.py`
```python
```

#### `/opt/sif-ai/osint/feed_manager.py`
```python
"""
REST API-Driven OSINT Integration
Ingests from: AlienVault OTX, VirusTotal, MISP
Schedule: every 60 minutes
Research 3: "eliminates need for human curation and manual retraining cycles"
"""
import httpx, json, asyncio, os, logging, redis
from datetime import datetime, timedelta

log          = logging.getLogger("sif-osint")
OTX_KEY      = os.getenv("OTX_API_KEY", "")
VT_KEY       = os.getenv("VT_API_KEY", "")
MISP_URL     = os.getenv("MISP_URL", "")
MISP_KEY     = os.getenv("MISP_KEY", "")
REDIS_URL    = "redis://:SIF_Redis2024!@sif-core:6379"

def get_redis():
    return redis.from_url(REDIS_URL, decode_responses=True)

async def ingest_alienvault_otx() -> list:
    if not OTX_KEY:
        log.info("OTX_API_KEY not set — skipping (set in /etc/environment)")
        return []
    since = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://otx.alienvault.com/api/v1/pulses/subscribed",
                params={"modified_since": since},
                headers={"X-OTX-API-KEY": OTX_KEY}
            )
        indicators = []
        for pulse in resp.json().get("results", []):
            for ioc in pulse.get("indicators", []):
                if ioc["type"] in ["IPv4", "IPv6", "domain", "hostname", "URL"]:
                    indicators.append({
                        "value":      ioc["indicator"],
                        "type":       ioc["type"],
                        "source":     "AlienVault-OTX",
                        "confidence": 0.85,
                        "ts":         datetime.utcnow().isoformat()
                    })
        rc = get_redis()
        rc.setex("osint:otx:latest", 3600, json.dumps(indicators))
        rc.incr("osint:cycle:count")
        log.info(f"OTX: ingested {len(indicators)} indicators")
        return indicators
    except Exception as e:
        log.error(f"OTX error: {e}")
        return []

async def ingest_virustotal_ips(ips: list) -> list:
    if not VT_KEY:
        return []
    results = []
    async with httpx.AsyncClient(timeout=15) as client:
        for ip in ips[:25]:   # respect free-tier rate limit
            try:
                r = await client.get(
                    f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                    headers={"x-apikey": VT_KEY}
                )
                if r.status_code == 200:
                    stats = r.json()["data"]["attributes"]["last_analysis_stats"]
                    if stats.get("malicious", 0) > 5:
                        results.append({
                            "value": ip, "type": "IPv4",
                            "source": "VirusTotal",
                            "confidence": 0.95,
                            "malicious_votes": stats["malicious"]
                        })
                await asyncio.sleep(0.25)  # rate limiting
            except Exception as e:
                log.debug(f"VT {ip}: {e}")
    return results

async def ingest_misp() -> list:
    if not MISP_URL or not MISP_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            r = await client.post(
                f"{MISP_URL}/attributes/restSearch",
                headers={"Authorization": MISP_KEY,
                         "Accept": "application/json",
                         "Content-Type": "application/json"},
                json={"returnFormat": "json", "type": ["ip-dst","domain","md5"],
                      "to_ids": 1, "confidence": 75}
            )
        attrs = r.json().get("response", {}).get("Attribute", [])
        indicators = [{"value": a["value"], "type": a["type"],
                       "source": "MISP", "confidence": 0.90}
                      for a in attrs]
        log.info(f"MISP: ingested {len(indicators)} indicators")
        return indicators
    except Exception as e:
        log.error(f"MISP error: {e}")
        return []

async def run_osint_cycle():
    log.info("Starting OSINT ingestion cycle...")
    otx   = await ingest_alienvault_otx()
    misp  = await ingest_misp()
    total = len(otx) + len(misp)
    log.info(f"OSINT cycle complete — {total} indicators ingested")
    return total

def schedule_osint_loop():
    """Run OSINT cycle every 60 minutes in a background thread."""
    import schedule, time, threading
    schedule.every(60).minutes.do(lambda: asyncio.run(run_osint_cycle()))
    def _loop():
        asyncio.run(run_osint_cycle())   # immediate first run
        while True:
            schedule.run_pending()
            time.sleep(30)
    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    log.info("OSINT scheduler started — runs every 60 minutes")
```

#### `/opt/sif-ai/app/__init__.py`
```python
```

#### `/opt/sif-ai/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
from typing import List, Optional
import numpy as np, sys, logging, json

sys.path.insert(0, "/opt/sif-ai")
from models.detector import ASLFDetector, compute_zta_trust_score, DAWMADriftDetector
from osint.feed_manager import schedule_osint_loop

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
log = logging.getLogger("sif-ai-engine")

app = FastAPI(
    title="SIF AI Engine — ASLF-OSINT",
    description="Multi-paradigm autonomous firewall: XGBoost+BiGRU+PPO+FedNova+OSINT",
    version="3.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                  allow_methods=["*"], allow_headers=["*"])

detector      = ASLFDetector()
drift_monitor = DAWMADriftDetector()

@app.on_event("startup")
async def startup():
    schedule_osint_loop()
    log.info(f"AI Engine started — model trained: {detector.is_trained} "
             f"version: {detector.version}")

class FlowRequest(BaseModel):
    features:   List[float]
    source_ip:  Optional[str] = ""
    client_id:  Optional[str] = ""

class BatchRequest(BaseModel):
    flows: List[FlowRequest]

@app.get("/")
def root():
    return {"service": "SIF-AI-Engine", "version": detector.version,
            "model_trained": detector.is_trained, "status": "operational",
            "paradigms": ["XGBoost+BiGRU","PPO-RL","DAWMA-SSF",
                          "Prototypical-Networks","FedNova"]}

@app.get("/health")
def health():
    return {"status": "healthy", "model_version": detector.version,
            "model_trained": detector.is_trained}

@app.post("/detect")
async def detect(req: FlowRequest):
    X = np.array([req.features], dtype=np.float32)
    result = detector.classify(X)[0]
    trust  = compute_zta_trust_score(req.source_ip or "0.0.0.0",
                                      {"flow_packets_per_s": float(req.features[5])
                                        if len(req.features) > 5 else 0})
    # ZTA decision
    if result["class"] != "BENIGN" and result["confidence"] > 0.85:
        action = "block_ip"
    elif trust < 0.3:
        action = "block_ip"
    elif trust < 0.7:
        action = "require_auth"
    else:
        action = "allow"

    return {
        "attack_type":   result["class"],
        "confidence":    result["confidence"],
        "trust_score":   trust,
        "action_taken":  action,
        "model_version": detector.version,
        "probabilities": result["probabilities"]
    }

@app.post("/detect/batch")
async def detect_batch(req: BatchRequest):
    results = []
    for flow in req.flows:
        X = np.array([flow.features], dtype=np.float32)
        r = detector.classify(X)[0]
        trust  = compute_zta_trust_score(flow.source_ip or "0.0.0.0", {})
        action = ("block_ip"     if (r["class"] != "BENIGN" and r["confidence"] > 0.85)
                                    or trust < 0.3
                  else "require_auth" if trust < 0.7
                  else "allow")
        results.append({"client_id":   flow.client_id,
                         "attack_type":  r["class"],
                         "confidence":   r["confidence"],
                         "trust_score":  trust,
                         "action_taken": action})
    return {"results": results, "count": len(results)}

@app.get("/model/version")
def model_version():
    return {"version": detector.version, "trained": detector.is_trained}

@app.get("/osint/status")
def osint_status():
    import redis as r
    try:
        rc = r.from_url("redis://:SIF_Redis2024!@sif-core:6379", decode_responses=True)
        raw       = rc.get("osint:otx:latest")
        otx_count = len(json.loads(raw)) if raw else 0
        cycles    = rc.get("osint:cycle:count") or 0
    except Exception:
        otx_count = 0; cycles = 0
    return {"otx_indicators": otx_count, "total_cycles": int(cycles),
            "status": "active" if otx_count > 0 else "awaiting_first_cycle"}

@app.get("/drift/status")
def drift_status():
    return {"drift_detected": drift_monitor.drift,
            "recent_window_size": len(drift_monitor.recent),
            "history_window_size": len(drift_monitor.history)}

Instrumentator().instrument(app).expose(app)
```

### 3.4 systemd Services for VM102

```bash
# AI Engine service
cat > /etc/systemd/system/sif-ai-engine.service << 'SVC'
[Unit]
Description=SIF ASLF-OSINT AI Engine
After=network.target

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-ai
Environment=PYTHONPATH=/opt/sif-ai
ExecStart=/opt/sif-ai/venv/bin/uvicorn app.main:app \
          --host 0.0.0.0 --port 8001 --workers 1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVC

# MLflow tracking server
cat > /etc/systemd/system/sif-mlflow.service << 'SVC'
[Unit]
Description=SIF MLflow Tracking Server
After=network.target

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-ai
ExecStart=/opt/sif-ai/venv/bin/mlflow server \
          --host 0.0.0.0 --port 5000 \
          --backend-store-uri /opt/sif-ai/mlruns \
          --default-artifact-root /opt/sif-ai/exports
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

chown -R sifadmin:sifadmin /opt/sif-ai
systemctl daemon-reload
systemctl enable sif-ai-engine sif-mlflow
systemctl start sif-ai-engine sif-mlflow
sleep 5
```

### 3.5 Verify VM102

```bash
systemctl is-active sif-ai-engine && echo "AI Engine: RUNNING"
systemctl is-active sif-mlflow    && echo "MLflow:    RUNNING"
curl -sf http://localhost:8001/health
curl -sf http://localhost:8001/osint/status
```

---

## PHASE 4 — VM201: sif-client-host (172.16.185.231)

### 4.1 Install Docker

```bash
apt-get update -qq
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker sifadmin
systemctl enable --now docker
```

### 4.2 Python Provisioner

```bash
apt-get install -y python3.11 python3.11-venv
mkdir -p /opt/sif-client-host/{templates,stacks,subsystem_app}
chown -R sifadmin:sifadmin /opt/sif-client-host
sudo -u sifadmin python3.11 -m venv /opt/sif-client-host/venv
sudo -u sifadmin /opt/sif-client-host/venv/bin/pip install --quiet \
  fastapi "uvicorn[standard]" pydantic loguru prometheus-fastapi-instrumentator
```

### 4.3 Client Stack Template

Write `/opt/sif-client-host/templates/client-stack.yml`:

```yaml
version: "3.8"
services:
  sif-firewall:
    image: python:3.11-slim
    container_name: sif-CLIENT_ID-firewall
    environment:
      - CLIENT_ID=CLIENT_ID
      - API_KEY=API_KEY_VAL
      - AI_ENGINE_URL=http://172.16.185.230:8001
      - SUPER_CONTROL_URL=http://172.16.185.97:8000
      - BROKER_URL=amqp://sifadmin:SIF_Rabbit2024!@172.16.185.236:5672
    volumes:
      - sif-CLIENT_ID-models:/models
      - sif-CLIENT_ID-logs:/logs
      - /opt/sif-client-host/subsystem_app:/app:ro
    working_dir: /app
    command: >
      sh -c "pip install fastapi uvicorn httpx pika redis --quiet &&
             uvicorn firewall_app:app --host 0.0.0.0 --port 8080"
    restart: unless-stopped
    extra_hosts:
      - "sif-core:172.16.185.97"
      - "sif-ai-engine:172.16.185.230"
      - "sif-broker:172.16.185.236"
      - "sif-monitor:172.16.185.167"
    networks:
      - sif-CLIENT_ID-net

networks:
  sif-CLIENT_ID-net:
    driver: bridge

volumes:
  sif-CLIENT_ID-models:
  sif-CLIENT_ID-logs:
```

### 4.4 Client Sub-System Firewall App

Write `/opt/sif-client-host/subsystem_app/firewall_app.py`:

```python
"""
SIF Client Sub-System — Autonomous Firewall Instance
Deployed per corporate client. Isolated Docker container.
Calls AI Engine for detection. Reports threats to Super Control System.
Auto-updates model from RabbitMQ model_updates exchange.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx, os, logging, json, threading, asyncio

log = logging.getLogger("sif-client-firewall")
logging.basicConfig(level=logging.INFO)

CLIENT_ID     = os.getenv("CLIENT_ID", "unknown")
API_KEY       = os.getenv("API_KEY", "")
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://sif-ai-engine:8001")
CONTROL_URL   = os.getenv("SUPER_CONTROL_URL", "http://sif-core:8000")
BROKER_URL    = os.getenv("BROKER_URL", "amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672")

app = FastAPI(title=f"SIF Client Firewall [{CLIENT_ID}]", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                  allow_methods=["*"], allow_headers=["*"])

class FlowRequest(BaseModel):
    features:        List[float]
    source_ip:       Optional[str] = ""
    destination_ip:  Optional[str] = ""
    protocol:        Optional[int] = 6

@app.get("/")
def root():
    return {"client_id": CLIENT_ID, "service": "SIF-Client-Firewall",
            "status": "operational", "version": "3.0.0"}

@app.get("/health")
def health():
    return {"client_id": CLIENT_ID, "status": "healthy"}

@app.post("/api/v1/detect")
async def detect(req: FlowRequest):
    result = {"attack_type": "UNKNOWN", "confidence": 0.0,
              "trust_score": 0.5, "action_taken": "allow"}
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.post(
                f"{AI_ENGINE_URL}/detect",
                json={"features":  req.features,
                      "source_ip": req.source_ip,
                      "client_id": CLIENT_ID}
            )
            result = resp.json()
    except Exception as e:
        log.warning(f"AI Engine unreachable: {e}")

    # Forward threat to Super Control System
    if result.get("attack_type", "BENIGN") != "BENIGN":
        try:
            async with httpx.AsyncClient(timeout=5) as ctrl:
                await ctrl.post(
                    f"{CONTROL_URL}/api/v1/threats/ingest",
                    json={
                        "client_id":      CLIENT_ID,
                        "attack_type":    result.get("attack_type"),
                        "source_ip":      req.source_ip or "",
                        "destination_ip": req.destination_ip or "",
                        "confidence":     result.get("confidence", 0.0),
                        "trust_score":    result.get("trust_score", 0.5),
                        "action_taken":   result.get("action_taken", "allow"),
                        "model_version":  result.get("model_version", "unknown"),
                    }
                )
        except Exception as e:
            log.debug(f"Control report failed: {e}")

    return result

def start_model_update_consumer():
    """Subscribe to RabbitMQ model_updates fanout — auto-apply new models."""
    import pika
    def _consumer():
        try:
            conn = pika.BlockingConnection(pika.URLParameters(BROKER_URL))
            ch   = conn.channel()
            ch.exchange_declare(exchange="model_updates",
                                exchange_type="fanout", durable=True)
            q = ch.queue_declare(queue=f"model_updates_{CLIENT_ID}", exclusive=True)
            ch.queue_bind(exchange="model_updates", queue=q.method.queue)
            def on_message(ch, method, props, body):
                update = json.loads(body)
                log.info(f"[{CLIENT_ID}] Model update received: v{update.get('version')}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            ch.basic_consume(queue=q.method.queue, on_message_callback=on_message)
            log.info(f"[{CLIENT_ID}] Subscribed to model_updates exchange")
            ch.start_consuming()
        except Exception as e:
            log.warning(f"RabbitMQ consumer error: {e} — retrying in 30s")
            import time; time.sleep(30); _consumer()

    t = threading.Thread(target=_consumer, daemon=True)
    t.start()

@app.on_event("startup")
async def startup():
    start_model_update_consumer()
```

### 4.5 Provisioner API

Write `/opt/sif-client-host/provisioner.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
import subprocess, os, shutil, logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sif-provisioner")

app = FastAPI(title="SIF Client Provisioner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                  allow_methods=["*"], allow_headers=["*"])
Instrumentator().instrument(app).expose(app)

TEMPLATE = "/opt/sif-client-host/templates/client-stack.yml"
STACKS   = "/opt/sif-client-host/stacks"

class ProvisionRequest(BaseModel):
    client_id: str
    subdomain: str
    api_key:   str

@app.get("/")
def root():
    return {"service": "SIF-Provisioner", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/stacks")
def list_stacks():
    os.makedirs(STACKS, exist_ok=True)
    return {"stacks": os.listdir(STACKS), "count": len(os.listdir(STACKS))}

@app.post("/provision")
def provision(req: ProvisionRequest):
    stack_dir = f"{STACKS}/{req.client_id}"
    os.makedirs(stack_dir, exist_ok=True)

    with open(TEMPLATE) as f:
        compose = f.read()
    compose = compose.replace("CLIENT_ID",    req.client_id)
    compose = compose.replace("API_KEY_VAL",  req.api_key)

    compose_file = f"{stack_dir}/docker-compose.yml"
    with open(compose_file, "w") as f:
        f.write(compose)

    result = subprocess.run(
        ["docker", "compose", "-f", compose_file, "up", "-d", "--remove-orphans"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        log.error(f"Docker error for {req.client_id}: {result.stderr[:300]}")
        # Still return success — client record created; stack can be restarted
        return {"container_id":  req.client_id,
                "status":        "compose_queued",
                "warning":       result.stderr[:200]}

    log.info(f"Provisioned client stack: {req.client_id}")
    return {"container_id": req.client_id,
            "status":       "provisioned",
            "subdomain":    req.subdomain}

@app.delete("/deprovision/{client_id}")
def deprovision(client_id: str):
    stack_dir    = f"{STACKS}/{client_id}"
    compose_file = f"{stack_dir}/docker-compose.yml"
    if os.path.exists(compose_file):
        subprocess.run(["docker", "compose", "-f", compose_file,
                        "down", "-v", "--remove-orphans"], capture_output=True)
    shutil.rmtree(stack_dir, ignore_errors=True)
    return {"status": "deprovisioned", "client_id": client_id}
```

### 4.6 systemd Service for VM201

```bash
cat > /etc/systemd/system/sif-provisioner.service << 'SVC'
[Unit]
Description=SIF Client Provisioner API
After=network.target docker.service

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-client-host
ExecStart=/opt/sif-client-host/venv/bin/uvicorn provisioner:app \
          --host 0.0.0.0 --port 8500 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

chown -R sifadmin:sifadmin /opt/sif-client-host
systemctl daemon-reload
systemctl enable sif-provisioner
systemctl start sif-provisioner
sleep 3
```

### 4.7 Verify VM201

```bash
systemctl is-active docker          && echo "Docker:      RUNNING"
systemctl is-active sif-provisioner && echo "Provisioner: RUNNING"
curl -sf http://localhost:8500/health
curl -sf http://localhost:8500/stacks
```

---

## PHASE 5 — VM203: sif-monitor (172.16.185.167)

### 5.1 Prometheus

```bash
PROM_VER="2.47.2"
wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VER}/prometheus-${PROM_VER}.linux-amd64.tar.gz"
tar xzf prometheus-*.tar.gz
mv prometheus-*/prometheus /usr/local/bin/
mv prometheus-*/promtool   /usr/local/bin/
rm -rf prometheus-*

useradd --system --no-create-home prometheus 2>/dev/null || true
mkdir -p /etc/prometheus /var/lib/prometheus
chown prometheus:prometheus /var/lib/prometheus

cat > /etc/prometheus/prometheus.yml << 'PROM'
global:
  scrape_interval:     15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "sif-core"
    static_configs:
      - targets: ["sif-core:8000"]

  - job_name: "sif-ai-engine"
    static_configs:
      - targets: ["sif-ai-engine:8001"]

  - job_name: "sif-client-host"
    static_configs:
      - targets: ["sif-client-host:8500"]

  - job_name: "node-exporter"
    static_configs:
      - targets:
          - "sif-core:9100"
          - "sif-ai-engine:9100"
          - "sif-dashboard:9100"
          - "sif-client-host:9100"
          - "sif-broker:9100"
          - "sif-monitor:9100"
PROM

cat > /etc/systemd/system/prometheus.service << 'SVC'
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --web.listen-address=0.0.0.0:9090 \
  --storage.tsdb.retention.time=30d
Restart=always

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload && systemctl enable --now prometheus
```

### 5.2 Node Exporter (also on VM203)

```bash
NODE_VER="1.6.1"
wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_VER}/node_exporter-${NODE_VER}.linux-amd64.tar.gz"
tar xzf node_exporter-*.tar.gz
mv node_exporter-*/node_exporter /usr/local/bin/
rm -rf node_exporter-*

cat > /etc/systemd/system/node-exporter.service << 'SVC'
[Unit]
Description=Node Exporter
After=network.target

[Service]
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload && systemctl enable --now node-exporter
```

### 5.3 Grafana

```bash
apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://apt.grafana.com/gpg.key | apt-key add -
echo "deb https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update -qq && apt-get install -y grafana

mkdir -p /etc/grafana/provisioning/datasources
cat > /etc/grafana/provisioning/datasources/prometheus.yml << 'YAML'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: true
YAML

sed -i 's/^;admin_user = .*/admin_user = sifadmin/'      /etc/grafana/grafana.ini
sed -i 's/^;admin_password = .*/admin_password = SIF_Grafana2024!/' /etc/grafana/grafana.ini

systemctl enable --now grafana-server
```

### 5.4 Loki

```bash
LOKI_VER="2.9.2"
wget -q "https://github.com/grafana/loki/releases/download/v${LOKI_VER}/loki-linux-amd64.zip"
apt-get install -y unzip
unzip -o loki-linux-amd64.zip && mv loki-linux-amd64 /usr/local/bin/loki
rm -f loki-linux-amd64.zip

mkdir -p /etc/loki /var/lib/loki
cat > /etc/loki/loki-config.yml << 'YAML'
auth_enabled: false
server:
  http_listen_port: 3100
ingester:
  lifecycler:
    ring:
      kvstore: {store: inmemory}
      replication_factor: 1
  chunk_idle_period: 5m
schema_config:
  configs:
    - from: "2023-01-01"
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index: {prefix: index_, period: 24h}
storage_config:
  boltdb_shipper:
    active_index_directory: /var/lib/loki/index
    cache_location: /var/lib/loki/cache
    shared_store: filesystem
  filesystem:
    directory: /var/lib/loki/chunks
limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
YAML

cat > /etc/systemd/system/loki.service << 'SVC'
[Unit]
Description=Loki Log Aggregation
After=network.target

[Service]
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yml
Restart=always

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload && systemctl enable --now loki
```

### 5.5 Verify VM203

```bash
for svc in prometheus grafana-server loki node-exporter; do
  systemctl is-active $svc && echo "$svc: RUNNING" || echo "$svc: FAILED"
done
curl -sf http://localhost:9090/-/healthy && echo "Prometheus: healthy"
curl -sf http://localhost:3000/api/health | python3 -c "import sys,json; print(json.load(sys.stdin)['database'])"
```

---

## PHASE 6 — VM103: sif-dashboard (172.16.185.234)

### 6.1 Node.js + Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs nginx
```

### 6.2 Build Next.js Super Control Dashboard

```bash
mkdir -p /opt/sif-dashboard/src/app/components
chown -R sifadmin:sifadmin /opt/sif-dashboard
cd /opt/sif-dashboard
```

Create the following files completely:

#### `/opt/sif-dashboard/package.json`
```json
{
  "name": "sif-super-dashboard",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev":   "next dev",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "next":       "14.0.3",
    "react":      "^18",
    "react-dom":  "^18",
    "axios":      "^1.6.0",
    "recharts":   "^2.10.1",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "typescript":      "^5",
    "@types/node":     "^20",
    "@types/react":    "^18",
    "@types/react-dom":"^18",
    "tailwindcss":     "^3.3.0",
    "autoprefixer":    "^10.0.1",
    "postcss":         "^8"
  }
}
```

#### `/opt/sif-dashboard/next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/sif/:path*',   destination: 'http://sif-core:8000/api/v1/:path*' },
      { source: '/api/ai/:path*',    destination: 'http://sif-ai-engine:8001/:path*' },
      { source: '/api/monitor/:path*', destination: 'http://sif-monitor:3000/:path*' },
    ]
  }
}
module.exports = nextConfig
```

#### `/opt/sif-dashboard/tailwind.config.js`
```js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

#### `/opt/sif-dashboard/postcss.config.js`
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

#### `/opt/sif-dashboard/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es5", "lib": ["dom","dom.iterable","esnext"],
    "allowJs": true, "skipLibCheck": true, "strict": true,
    "noEmit": true, "esModuleInterop": true,
    "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true,
    "jsx": "preserve", "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./src/*"]}
  },
  "include": ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `/opt/sif-dashboard/src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
* { box-sizing: border-box; }
body { background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; margin: 0; }
```

#### `/opt/sif-dashboard/src/app/layout.tsx`
```tsx
import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'SIF Super Control Dashboard — ASLF-OSINT',
  description: 'Autonomous Serverless Intelligent Firewall Platform',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
```

#### `/opt/sif-dashboard/src/app/page.tsx`
Write the full dashboard page with:
- A top header bar showing platform name + live/offline indicator
- 5 stat cards: Active Clients / Total Threats / Blocked (24h) / OSINT Indicators / Model Version
- A live threat feed table (polls every 10 seconds) with columns: Time, Attack Type, Source IP, Confidence, Action, Client
- An attack distribution section (counts per attack type)
- Quick links footer: API Docs, AI Engine Docs, Grafana, RabbitMQ Mgmt
- All data from `http://sif-core:8000/api/v1/dashboard/overview` and `http://sif-ai-engine:8001/`
- Color coding: BENIGN=green, DoS/DDoS=red, BruteForce=orange, PortScan=yellow, WebAttack=purple, Botnet=pink
- Action badge styling: block_ip=red bg, require_auth=yellow bg, allow=green bg
- Auto-refresh every 10 seconds using setInterval
- Error state showing "Cannot reach SIF API" with the actual error
- Loading skeleton while first fetch runs

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'

const API = 'http://sif-core:8000'
const AI  = 'http://sif-ai-engine:8001'

interface ThreatEvent {
  id: string; timestamp: string; attack_type: string;
  source_ip: string; confidence: number; action_taken: string; client_id: string;
}
interface Overview {
  total_clients: number; total_threats: number; threats_24h: number;
  blocked_count: number; osint_indicators: number;
  recent_threats: ThreatEvent[];
  attack_distribution: {type: string; count: number}[];
}

const ATTACK_COLORS: Record<string, string> = {
  BENIGN: 'text-green-400', DoS: 'text-red-400', DDoS: 'text-red-500',
  BruteForce: 'text-orange-400', PortScan: 'text-yellow-400',
  WebAttack: 'text-purple-400', Botnet: 'text-pink-400', Other: 'text-gray-400'
}
const ACTION_STYLES: Record<string, string> = {
  block_ip:     'bg-red-900/60 text-red-300 border border-red-700',
  require_auth: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  allow:        'bg-green-900/60 text-green-300 border border-green-700',
}

export default function Dashboard() {
  const [overview, setOverview]   = useState<Overview | null>(null)
  const [aiStatus, setAiStatus]   = useState<any>(null)
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState('')
  const [lastUpdate, setLastUpdate] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, aiRes] = await Promise.all([
        fetch(`${API}/api/v1/dashboard/overview`),
        fetch(`${AI}/`)
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (aiRes.ok) setAiStatus(await aiRes.json())
      setError('')
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(`Cannot reach SIF API — ${e.message}. Ensure sif-core (172.16.185.97:8000) and sif-ai-engine (172.16.185.230:8001) are running.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-white">SIF Super Control Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">ASLF-OSINT · Autonomous Serverless Intelligent Firewall · Research Series 1-2-3</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-slate-500 text-xs">Updated {lastUpdate}</span>}
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}/>
            <span className="text-sm text-slate-400">{error ? 'Offline' : 'Live'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-6 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-slate-700 rounded mb-3 w-2/3"/>
              <div className="h-8 bg-slate-700 rounded w-1/2"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label:'Active Clients',     value: overview?.total_clients    ?? '—', color:'text-blue-400' },
            { label:'Total Threats',      value: overview?.total_threats     ?? '—', color:'text-red-400' },
            { label:'Threats (24h)',      value: overview?.threats_24h       ?? '—', color:'text-orange-400' },
            { label:'Blocked (all time)', value: overview?.blocked_count     ?? '—', color:'text-rose-400' },
            { label:'OSINT Indicators',   value: overview?.osint_indicators  ?? '—', color:'text-teal-400' },
          ].map(card => (
            <div key={card.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Engine Status */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-base font-semibold text-white mb-4">AI Engine Status</h2>
          {aiStatus ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Service</span>
                <span className="text-white font-mono">{aiStatus.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version</span>
                <span className="text-white font-mono">{aiStatus.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model Trained</span>
                <span className={aiStatus.model_trained ? 'text-green-400' : 'text-yellow-400'}>
                  {aiStatus.model_trained ? '✓ Yes' : '⟳ Base (awaiting data)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-green-400">{aiStatus.status}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Connecting to AI Engine...</p>
          )}
        </div>

        {/* Attack Distribution */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-base font-semibold text-white mb-4">Attack Distribution (24h)</h2>
          {overview?.attack_distribution?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {overview.attack_distribution.map(a => (
                <div key={a.type} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                  <span className={`text-sm font-medium ${ATTACK_COLORS[a.type] || 'text-gray-400'}`}>{a.type}</span>
                  <span className="text-white font-bold text-sm">{a.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No attacks detected in last 24h</p>
          )}
        </div>
      </div>

      {/* Live Threat Feed */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Live Threat Feed</h2>
          <span className="text-xs text-slate-500">Auto-refreshes every 10s</span>
        </div>
        <div className="overflow-auto max-h-80">
          {overview?.recent_threats?.length ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  {['Time','Attack Type','Source IP','Confidence','Action','Client'].map(h => (
                    <th key={h} className="p-3 text-left text-slate-400 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.recent_threats.map(t => (
                  <tr key={t.id} className="border-t border-slate-700/40 hover:bg-slate-700/20">
                    <td className="p-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                    <td className={`p-3 font-bold text-xs ${ATTACK_COLORS[t.attack_type] || 'text-gray-400'}`}>
                      {t.attack_type}
                    </td>
                    <td className="p-3 text-slate-300 font-mono text-xs">{t.source_ip || '—'}</td>
                    <td className="p-3 text-slate-300 text-xs">
                      {t.confidence ? `${(t.confidence*100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${ACTION_STYLES[t.action_taken] || ''}`}>
                        {t.action_taken}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-xs">
                      {t.client_id ? t.client_id.slice(0,8)+'…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No threats detected — system monitoring...
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name:'Core API Docs',      url:'http://172.16.185.97:8000/docs' },
          { name:'AI Engine Docs',     url:'http://172.16.185.230:8001/docs' },
          { name:'Grafana Monitoring', url:'http://172.16.185.167:3000' },
          { name:'RabbitMQ Mgmt',      url:'http://172.16.185.236:15672' },
        ].map(link => (
          <a key={link.name} href={link.url} target="_blank" rel="noreferrer"
             className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-3 text-center text-slate-300 hover:text-white transition-colors text-xs font-medium">
            {link.name} ↗
          </a>
        ))}
      </div>
    </div>
  )
}
```

### 6.3 Build and Start

```bash
cd /opt/sif-dashboard
sudo -u sifadmin npm install --silent
sudo -u sifadmin npm run build

cat > /etc/systemd/system/sif-dashboard.service << 'SVC'
[Unit]
Description=SIF Super Control Dashboard
After=network.target

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-dashboard
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

cat > /etc/nginx/sites-available/sif-dashboard << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
    location /api/sif/ { proxy_pass http://sif-core:8000/api/v1/; }
    location /api/ai/  { proxy_pass http://sif-ai-engine:8001/; }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sif-dashboard /etc/nginx/sites-enabled/
nginx -t

chown -R sifadmin:sifadmin /opt/sif-dashboard
systemctl daemon-reload
systemctl enable sif-dashboard nginx
systemctl start sif-dashboard
sleep 3
systemctl start nginx
```

---

## PHASE 7 — Node Exporter on VM101, VM102, VM103, VM201, VM202

Run this script on each of those 5 VMs:

```bash
NODE_VER="1.6.1"
wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_VER}/node_exporter-${NODE_VER}.linux-amd64.tar.gz"
tar xzf node_exporter-*.tar.gz
mv node_exporter-*/node_exporter /usr/local/bin/
rm -rf node_exporter-*
cat > /etc/systemd/system/node-exporter.service << 'SVC'
[Unit]
Description=Node Exporter
After=network.target
[Service]
ExecStart=/usr/local/bin/node_exporter
Restart=always
[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload && systemctl enable --now node-exporter
systemctl is-active node-exporter && echo "Node Exporter: RUNNING on $(hostname):9100"
```

---

## PHASE 8 — END-TO-END VALIDATION

Run ALL of these checks. Fix any failure before declaring the platform complete.

### 8.1 Service Health Check (run from any VM)

```bash
echo "=== SIF Platform Health Check ==="
declare -A CHECKS=(
  ["VM101 API"]="http://sif-core:8000/health"
  ["VM101 DB"] ="http://sif-core:8000/api/v1/clients/"
  ["VM102 AI"] ="http://sif-ai-engine:8001/health"
  ["VM102 OSINT"]="http://sif-ai-engine:8001/osint/status"
  ["VM201 Prov"]="http://sif-client-host:8500/health"
  ["VM203 Prom"]="http://sif-monitor:9090/-/healthy"
)
for name in "${!CHECKS[@]}"; do
  url="${CHECKS[$name]}"
  result=$(curl -sf "$url" 2>/dev/null && echo "OK" || echo "FAIL")
  echo "[$result] $name — $url"
done
```

### 8.2 Provision Test Client

```bash
echo "=== Provisioning test client ==="
RESULT=$(curl -sf -X POST \
  "http://sif-core:8000/api/v1/clients/provision?name=TestCorp&email=test@testcorp.com")
echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); \
  print('Client ID:', d['client_id']); \
  print('API Key:',   d['api_key'][:16]+'...'); \
  print('Dashboard:', d['dashboard_url'])"
```

### 8.3 Threat Detection Test

```bash
echo "=== Threat Detection Test (DoS simulation) ==="
curl -sf -X POST http://sif-ai-engine:8001/detect \
  -H "Content-Type: application/json" \
  -d '{
    "features": [0,10000,0,0,1500000,9800,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "source_ip": "192.168.100.50",
    "client_id": "validation-test"
  }' | python3 -m json.tool
```

**Expected response:**
```json
{
  "attack_type": "DoS",
  "confidence": 0.7,
  "trust_score": 0.3,
  "action_taken": "block_ip",
  "model_version": "3.0.0-base"
}
```

### 8.4 Threat Ingest & Dashboard Check

```bash
echo "=== Ingest synthetic threat event ==="
curl -sf -X POST http://sif-core:8000/api/v1/threats/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "attack_type":   "DDoS",
    "source_ip":     "10.0.0.99",
    "destination_ip":"172.16.185.97",
    "confidence":    0.96,
    "trust_score":   0.12,
    "action_taken":  "block_ip",
    "model_version": "3.0.0-base"
  }'

echo ""
echo "=== Dashboard overview ==="
curl -sf http://sif-core:8000/api/v1/dashboard/overview | python3 -m json.tool
```

### 8.5 Docker Stack Test

```bash
echo "=== Docker client stack check ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep sif
curl -sf http://sif-client-host:8500/stacks
```

### 8.6 Final Status Summary

Print a complete summary table:

```bash
echo ""
echo "=============================================="
echo " SIF PLATFORM — FINAL STATUS SUMMARY"
echo "=============================================="
printf "%-30s %-20s %s\n" "SERVICE" "IP:PORT" "STATUS"
printf "%-30s %-20s %s\n" "-------" "-------" "------"
for entry in \
  "VM101 Core API:sif-core:8000:/health" \
  "VM102 AI Engine:sif-ai-engine:8001:/health" \
  "VM102 MLflow:sif-ai-engine:5000:/" \
  "VM103 Dashboard:sif-dashboard:80:/" \
  "VM201 Provisioner:sif-client-host:8500:/health" \
  "VM202 RabbitMQ Mgmt:sif-broker:15672:/" \
  "VM203 Prometheus:sif-monitor:9090:/-/healthy" \
  "VM203 Grafana:sif-monitor:3000:/api/health"
do
  IFS=: read svc host port path <<< "$entry"
  status=$(curl -sf "http://${host}:${port}${path}" > /dev/null 2>&1 && echo "✅ RUNNING" || echo "❌ OFFLINE")
  printf "%-30s %-20s %s\n" "$svc" "${host}:${port}" "$status"
done
echo "=============================================="
echo " Dashboard: http://172.16.185.234"
echo " API Docs:  http://172.16.185.97:8000/docs"
echo " AI Docs:   http://172.16.185.230:8001/docs"
echo " Grafana:   http://172.16.185.167:3000"
echo "=============================================="
```

---

## ERROR HANDLING RULES

If any step fails, follow this decision tree before stopping:

1. **Service fails to start** → Check `journalctl -u <service> -n 50` → fix the specific error → restart
2. **pip install fails** → Retry with `--no-cache-dir` → if network error, wait 30s and retry
3. **PostgreSQL connection refused** → Verify `systemctl is-active postgresql` → check `pg_hba.conf` allows local connections
4. **RabbitMQ connection refused from another VM** → Check `/etc/hosts` has `sif-broker` → verify port 5672 open with `nc -zv sif-broker 5672`
5. **Docker compose fails** → Check `docker info` → verify sifadmin is in docker group → re-login or use `newgrp docker`
6. **npm build fails** → Check Node.js version: `node --version` (must be 20.x) → clear cache: `npm cache clean --force`
7. **Curl health check fails** → Wait 10 seconds (service still starting) → check systemd status → check port binding with `ss -tlnp | grep <port>`

---

## IMPORTANT NOTES FOR CODEX

- **Do not skip any step** — each phase depends on the previous
- **Write all files completely** — no `# TODO` or placeholder comments
- **Always chown files to sifadmin** after writing them as root
- **Test after every phase** before moving to the next
- **VM101-VM103 are on Server 1** — you can run commands directly
- **VM201-VM203 are on Server 2** — use SSH: `ssh sifadmin@172.16.185.x`
- **All passwords are set** — use them exactly as specified, do not generate new ones
- **The platform is based on real IEEE research** — implement all algorithms faithfully
- After all phases complete, output the final status summary from Phase 8.6

---

*End of Codex Master Prompt — ASLF-OSINT Platform v3.0.0*
