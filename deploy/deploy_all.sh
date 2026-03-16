#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/common.sh"

phase0_hosts() {
  log "Phase 0: updating /etc/hosts on all VMs"
  local host
  for host in "${!VM_IPS[@]}"; do
    append_hosts_block "${host}"
  done
}

phase1_broker() {
  log "Phase 1: deploying sif-broker"
  run_sudo_script "sif-broker" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y rabbitmq-server redis-server curl ca-certificates
rabbitmq-plugins enable rabbitmq_management
systemctl enable --now rabbitmq-server
rabbitmqctl await_startup
rabbitmqctl add_user sifadmin 'SIF_Rabbit2024!' 2>/dev/null || rabbitmqctl change_password sifadmin 'SIF_Rabbit2024!'
rabbitmqctl set_user_tags sifadmin administrator
rabbitmqctl set_permissions -p / sifadmin '.*' '.*' '.*'
rabbitmqctl delete_user guest 2>/dev/null || true
if grep -q '^bind ' /etc/redis/redis.conf; then
  sed -i 's/^bind .*/bind 0.0.0.0 ::1/' /etc/redis/redis.conf
else
  echo 'bind 0.0.0.0 ::1' >> /etc/redis/redis.conf
fi
if grep -q '^# requirepass ' /etc/redis/redis.conf; then
  sed -i 's/^# requirepass .*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
elif grep -q '^requirepass ' /etc/redis/redis.conf; then
  sed -i 's/^requirepass .*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
else
  echo 'requirepass SIF_Redis2024!' >> /etc/redis/redis.conf
fi
systemctl enable --now redis-server
systemctl restart rabbitmq-server redis-server
EOF
  sudo_remote "sif-broker" "rabbitmqctl list_users"
  remote "sif-broker" "redis-cli -a 'SIF_Redis2024!' ping"
}

phase2_core() {
  log "Phase 2: deploying sif-core"
  copy_tree "${PROJECT_ROOT}/apps/sif-core" "sif-core" "/opt/sif-core"
  run_sudo_script "sif-core" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y python3 python3-venv python3-dev build-essential postgresql postgresql-contrib libpq-dev redis-server git curl
systemctl enable --now postgresql redis-server
if grep -q '^bind ' /etc/redis/redis.conf; then
  sed -i 's/^bind .*/bind 0.0.0.0 ::1/' /etc/redis/redis.conf
else
  echo 'bind 0.0.0.0 ::1' >> /etc/redis/redis.conf
fi
if grep -q '^# requirepass ' /etc/redis/redis.conf; then
  sed -i 's/^# requirepass .*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
elif grep -q '^requirepass ' /etc/redis/redis.conf; then
  sed -i 's/^requirepass .*/requirepass SIF_Redis2024!/' /etc/redis/redis.conf
else
  echo 'requirepass SIF_Redis2024!' >> /etc/redis/redis.conf
fi
systemctl restart redis-server
sudo -u postgres psql <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sif_user') THEN
    CREATE USER sif_user WITH ENCRYPTED PASSWORD 'SIF_DB_Pass2024!';
  END IF;
END $$;
SELECT 'CREATE DATABASE sif_platform OWNER sif_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sif_platform') \gexec
GRANT ALL PRIVILEGES ON DATABASE sif_platform TO sif_user;
SQL
cd /opt/sif-core
sudo -u sifadmin python3 -m venv /opt/sif-core/venv
sudo -u sifadmin /opt/sif-core/venv/bin/pip install --upgrade pip
sudo -u sifadmin /opt/sif-core/venv/bin/pip install -r /opt/sif-core/requirements.txt
cat > /etc/systemd/system/sif-core.service <<'SVC'
[Unit]
Description=SIF Super Control System Backend
After=network.target postgresql.service redis-server.service

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-core
Environment=PYTHONPATH=/opt/sif-core
Environment=SIF_PUBLIC_CLIENT_DOMAIN=marcbd.site
ExecStart=/opt/sif-core/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable --now sif-core
sleep 5
EOF
  remote "sif-core" "systemctl is-active sif-core && curl -sf http://127.0.0.1:8000/health"
}

