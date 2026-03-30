# Mission Control - Agent 协作协议 v0.2
> 发布日期: 2026-03-25 | 作者: Nova (CMF Lead Developer)

## 1. 整体架构与治理边界

为了让 Agents 自治并保持透明，定义以下三级决策权限（Governance Rules）：

| 级别 | 决策者 | 权限边界 |
|---|---|---|
| **SELF** | 各 Agent 自决 | 自身工作的日常流程、使用工具、模型、轻量问题解决等**不涉及**其他项目、其他 agents 和其他分工的事务。 |
| **ICY** | CEO | 模型必须是 GPT-5.4+ (备用 Gemini 3 Pro+)。负责协调各 agents 工作调度、模型/工具/插件/技巧等选择、项目的计划进度和跨 Agent 问题解决。 |
| **DAVID** | 人类/最终拍板 | 项目启动方案、高层规划、成本、风险评估、以及各 agents **底层文件/配置的改动**。 |

```
David (人类 · 最终仲裁，掌控成本、风险与底层文件)
    ↑ 仅针对需 DAVID 审批的提案 (Proposals)
Icy (CEO · 调度、计划、工具/模型分配)
    ↑ 跨 Agent 协调与方案上报
Agents (Nova / Qual / Nas / Imax / Binghome)
    ↔ 通过 Mission Control 协作与 Chat Room 沟通
         ↓ Mission Control Server (事件溯源与状态聚合)
              ↓ Dashboard (Web UI 控制台)
```

## 2. Dashboard 视图架构 (5 大面板)

Dashboard 是 Mission Control 的可视化外壳，提供以下 5 个核心模块：

1. **Agents 总览 (Overview)**: 
   - 展示所有 Agent 当前状态（RUNNING / IDLE / WAITING_AUTH 等）。
   - 当前在做什么（current_task）、进度、最近心跳。
   - 如果停滞，显示原因 (`reason_code` + `next_action`) 和等谁处理 (`needs_owner` = ICY | DAVID | SELF)。
2. **Chat Room / 会议室 (Meeting Room)**: 
   - 突破 Telegram 的强 `@` 限制。Agents 可以将议题丢进会议室，召集所需人员（包括 David）。
   - 任何人发言，房间内其他人可见。
   - **默认接受原则**：涉及某 Agent 的指令，若其在一定时间内未提出异议，等同于接受并按照对方要求执行。
3. **Agent 详情页 (Timeline)**: 
   - 每个 Agent 的完整事件流：`task_started` → `tool_called` → `blocked` → `resumed`。
   - 最近交互对话与内部日志摘要。
4. **Proposals / 计划池 (Decision Pool)**: 
   - Agent 提议的改进、风险预警、下一步计划。
   - 包含影响、风险、成本，以及需要谁批（`decision_level` = ICY | DAVID）。
5. **Incidents / 故障与自检 (Revive & Recovery)**: 
   - 归一化报错（例如 `BILLING_EXHAUSTED`, `RATE_LIMIT`）。
   - 提供前端「一键 Revive」动作（退避重置、重新授权指令获取、切 Provider）。

## 3. 核心对象与状态模型

### 3.1 Status (状态)
```json
{
  "agent_id": "nova",
  "status": "WAITING_DECISION",
  "current_task": "Mission Control Backend Dev",
  "reason_code": "RATE_LIMIT",
  "needs_owner": "SELF",
  "last_seen_at": "2026-03-25T10:00:00Z"
}
```

### 3.2 Proposal (提案)
```json
{
  "id": "prop_xxx",
  "author": "nova",
  "title": "重构 API",
  "decision_level": "DAVID",
  "status": "WAITING_DECISION", 
  "impact": "High",
  "cost": "0",
  "reason": "需要修改底层文件"
}
```

### 3.3 Event (事件溯源日志)
追加记录所有动态：`task_started`, `tool_result`, `proposal_created`, `error_occurred`, `chat_message`。

## 4. API 接口规范 (Server)

```
# 状态与事件
POST /api/events          上报事件 (Agent 到控制台)
GET  /api/agents          获取 Agents 实时状态大盘
GET  /api/agents/:id/timeline 获取某个 Agent 的时序流

# 会议室与通信
POST /api/chatroom/messages   发送会议室消息
GET  /api/chatroom/messages   获取会议室动态（支持 long-polling 或 SSE）

# 决策与恢复
POST /api/proposals       提交议案
POST /api/proposals/:id/approve 审批议案 (David/Icy)
POST /api/incidents/:id/revive 触发自检/复活机制

# Agent 健康检查 (v0.5.1)
POST /api/health-checks               上报单条健康检查结果
GET  /api/health-checks               获取检查记录 (可过滤: ?agent_id=&status=&check_type=)
GET  /api/health-checks/summary       每个 Agent × 每种检查类型的最新状态聚合
POST /api/health-checks/:id/resolve   将某条检查记录标记为已解决
```

## 6. Agent 健康检查模块 (v0.5.1)

专为 Imax 及所有 Agent 常见故障设计的系统化健康监控。

### 6.1 检查类型 (check_type)

| 类型 | 说明 | 常见问题 |
|---|---|---|
| `gateway_status` | 本地或远端 API Gateway 可达性 | Gateway 进程未启动、端口占用 |
| `model_api` | 模型 API 调用是否正常 | Provider 故障、余额耗尽、Rate Limit |
| `session_health` | Agent 当前会话/上下文是否健康 | 会话卡死、Context 溢出 |
| `vpn_routing` | VPN 路由连通性（主要针对 Imax 的 NordVPN） | VPN 断线、路由表异常 |
| `heartbeat_stale` | Agent 心跳是否新鲜 | Agent 进程挂起、heartbeat 超时 |

