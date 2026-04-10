#!/usr/bin/env bash
# Smoke-test the deployed API. After redeploying the server, /api/shared-groups should return JSON (not 404).
set -euo pipefail
API="${1:-https://server-blond-five-62.vercel.app}"
echo "==> $API/health"
curl -sS "$API/health"
echo ""
echo "==> $API/api/shared-groups?level=A1 (expect 200 + JSON array after latest deploy)"
code=$(curl -sS -o /tmp/sg.json -w "%{http_code}" "$API/api/shared-groups?level=A1")
echo "HTTP $code"
head -c 300 /tmp/sg.json
echo ""