phase3_ai() {
  log "Phase 3: deploying sif-ai-engine"
  copy_tree "${PROJECT_ROOT}/apps/sif-ai" "sif-ai-engine" "/opt/sif-ai"
  run_sudo_script "sif-ai-engine" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y python3 python3-venv python3-dev build-essential pkg-config libhdf5-dev libgomp1 git curl
mkdir -p /opt/sif-ai/{exports,logs,mlruns,models}
chown -R sifadmin:sifadmin /opt/sif-ai
sudo -u sifadmin python3 -m venv /opt/sif-ai/venv
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --upgrade pip setuptools wheel
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch
sudo -u sifadmin /opt/sif-ai/venv/bin/pip install -r /opt/sif-ai/requirements.txt
cat > /etc/systemd/system/sif-ai-engine.service <<'SVC'
[Unit]
Description=SIF ASLF-OSINT AI Engine
After=network.target

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-ai
Environment=PYTHONPATH=/opt/sif-ai
Environment=SIF_REDIS_URL=redis://:SIF_Redis2024!@sif-core:6379/0
Environment=SIF_BROKER_URL=amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672/
Environment=SIF_SUPER_CONTROL_URL=http://sif-core:8000
ExecStart=/opt/sif-ai/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
cat > /etc/systemd/system/sif-mlflow.service <<'SVC'
[Unit]
Description=SIF MLflow Tracking Server
After=network.target

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-ai
ExecStart=/opt/sif-ai/venv/bin/mlflow server --host 0.0.0.0 --port 5000 --backend-store-uri sqlite:////opt/sif-ai/mlflow.db --default-artifact-root /opt/sif-ai/exports
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable --now sif-ai-engine sif-mlflow
sleep 8
EOF
  remote "sif-ai-engine" "systemctl is-active sif-ai-engine && curl -sf http://127.0.0.1:8001/health"
}

phase4_client_host() {
  log "Phase 4: deploying sif-client-host"
  copy_tree "${PROJECT_ROOT}/apps/sif-client-host" "sif-client-host" "/opt/sif-client-host"
  run_sudo_script "sif-client-host" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl gnupg lsb-release python3 python3-venv nginx
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker sifadmin
systemctl enable --now docker
mkdir -p /opt/sif-client-host/stacks
chown -R sifadmin:sifadmin /opt/sif-client-host/stacks
install -m 0755 /opt/sif-client-host/scripts/sif-client-route /usr/local/bin/sif-client-route
cat > /etc/sudoers.d/sif-client-route <<'SUDO'
sifadmin ALL=(root) NOPASSWD: /usr/local/bin/sif-client-route *
SUDO
chmod 0440 /etc/sudoers.d/sif-client-route
cat > /etc/nginx/sites-available/sif-client-default <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    return 404;
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sif-client-default /etc/nginx/sites-enabled/sif-client-default
nginx -t
systemctl enable --now nginx
sudo -u sifadmin python3 -m venv /opt/sif-client-host/venv
sudo -u sifadmin /opt/sif-client-host/venv/bin/pip install --upgrade pip
sudo -u sifadmin /opt/sif-client-host/venv/bin/pip install -r /opt/sif-client-host/requirements.txt
cat > /etc/systemd/system/sif-provisioner.service <<'SVC'
[Unit]
Description=SIF Client Provisioner API
After=network.target docker.service

[Service]
User=sifadmin
WorkingDirectory=/opt/sif-client-host
Environment=PUBLIC_BASE_DOMAIN=marcbd.site
ExecStart=/opt/sif-client-host/venv/bin/uvicorn provisioner:app --host 0.0.0.0 --port 8500 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable --now sif-provisioner
EOF
  remote "sif-client-host" "systemctl is-active sif-provisioner nginx && curl -sf http://127.0.0.1:8500/health"
}

