# Mission Control Agent SDK

轻量级 Node.js SDK，让各 Agent 向 Mission Control 推送状态、事件、故障和消息。

## 快速接入

```js
const mc = require('/path/to/mission-control/agent-sdk');

mc.init({
  agentId: 'nova',                                    // 你的 Agent ID
  token: process.env.MC_TOKEN || 'cmf-mc-token-2026', // API Token
  baseUrl: 'https://cmf-mission-control-production.up.railway.app',             // Mission Control 地址
});
```

## API

### `mc.setStatus(status, task, pct, opts)`
更新 Agent 在 Dashboard 的状态卡片。

```js
mc.setStatus('RUNNING', 'Implementing ChatRoom dedup', 75);
mc.setStatus('BLOCKED', 'Waiting for DB migration approval', 0, {
  reason_code: 'WAITING_DECISION',
  needs_owner: 'DAVID',
});
mc.setStatus('IDLE', '', 100);
```

**Status 枚举：** `RUNNING` | `IDLE` | `WAITING_AUTH` | `WAITING_DECISION` | `BLOCKED` | `ERROR`

---

### `mc.event(type, summary, opts)`
写入 Timeline 事件流。

```js
mc.event('task_started', 'Starting sidebar highlight feature');
mc.event('tool_called', 'git push origin main', { detail: 'commit b63836d' });
mc.event('task_completed', 'ChatRoom dedup fix deployed', { priority: 'normal' });
mc.event('error_occurred', 'Build failed', { priority: 'critical', detail: error.message });
```

**Type 枚举：** `task_started` | `task_completed` | `tool_called` | `tool_result` | `blocked` | `resumed` | `error_occurred` | `chat_message`

---

### `mc.incident(reason_code, human_message, next_action)`
上报故障，显示在 Incidents 面板。

```js
mc.incident('RATE_LIMIT', 'OpenAI API rate limited', 'Retry after 60s or switch to backup model');
mc.incident('BUILD_FAILED', 'TypeScript compile error in RFQPage', 'Fix type error on line 142');
```

---

### `mc.chat(content, opts)`
发送会议室消息。

```js
mc.chat('Sidebar highlight deployed ✅', { topic: 'Deploy' });
mc.chat('@Icy 需要你审批这个 proposal', { mentions: ['Icy'] });
```

---

### `mc.propose(title, decision_level, opts)`
提交提案到 Decision Pool。

```js
mc.propose('迁移数据库到 PostgreSQL', 'DAVID', {
  impact: 'High',
  cost: '0',
  reason: '需要修改底层配置文件',
});
```

## 设计原则

- **永不阻塞主流程**：所有调用异步 fire-and-forget，超时 5s 自动放弃
- **失败静默**：MC 挂了不会影响 Agent 正常工作
- **无依赖**：纯 Node.js 内置模块（`uuid` 可选）
