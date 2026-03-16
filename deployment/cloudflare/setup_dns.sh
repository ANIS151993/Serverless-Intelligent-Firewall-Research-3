#!/bin/bash
# ASLF-OSINT Platform — Cloudflare DNS Setup
# Creates flat sif-*.marcbd.site CNAME records routed through SIF-Server1 tunnel
set -e

CF_ZONE_ID="c28f949c288e78fd1aef68077f243775"
CF_API_TOKEN="CC5bm9asbWxJPnZHtx6bMzEF7eA4Vu3HdSkNwMD_"
CF_ACCOUNT_ID="d727f0b7d4497e7e2a4e0f6f8cb409b4"
SIF_TUNNEL_ID="21416f75-a923-4bb7-863b-f025916b8d2a"
TUNNEL_CNAME="${SIF_TUNNEL_ID}.cfargotunnel.com"

add_or_update() {
  local name="$1"
  echo -n "  [DNS] ${name}.marcbd.site → tunnel ... "
  result=$(curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${TUNNEL_CNAME}\",\"proxied\":true}")
  if echo "$result" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin)['success'] else 1)" 2>/dev/null; then
    echo "CREATED"
  else
    record_id=$(curl -sf "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${name}.marcbd.site&type=CNAME" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" | \
      python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d['result'] else '')" 2>/dev/null)
    [ -n "$record_id" ] && \
      curl -sf -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
        --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${TUNNEL_CNAME}\",\"proxied\":true}" > /dev/null && \
      echo "UPDATED" || echo "FAIL"
  fi
}

echo "ASLF-OSINT Platform — Cloudflare DNS Setup"
add_or_update "sif-api"
add_or_update "sif-ai"
add_or_update "sif-mlflow"
add_or_update "sif-monitor"
add_or_update "sif-prometheus"
add_or_update "sif-broker"
# Note: sif-admin.marcbd.site (Super Dashboard) is managed by its own tunnel

echo ""
echo "Platform URLs:"
echo "  https://sif-admin.marcbd.site       — Super Dashboard"
echo "  https://sif-api.marcbd.site/docs    — Core API Swagger"
echo "  https://sif-ai.marcbd.site/docs     — AI Engine Swagger"
echo "  https://sif-mlflow.marcbd.site      — MLflow"
echo "  https://sif-monitor.marcbd.site     — Grafana"
echo "  https://sif-prometheus.marcbd.site  — Prometheus"
echo "  https://sif-broker.marcbd.site      — RabbitMQ"
echo "  https://{subdomain}.marcbd.site     — Client Dashboards"