phase5_monitor() {
  log "Phase 5: deploying sif-monitor"
  copy_tree "${PROJECT_ROOT}/monitoring" "sif-monitor" "/opt/sif-monitor-assets"
  run_sudo_script "sif-monitor" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y unzip wget curl gnupg apt-transport-https software-properties-common
PROM_VER="2.53.3"
NODE_VER="1.8.2"
LOKI_VER="3.1.1"
cd /tmp
curl -fsSLO "https://github.com/prometheus/prometheus/releases/download/v${PROM_VER}/prometheus-${PROM_VER}.linux-amd64.tar.gz"
tar xzf "prometheus-${PROM_VER}.linux-amd64.tar.gz"
install -m 0755 "prometheus-${PROM_VER}.linux-amd64/prometheus" /usr/local/bin/prometheus
install -m 0755 "prometheus-${PROM_VER}.linux-amd64/promtool" /usr/local/bin/promtool
rm -rf "prometheus-${PROM_VER}.linux-amd64" "prometheus-${PROM_VER}.linux-amd64.tar.gz"
curl -fsSLO "https://github.com/prometheus/node_exporter/releases/download/v${NODE_VER}/node_exporter-${NODE_VER}.linux-amd64.tar.gz"
tar xzf "node_exporter-${NODE_VER}.linux-amd64.tar.gz"
install -m 0755 "node_exporter-${NODE_VER}.linux-amd64/node_exporter" /usr/local/bin/node_exporter
rm -rf "node_exporter-${NODE_VER}.linux-amd64" "node_exporter-${NODE_VER}.linux-amd64.tar.gz"
curl -fsSLO "https://github.com/grafana/loki/releases/download/v${LOKI_VER}/loki-linux-amd64.zip"
unzip -oq loki-linux-amd64.zip
install -m 0755 loki-linux-amd64 /usr/local/bin/loki
rm -f loki-linux-amd64 loki-linux-amd64.zip
useradd --system --no-create-home prometheus 2>/dev/null || true
mkdir -p /etc/prometheus /var/lib/prometheus /etc/loki /var/lib/loki /etc/grafana/provisioning/datasources
cp /opt/sif-monitor-assets/prometheus.yml /etc/prometheus/prometheus.yml
cp /opt/sif-monitor-assets/loki-config.yml /etc/loki/loki-config.yml
cp /opt/sif-monitor-assets/grafana-prometheus-datasource.yml /etc/grafana/provisioning/datasources/prometheus.yml
chown -R prometheus:prometheus /var/lib/prometheus
cat > /etc/systemd/system/prometheus.service <<'SVC'
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus --web.listen-address=0.0.0.0:9090 --storage.tsdb.retention.time=30d
Restart=always

[Install]
WantedBy=multi-user.target
SVC
cat > /etc/systemd/system/node-exporter.service <<'SVC'
[Unit]
Description=Node Exporter
After=network.target

[Service]
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
SVC
cat > /etc/systemd/system/loki.service <<'SVC'
[Unit]
Description=Loki
After=network.target

[Service]
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yml
Restart=always

[Install]
WantedBy=multi-user.target
SVC
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor >/usr/share/keyrings/grafana.gpg
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" >/etc/apt/sources.list.d/grafana.list
apt-get update -qq
apt-get install -y grafana
sed -i 's/^;admin_user = .*/admin_user = sifadmin/' /etc/grafana/grafana.ini
sed -i 's/^;admin_password = .*/admin_password = SIF_Grafana2024!/' /etc/grafana/grafana.ini
systemctl daemon-reload
systemctl enable --now prometheus node-exporter grafana-server loki
sleep 8
EOF
  remote "sif-monitor" "curl -sf http://127.0.0.1:9090/-/healthy && curl -sf http://127.0.0.1:3000/api/health && curl -sf http://127.0.0.1:3100/ready"
}

