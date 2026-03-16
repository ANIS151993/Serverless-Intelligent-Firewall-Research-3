#!/bin/bash
# ASLF-OSINT Platform — Cloudflare DNS Setup
# Sets up all subdomain routes for sif.marcbd.site
set -e

CF_ZONE_ID="c28f949c288e78fd1aef68077f243775"
CF_API_TOKEN="CC5bm9asbWxJPnZHtx6bMzEF7eA4Vu3HdSkNwMD_"

add_record() {
  local name="$1" ip="$2" proxied="${3:-true}"
  echo -n "  [DNS] ${name}.sif.marcbd.site → ${ip} ... "
  result=$(curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"${name}.sif\",\"content\":\"${ip}\",\"proxied\":${proxied},\"ttl\":1}" \
    2>/dev/null)
  if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d['success'] else 1)" 2>/dev/null; then
    echo "OK"
  else
    # Try to update existing record
    record_id=$(curl -sf "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${name}.sif.marcbd.site&type=A" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" 2>/dev/null | \
      python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d['result'] else '')" 2>/dev/null)
    if [ -n "$record_id" ]; then
      curl -sf -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record_id}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "{\"type\":\"A\",\"name\":\"${name}.sif\",\"content\":\"${ip}\",\"proxied\":${proxied},\"ttl\":1}" > /dev/null 2>&1
      echo "UPDATED"
    else
      echo "FAIL (check token/zone)"
    fi
  fi
}

echo "=============================================="
echo " ASLF-OSINT Platform — Cloudflare DNS Setup  "
echo "=============================================="
echo ""
echo "Setting up SIF Platform DNS routes..."
echo ""

add_record "dashboard"   "172.16.185.234"   # VM103 Next.js Dashboard
add_record "api"         "172.16.185.97"    # VM101 Core API
add_record "ai"          "172.16.185.230"   # VM102 AI Engine
add_record "mlflow"      "172.16.185.230"   # VM102 MLflow
add_record "monitor"     "172.16.185.167"   # VM203 Grafana
add_record "prometheus"  "172.16.185.167"   # VM203 Prometheus
add_record "broker"      "172.16.185.236"   # VM202 RabbitMQ Management

echo ""
echo "=============================================="
echo " Platform URLs:"
echo "  https://dashboard.sif.marcbd.site  (Super Dashboard)"
echo "  https://api.sif.marcbd.site/docs   (Core API Swagger)"
echo "  https://ai.sif.marcbd.site/docs    (AI Engine Swagger)"
echo "  https://mlflow.sif.marcbd.site     (MLflow)"
echo "  https://monitor.sif.marcbd.site    (Grafana)"
echo "  https://broker.sif.marcbd.site     (RabbitMQ)"
echo "  GitHub: https://github.com/ANIS151993/Serverless-Intelligent-Firewall-Research-3"
echo "=============================================="
