#!/bin/bash
# Nova Mission Control Heartbeat Daemon
# 每 5 分钟推送一次状态，保持 Dashboard 在线

MC_URL="https://cmf-mission-control-production.up.railway.app/api/agents"
TOKEN="cmf-mc-token-2026"

while true; do
  curl -s -X POST "$MC_URL" \
    -H "Content-Type: application/json" \
    -H "x-api-token: $TOKEN" \
    -d '{
      "agent_id": "Nova",
      "status": "RUNNING",
      "current_task": "CMF system development & maintenance",
      "progress_pct": 75,
      "model": "claude-sonnet-4-6",
      "last_task": "Mission Control Phase 3 upgrade (v0.4.0)"
    }' > /dev/null 2>&1
  sleep 300
done