phase6_dashboard() {
  log "Phase 6: deploying sif-dashboard"
  copy_tree "${PROJECT_ROOT}/apps/sif-dashboard" "sif-dashboard" "/opt/sif-dashboard"
  run_sudo_script "sif-dashboard" <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y curl gnupg nginx
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v20'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
cd /opt/sif-dashboard
sudo -u sifadmin npm install --silent
sudo -u sifadmin npm run build
cat > /etc/systemd/system/sif-dashboard.service <<'SVC'
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
cat > /etc/nginx/sites-available/sif-dashboard <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sif-dashboard /etc/nginx/sites-enabled/sif-dashboard
nginx -t
systemctl daemon-reload
systemctl enable --now sif-dashboard nginx
sleep 8
EOF
  remote "sif-dashboard" "curl -sf http://127.0.0.1/ >/dev/null"
}

phase7_node_exporter() {
  log "Phase 7: installing node-exporter on remaining VMs"
  install_node_exporter "sif-core"
  install_node_exporter "sif-ai-engine"
  install_node_exporter "sif-dashboard"
  install_node_exporter "sif-client-host"
  install_node_exporter "sif-broker"
}

phase8_validate() {
  log "Phase 8: validating platform end to end"
  remote "sif-core" "curl -sf http://127.0.0.1:8000/health"
  remote "sif-ai-engine" "curl -sf http://127.0.0.1:8001/health"
  remote "sif-client-host" "curl -sf http://127.0.0.1:8500/health"
  remote "sif-monitor" "curl -sf http://127.0.0.1:9090/-/healthy"
  remote "sif-dashboard" "curl -sf http://127.0.0.1/ >/dev/null"

  local client_payload
  client_payload="$(remote "sif-core" "curl -sf -X POST 'http://127.0.0.1:8000/api/v1/clients/provision?name=TestCorp&email=test@testcorp.com'")"
  printf '%s\n' "${client_payload}"
  local client_id
  client_id="$(printf '%s' "${client_payload}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["client_id"])')"
  local client_subdomain
  client_subdomain="$(printf '%s' "${client_payload}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["subdomain"])')"
  remote "sif-client-host" "curl -sfL -H 'Host: ${client_subdomain}.marcbd.site' http://127.0.0.1/ >/dev/null"

  remote "sif-ai-engine" "curl -sf -X POST http://127.0.0.1:8001/detect -H 'Content-Type: application/json' -d '{\"features\":[0,10000,0,0,1500000,9800,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],\"source_ip\":\"192.168.100.50\",\"client_id\":\"${client_id}\"}'"
  remote "sif-core" "curl -sf -X POST http://127.0.0.1:8000/api/v1/threats/ingest -H 'Content-Type: application/json' -d '{\"client_id\":\"${client_id}\",\"attack_type\":\"DDoS\",\"source_ip\":\"10.0.0.99\",\"destination_ip\":\"172.16.185.97\",\"confidence\":0.96,\"trust_score\":0.12,\"action_taken\":\"block_ip\",\"model_version\":\"3.0.0-base\"}'"
  remote "sif-core" "curl -sf http://127.0.0.1:8000/api/v1/dashboard/overview"

  log "Final status summary"
  remote "sif-core" "python3 - <<'PY'
import json
import urllib.request

checks = [
    ('VM101 Core API', 'http://sif-core:8000/health'),
    ('VM102 AI Engine', 'http://sif-ai-engine:8001/health'),
    ('VM102 MLflow', 'http://sif-ai-engine:5000/'),
    ('VM103 Dashboard', 'http://sif-dashboard:80/'),
    ('VM201 Provisioner', 'http://sif-client-host:8500/health'),
    ('VM202 RabbitMQ Mgmt', 'http://sif-broker:15672/'),
    ('VM203 Prometheus', 'http://sif-monitor:9090/-/healthy'),
    ('VM203 Grafana', 'http://sif-monitor:3000/api/health'),
]
for name, url in checks:
    try:
        with urllib.request.urlopen(url, timeout=10):
            status = 'RUNNING'
    except Exception:
        status = 'OFFLINE'
    print(f'{name}: {status} ({url})')
PY"
}

main() {
  phase0_hosts
  phase1_broker
  phase2_core
  phase3_ai
  phase4_client_host
  phase5_monitor
  phase6_dashboard
  phase7_node_exporter
  phase8_validate
}

main "$@"