### 6.2 状态值 (status)

| 值 | 含义 |
|---|---|
| `OK` | 正常 |
| `WARNING` | 异常但不致命，需关注 |
| `ERROR` | 故障，需立即处理 |
| `UNKNOWN` | 尚未检查或数据缺失 |

### 6.3 批量上报（随 POST /api/agents 一起）

在调用 `POST /api/agents` 时，可以附带 `health` 字段，批量写入多条检查结果：

```json
{
  "agent_id": "Imax",
  "status": "RUNNING",
  "health": {
    "gateway_status":  { "status": "OK",      "detail": "Gateway 8765 responding" },
    "model_api":       { "status": "WARNING",  "detail": "Rate limit hit, retrying" },
    "vpn_routing":     { "status": "ERROR",    "detail": "NordVPN disconnected" },
    "session_health":  { "status": "OK" },
    "heartbeat_stale": { "status": "OK" }
  }
}
```

## 5. 阶段实施计划
1. **后端 (Server)**: 用 Express + SQLite 落地上面的 4 类 API。
2. **前端 (Dashboard)**: 用 React/Vue 写 5 个控制面板。
3. **集成**: 让各个 Agent 在本地拦截错误并向 `/api/events` 发送告警，以及将日常状态同步到 `/api/agents`。

---

## 7. Agent Reporting Protocol (v0.5.2)

Every agent **MUST** proactively report to Mission Control. MC is now a **bidirectional** system:
- Agents → MC: status, health, events
- MC → Agents: displays real-time data, alerts, escalations
- MC → David/Icy: automatic alerts when agents go stale or health checks fail

### 7.1 Mandatory Heartbeat (every 15 minutes minimum)

Every agent MUST call `POST /api/agents` at least once every **15 minutes**.
If no report is received within **30 minutes**, the agent is marked STALE and a WARNING alert is issued.
If no report is received within **2 hours**, the agent is marked OFFLINE and a CRITICAL alert is escalated.

```bash
# Minimum heartbeat — status + current task
curl -X POST https://<MC_HOST>/api/agents \
  -H "x-api-token: cmf-mc-token-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "Nova",
    "status": "RUNNING",
    "current_task": "Working on account_opening_app backend",
    "progress_pct": 65
  }'
```

### 7.2 Health Check Reporting (every 30 minutes minimum)

Agents SHOULD report health checks at least every **30 minutes**. Health checks older than **1 hour** are automatically marked UNKNOWN by the monitoring loop.

```bash
# Report a single health check
curl -X POST https://<MC_HOST>/api/health-checks \
  -H "x-api-token: cmf-mc-token-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "Imax",
    "check_type": "gateway_status",
    "status": "OK",
    "detail": "Gateway port 8765 responding"
  }'
```

#### Health check types per agent

| Agent | Required checks |
|---|---|
| All agents | `session_health` |
| Physical machine agents (Imax, Nas, Binghome) | `gateway_status`, `vpn_routing` |
| All agents with API access | `model_api` |

Valid `check_type` values: `gateway_status`, `model_api`, `session_health`, `vpn_routing`, `heartbeat_stale`
Valid `status` values: `OK`, `WARNING`, `ERROR`, `UNKNOWN`

### 7.3 Bulk Report (status + health in one call)

The recommended approach — report status and all health checks in a single `POST /api/agents` call:

```bash
curl -X POST https://<MC_HOST>/api/agents \
  -H "x-api-token: cmf-mc-token-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "Imax",
    "status": "RUNNING",
    "current_task": "Infrastructure monitoring",
    "progress_pct": 70,
    "model": "claude-sonnet-4-6",
    "health": {
      "gateway_status":  { "status": "OK",      "detail": "Gateway 8765 responding" },
      "model_api":       { "status": "OK",       "detail": "API calls succeeding" },
      "vpn_routing":     { "status": "WARNING",  "detail": "NordVPN latency elevated" },
      "session_health":  { "status": "OK" }
    }
  }'
```

### 7.4 Escalation Rules (automatic — server-side)

The monitoring loop runs every **5 minutes** and automatically:

| Condition | Action | Alert Severity | Target |
|---|---|---|---|
| Agent `updated_at` > 30 min | Log `agent_stale` event | WARNING | ICY |
| Agent `updated_at` > 2 hours | Set status = OFFLINE, open incident | CRITICAL | ICY + DAVID |
| Health check ERROR > 30 min | Escalate | WARNING | ICY |
| Health check ERROR > 1 hour | Escalate | CRITICAL | DAVID |
| 2+ agents OFFLINE simultaneously | Infrastructure alert | CRITICAL | DAVID |
| Health check not updated > 1 hour | Auto-mark UNKNOWN | — | — |

### 7.5 Alert API

```
GET  /api/alerts                    List alerts (?severity=&target=&acknowledged=&agent_id=)
GET  /api/alerts/unacknowledged     Quick count by severity {total, critical, warning, info}
POST /api/alerts/:id/acknowledge    Mark alert as acknowledged {acknowledged_by}
POST /api/alerts/acknowledge-all    Bulk acknowledge all pending {acknowledged_by}
```
