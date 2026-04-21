#!/usr/bin/env bash
set -euo pipefail

# Mission Control NAS deploy
# Usage:
#   bash scripts/nas-deploy.sh

REPO_URL="https://github.com/davidluo202/cmf-mission-control.git"
BASE_DIR="/home/davidluo20/cmf-mission-control-server"
API_PORT="8765"
WEB_PORT="8077"
API_TOKEN="cmf-mc-token-2026"

if [ ! -d "$BASE_DIR/.git" ]; then
  rm -rf "$BASE_DIR"
  git clone "$REPO_URL" "$BASE_DIR"
else
  cd "$BASE_DIR"
  git pull --rebase
fi

cd "$BASE_DIR/mission-control"

# deps
cd server
npm ci

cd ../client
npm ci
npm run build

# pm2
command -v pm2 >/dev/null 2>&1 || npm i -g pm2

# API
cd ../server
export PORT="$API_PORT"
export BIND_HOST="0.0.0.0"
export API_TOKEN="$API_TOKEN"
export DATA_DIR="$BASE_DIR/mission-control/server/data"

pm2 delete mission-control-api >/dev/null 2>&1 || true
pm2 start index.js --name mission-control-api

# WEB (vite preview)
cd ../client
pm2 delete mission-control-web >/dev/null 2>&1 || true
pm2 start "npm run preview -- --host 0.0.0.0 --port $WEB_PORT" --name mission-control-web

pm2 save

echo "API: http://100.107.235.107:$API_PORT/"
echo "Dashboard: http://100.107.235.107:$WEB_PORT/"
