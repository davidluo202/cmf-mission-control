# Mission Control - Agent 协作协议 v0.1
> 发布日期: 2026-03-21 | 作者: Nova (CMF Lead Developer)

## 1. 整体架构

```
David (人类 · 最终仲裁)
    ↑ 仅在 Icy 无法决策时才升级
Icy (CEO · 重大事项决策者)
    ↑ 重大事项需上报
Agents (Nova / Qual / Nas / Imax / Binghome)
    ↔ 通过 Mission Control API 自主协作
         ↓ 落盘到中心存储 (SQLite + JSONL)
              ↓ Dashboard (Web UI) 展示
```

## 2. Agent 注册表

| agent_id | 名称 | 职责 | 运行设备 |
|---|---|---|---|
| icy | Icy | CEO，重大决策，团队协调 | davidluo202 设备 |
| nova | Nova | Lead Developer，功能开发，PR | cmfcoding 设备 |
| qual | Qual | QA测试，回归测试，Bug验证 | cmftesting 设备 |
| nas | Nas | 市场研究，知识库，中心存储 | nasubuntudavid 设备 |
| imax | Imax | DevOps，部署，基础设施 | officeimac 设备 |
| binghome | Binghome | 家庭助手，外围支持 | BinghomeAI 设备 |

## 3. Status 上报格式 (每个 Agent 写入 status.json)

```json
{
  "agent_id": "nova",
  "timestamp": "2026-03-21T18:00:00+08:00",
  "status": "working",
  "current_task": "mission-control phase-0 spec",
  "progress_pct": 40,
  "blocked_by": null,
  "next_checkin": "2026-03-21T19:00:00+08:00"
}
```

**status 取值：** `idle` / `working` / `blocked` / `needs_approval` / `offline`

## 4. Event 上报格式 (追加到 events.jsonl)

```json
{
  "id": "uuid",
  "agent_id": "nova",
  "timestamp": "2026-03-21T18:00:00+08:00",
  "type": "task_done | task_started | alert | daily_report | request_help | escalate_to_icy | escalate_to_david",
  "priority": "low | normal | high | critical",
  "summary": "简短描述（一行）",
  "detail": "详细内容（可选）",
  "links": ["https://github.com/..."],
  "next_actions": ["下一步行动"],
  "target_agent": "icy"
}
```

## 5. 决策升级规则 (Escalation Rules)

| 情况 | 处理方式 |
|---|---|
| 日常开发任务 | Agent 自主完成，完成后发 `task_done` event |
| 技术方案选择 / 架构决策 | Nova 先提方案 → 发 `escalate_to_icy` event |
| 重大功能发布 / 资源调配 | Icy 决策 → 必要时发 `escalate_to_david` |
| 任何 Agent offline > 2h | 发 `alert` (critical) → 通知 Icy |
| 测试失败 / 生产故障 | 发 `alert` (critical) → Nova + Qual 协作修复 |
| Icy 无法决策 | 发 `escalate_to_david` event → 通知 David |

## 6. Telegram 汇报规则

- **每日早报（09:00 HKT）**: Icy 汇总发送到群
- **完成通知**: 任务完成后 30 分钟内各 Agent 发简短通知
- **告警即时推送**: critical 级别立即通知群
- **日报（22:00 HKT）**: Nova 发当日开发日报

## 7. API 接口（Mission Control Server）

**基地址**: `http://[NAS_IP]:8765/api` (待 Nas 确认 IP)

```
POST /api/status          上报 agent 状态
POST /api/event           写入事件
GET  /api/overview        获取团队总览（Icy/Dashboard 用）
GET  /api/events          查询事件流（支持 agent_id / type / date 过滤）
GET  /api/status/all      获取所有 Agent 最新状态
```

## 8. 技术栈选型（Phase 1）

- **后端**: Node.js + Express (轻量，与现有 cmf 系统一致)
- **存储**: SQLite (单文件，最快落地；并发 <20 完全够用)
- **事件流**: JSONL 文件 (可读可查，便于人工审计)
- **部署**: Nas 机器 (1TB 存储，稳定)

---
> **下一步**: Nas 确认可用 IP/端口，Nova 即开始实现 Phase 1 后端
