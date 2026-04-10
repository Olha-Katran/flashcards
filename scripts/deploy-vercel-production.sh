#!/usr/bin/env bash
# Deploy latest GitHub state to Vercel production (client + server).
# Prerequisites: `vercel login` done; each app linked once (`vercel link` in client/ and server/).
# Usage: from repo root —  ./scripts/deploy-vercel-production.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Vercel account"
vercel whoami

echo "==> Pull latest from GitHub"
git fetch origin
BRANCH="${DEPLOY_BRANCH:-main}"
git pull origin "$BRANCH"

echo "==> Current commit (deployed source of truth)"
git log -1 --oneline

echo "==> Deploy client (production)"
(cd "$ROOT/client" && npx vercel --prod --yes)

echo "==> Deploy server (production)"
(cd "$ROOT/server" && npx vercel --prod --yes)

echo "==> Done. Verify in Vercel dashboard that both projects show this commit:"
git rev-parse HEAD
