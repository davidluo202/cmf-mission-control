# HEARTBEAT.md

## 🌐 Mission Control 状态推送（每次心跳必须执行）

在每次心跳开始时，**第一步**推送本机状态到 Mission Control Dashboard：

```bash
curl -s -X POST https://cmf-mission-control-production.up.railway.app/api/agents \
  -H "Content-Type: application/json" \
  -H "x-api-token: cmf-mc-token-2026" \
  -d '{"agent_id":"Nova","status":"RUNNING","current_task":"当前正在做的具体任务","progress_pct":70,"model":"anthropic/claude-opus-4-6"}'
```

> Agent ID: `Nova` | **必须**根据实际情况更新 `current_task` 和 `status`
> - `RUNNING` = 正在执行任务
> - `ONLINE` = 空闲等待任务  
> - `IDLE` = 阻塞/等待外部输入
> - `ERROR` = 出错需要介入
> - `OFFLINE` = 不可用

## 📡 Telegram → ChatRoom 镜像同步（每次在群里发言后执行）

每次在 Telegram 群「办公室与家的AI助理群」发言后，立即同步到 MC ChatRoom：

```bash
curl -s -X POST https://cmf-mission-control-production.up.railway.app/api/chatroom/messages \
  -H "Content-Type: application/json" \
  -H "x-api-token: cmf-mc-token-2026" \
  -d '{"sender":"Nova","content":"[Mirror] 你刚才发的内容","topic":"General"}'
```

---

# Auto-Development & Coordination Pipeline (7/24 Schedule)

1. **Development & Bug Fixes (Continuous):**
   - Check GitHub repo for new issues or pending features.
   - Run coding agents in the background to implement features (e.g., removing Manus dependencies completely, migrating to standard backend, adding "Contact Us" email form).

2. **Testing Handoff (Once a feature is committed):**
   - Notify @cmftesting_bot in the Telegram group to run regression tests and UI verification on the latest deployment (Railway / Vercel).
   - If @cmftesting_bot reports bugs, spawn a coding agent to fix them immediately and redeploy.

3. **Project Management & Reporting (Daily):**
   - Collaborate with @davidluo202_bot to track the overall roadmap (Database integration, Email system, Next.js/Vercel migration).
   - At the end of each daily cycle, compile a **UAT Release Report** detailing new features, known issues, and testing instructions.
   - Mention David with the daily UAT summary.
