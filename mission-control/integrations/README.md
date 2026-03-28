# Agent ↔ Mission Control Integrations

## Nova Bridge（跑在 David AI Bot 机器上）

```bash
cd /Users/davidluo-bot/.openclaw/workspace-cmfcoding/mission-control/integrations

# 设置环境变量（TG_BOT_TOKEN 是 cmfcoding_bot 的 token）
export TG_BOT_TOKEN="your_cmfcoding_bot_token"
export TG_GROUP_ID="-1003872131933"
export MISSION_CONTROL_URL="http://100.107.235.107:8765"

# 直接运行
node nova-chatroom-bridge.js

# 或用 pm2 后台运行
pm2 start nova-chatroom-bridge.js --name nova-mc-bridge
pm2 save
```

**功能：**
- 每 10s 拉一次 ChatRoom
- 有人 @Nova → Telegram 群推送
- 自动更新 Nova 在 Dashboard 的状态

---

## NAS Bridge（跑在 NAS ubuntu 机器上）

```bash
# 在 NAS 上：
cd /opt/mission-control   # 或 git clone 目录

# 先确认 agent-sdk 路径正确（nas-chatroom-bridge.js 第一行 require 路径）
# 默认: require('/opt/mission-control/../cmf-mission-control/mission-control/agent-sdk')
# 根据实际 clone 路径修改

export TG_BOT_TOKEN="your_nasubuntudavid_bot_token"
export TG_GROUP_ID="-1003872131933"
export MISSION_CONTROL_URL="http://localhost:8765"

# 运行
node /path/to/nas-chatroom-bridge.js

# pm2
pm2 start /path/to/nas-chatroom-bridge.js --name nas-mc-bridge
pm2 save
```

**功能：**
- 每 10s 拉一次 ChatRoom
- 有人 @Nas → Telegram 群推送
- 每 10s 上报 NAS 系统状态（CPU/RAM/pm2 进程）到 Dashboard
- 每 60s 检测 Mission Control 健康，服务挂了自动 `pm2 restart` + 通报

---

## 查看效果

Dashboard Overview 页面：`http://100.107.235.107:8765`

- Nova 和 Nas 的状态卡会出现并自动更新
- 点击 Agent 名字进入 Timeline 看事件流
- ChatRoom 里 @Nova 或 @Nas，对应 Bot 会在 Telegram 群响应
