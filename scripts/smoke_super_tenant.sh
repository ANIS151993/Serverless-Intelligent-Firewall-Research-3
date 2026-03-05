#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

API_BASE="${API_BASE:-https://sif1.marcbd.site}"
SUPER_USER="${SUPER_USER:-admin}"
SUPER_PASS="${SUPER_PASS:-change-this-now}"

echo "[1/7] health"
curl -fsS "${API_BASE}/health" | jq

echo "[2/7] super login"
SUPER_TOKEN="$(curl -fsS -X POST "${API_BASE}/auth/super/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${SUPER_USER}\",\"password\":\"${SUPER_PASS}\"}" | jq -r '.token')"

echo "[3/7] create tenant"
TENANT_JSON="$(curl -fsS -X POST "${API_BASE}/super/tenants" \
  -H "Authorization: Bearer ${SUPER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"organization_name":"Smoke Test Org","admin_email":"soc@example.com"}')"
TENANT_ID="$(echo "${TENANT_JSON}" | jq -r '.tenant_id')"
TENANT_API_TOKEN="$(echo "${TENANT_JSON}" | jq -r '.api_token')"

echo "[4/7] tenant login"
TENANT_TOKEN="$(curl -fsS -X POST "${API_BASE}/auth/tenant/login" \
  -H 'Content-Type: application/json' \
  -d "{\"tenant_id\":\"${TENANT_ID}\",\"api_token\":\"${TENANT_API_TOKEN}\"}" | jq -r '.token')"

echo "[5/7] event evaluate"
curl -fsS -X POST "${API_BASE}/tenant/${TENANT_ID}/events" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "event_id":"evt-smoke-001",
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
  }' | jq '.decision'

echo "[6/7] tenant dashboard"
curl -fsS "${API_BASE}/tenant/${TENANT_ID}/dashboard" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" | jq '.tenant.tenant_id'

echo "[7/7] super audit"
curl -fsS "${API_BASE}/super/audit?tenant_id=${TENANT_ID}&limit=10" \
  -H "Authorization: Bearer ${SUPER_TOKEN}" | jq '.events | length'

echo "Smoke flow successful for tenant ${TENANT_ID}"

