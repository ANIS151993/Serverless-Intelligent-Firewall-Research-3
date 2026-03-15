#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VM_USER="sifadmin"
VM_PASS='MARC@151995$'

declare -Ar VM_IPS=(
  [sif-core]="172.16.185.97"
  [sif-ai-engine]="172.16.185.230"
  [sif-dashboard]="172.16.185.234"
  [sif-client-host]="172.16.185.231"
  [sif-broker]="172.16.185.236"
  [sif-monitor]="172.16.185.167"
)

ssh_opts=(
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/root/.ssh/known_hosts
  -o ConnectTimeout=15
)

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

remote() {
  local host="$1"
  shift
  sshpass -p "${VM_PASS}" ssh "${ssh_opts[@]}" "${VM_USER}@${VM_IPS[$host]}" "$@"
}

sudo_remote() {
  local host="$1"
  shift
  local command="$*"
  printf '%s\n' "${VM_PASS}" | sshpass -p "${VM_PASS}" ssh "${ssh_opts[@]}" "${VM_USER}@${VM_IPS[$host]}" "sudo -S -p '' bash -lc $(printf '%q' "${command}")"
}

run_sudo_script() {
  local host="$1"
  {
    printf '%s\n' "${VM_PASS}"
    cat
  } | sshpass -p "${VM_PASS}" ssh "${ssh_opts[@]}" "${VM_USER}@${VM_IPS[$host]}" "sudo -S -p '' bash -s"
}

copy_tree() {
  local src="$1"
  local host="$2"
  local dest="$3"
  local tmp="/home/${VM_USER}/.codex-deploy/$(basename "${dest}").$$"

  remote "${host}" "mkdir -p /home/${VM_USER}/.codex-deploy"
  sshpass -p "${VM_PASS}" scp "${ssh_opts[@]}" -r "${src}" "${VM_USER}@${VM_IPS[$host]}:${tmp}"
  sudo_remote "${host}" "rm -rf '${dest}' && mkdir -p '$(dirname "${dest}")' && mv '${tmp}' '${dest}' && chown -R ${VM_USER}:${VM_USER} '${dest}'"
}

append_hosts_block() {
  local host="$1"
  run_sudo_script "${host}" <<'EOF'
grep -q "^# === SIF Platform VM Registry ===$" /etc/hosts || cat >> /etc/hosts <<'HOSTS'

# === SIF Platform VM Registry ===
172.16.185.97   sif-core
172.16.185.230  sif-ai-engine
172.16.185.234  sif-dashboard
172.16.185.231  sif-client-host
172.16.185.236  sif-broker
172.16.185.167  sif-monitor
HOSTS
EOF
}

install_node_exporter() {
  local host="$1"
  run_sudo_script "${host}" <<'EOF'
set -euo pipefail
NODE_VER="1.8.2"
if ! command -v node_exporter >/dev/null 2>&1; then
  cd /tmp
  curl -fsSLO "https://github.com/prometheus/node_exporter/releases/download/v${NODE_VER}/node_exporter-${NODE_VER}.linux-amd64.tar.gz"
  tar xzf "node_exporter-${NODE_VER}.linux-amd64.tar.gz"
  install -m 0755 "node_exporter-${NODE_VER}.linux-amd64/node_exporter" /usr/local/bin/node_exporter
  rm -rf "node_exporter-${NODE_VER}.linux-amd64" "node_exporter-${NODE_VER}.linux-amd64.tar.gz"
fi
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
systemctl daemon-reload
systemctl enable --now node-exporter
EOF
}
