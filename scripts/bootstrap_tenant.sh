#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

API_BASE="${API_BASE:-https://sif1.marcbd.site}"
SUPER_USER="${SUPER_USER:-admin}"
SUPER_PASS="${SUPER_PASS:-change-this-now}"
ORG_NAME="${ORG_NAME:-Acme Corp}"
ADMIN_EMAIL="${ADMIN_EMAIL:-soc@acme.example}"

echo "[1/3] Authenticating super admin..."
SUPER_TOKEN="$(curl -fsS -X POST "${API_BASE}/auth/super/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${SUPER_USER}\",\"password\":\"${SUPER_PASS}\"}" | jq -r '.token')"

if [[ -z "${SUPER_TOKEN}" || "${SUPER_TOKEN}" == "null" ]]; then
  echo "Super login failed" >&2
  exit 1
fi

echo "[2/3] Creating tenant..."
TENANT_JSON="$(curl -fsS -X POST "${API_BASE}/super/tenants" \
  -H "Authorization: Bearer ${SUPER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"organization_name\":\"${ORG_NAME}\",\"admin_email\":\"${ADMIN_EMAIL}\"}")"

TENANT_ID="$(echo "${TENANT_JSON}" | jq -r '.tenant_id')"
TENANT_API_TOKEN="$(echo "${TENANT_JSON}" | jq -r '.api_token')"

if [[ -z "${TENANT_ID}" || "${TENANT_ID}" == "null" ]]; then
  echo "Tenant creation failed: ${TENANT_JSON}" >&2
  exit 1
fi

echo "[3/3] Verifying tenant login..."
TENANT_LOGIN="$(curl -fsS -X POST "${API_BASE}/auth/tenant/login" \
  -H 'Content-Type: application/json' \
  -d "{\"tenant_id\":\"${TENANT_ID}\",\"api_token\":\"${TENANT_API_TOKEN}\"}")"
TENANT_TOKEN="$(echo "${TENANT_LOGIN}" | jq -r '.token')"

if [[ -z "${TENANT_TOKEN}" || "${TENANT_TOKEN}" == "null" ]]; then
  echo "Tenant login failed: ${TENANT_LOGIN}" >&2
  exit 1
fi

echo "Tenant bootstrap complete."
echo "TENANT_ID=${TENANT_ID}"
echo "TENANT_API_TOKEN=${TENANT_API_TOKEN}"
echo "TENANT_JWT=${TENANT_TOKEN}"

