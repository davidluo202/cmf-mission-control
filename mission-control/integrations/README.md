# Agent ↔ Mission Control Integrations

## 架构概览

```
David AI Bot (Mac)          NAS Ubuntu VM
   Nova bridge                Nas bridge
       ↓                          ↓
       └──────────┬───────────────┘
                  ↓
         Mission Control API
         (NAS :8765 or Railway)
                  ↓
            Dashboard UI
```

---

## 所有 Agent 接入状态

| Agent | 机器 | Bridge 脚本 | 状态 |
|-------|------|------------|------|
| Nova  | David AI Bot (Mac) | nova-mc-reporter.js | ⏳ 待启动 |
| Nas   | NAS Ubuntu VM      | nas-chatroom-bridge.js | ⏳ 待 NAS 启动 |
| Icy   | (TBD)              | generic-agent-bridge.js | ⏳ 待确认机器 |
| Qual  | (TBD)              | generic-agent-bridge.js | ⏳ 待确认机器 |
| Imax  | (TBD)              | generic-agent-bridge.js | ⏳ 待确认机器 |

---

## Nova Bridge（David AI Bot 机器）

```bash
cd /Users/davidluo-bot/.openclaw/workspace-cmfcoding/mission-control/integrations

# Nova reporter — 读取 session 日志推状态
MC_URL=http://100.107.235.107:8765 \
MC_TOKEN=cmf-mc-token-2026 \
node nova-mc-reporter.js

# 或 pm2
MC_URL=http://100.107.235.107:8765 \
pm2 start nova-mc-reporter.js --name nova-mc-reporter
pm2 save
```

---

## NAS Bridge（NAS Ubuntu VM）

```bash
# 确认 agent-sdk 路径（nas-chatroom-bridge.js 第1行 require）
# 然后：

export TG_BOT_TOKEN="<nasubuntudavid_bot token>"
export TG_GROUP_ID="-1003872131933"
export MISSION_CONTROL_URL="http://localhost:8765"

pm2 start nas-chatroom-bridge.js --name nas-mc-bridge
pm2 save
```

**功能：**
- @Nas 提及 → Telegram 通知
- 上报 CPU/RAM/pm2 状态
- 每 60s 健康检查，服务挂了自动重启

---

## Icy / Qual / Imax Bridge（通用模板）

用 `generic-agent-bridge.js`，只需设环境变量：

```bash
# Icy
AGENT_ID=Icy \
TG_BOT_TOKEN="<icy_bot_token>" \
MC_URL=http://100.107.235.107:8765 \
SESSION_DIR="/path/to/.openclaw/agents/icy-ai/sessions" \
INITIAL_STATUS=IDLE \
INITIAL_TASK="Monitoring team and coordinating tasks" \
pm2 start generic-agent-bridge.js --name icy-mc-bridge

# Qual
AGENT_ID=Qual \
TG_BOT_TOKEN="<qual_bot_token>" \
MC_URL=http://100.107.235.107:8765 \
INITIAL_STATUS=IDLE \
INITIAL_TASK="Awaiting PRs for review and testing" \
pm2 start generic-agent-bridge.js --name qual-mc-bridge

# Imax
AGENT_ID=Imax \
TG_BOT_TOKEN="<imax_bot_token>" \
MC_URL=http://100.107.235.107:8765 \
INITIAL_STATUS=IDLE \
INITIAL_TASK="Awaiting deployment instructions" \
pm2 start generic-agent-bridge.js --name imax-mc-bridge
```

---

## Mission Control 迁移到 Railway（推荐）

目前 MC 只在 NAS Tailscale 内网，Nova/Icy/Qual/Imax 所在机器连不到。
建议部署到 Railway 获得公网地址：

1. 在 Railway 创建项目
2. 连接 GitHub `davidluo202/cmf-mission-control`
3. 设置 Root Directory = `mission-control/server`
4. 设置环境变量：
   - `API_TOKEN` = `cmf-mc-token-2026`（或更安全的新 token）
5. 部署完成后把 Railway URL 填入所有 bridge 的 `MC_URL`
