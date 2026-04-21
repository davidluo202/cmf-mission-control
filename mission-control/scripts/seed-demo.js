/**
 * Seed demo data into Mission Control server
 * Usage:
 *   API_URL=http://100.107.235.107:8765 API_TOKEN=cmf-mc-token-2026 node scripts/seed-demo.js
 */

const API_URL = process.env.API_URL || 'http://localhost:8765';
const API_TOKEN = process.env.API_TOKEN || 'cmf-mc-token-2026';

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-token': API_TOKEN,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${path} ${res.status}: ${txt}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();

  // Agents
  const agents = [
    {
      agent_id: 'icy',
      status: 'working',
      current_task: 'Coordinating cross-agent schedule + reviewing proposals',
      progress_pct: 55,
      reason_code: null,
      needs_owner: null,
    },
    {
      agent_id: 'nova',
      status: 'working',
      current_task: 'Mission Control: seed + deployment hardening',
      progress_pct: 70,
      reason_code: null,
      needs_owner: null,
    },
    {
      agent_id: 'qual',
      status: 'needs_approval',
      current_task: 'Waiting to run regression on latest deployment',
      progress_pct: 0,
      reason_code: 'WAITING_RELEASE_LINK',
      needs_owner: 'ICY',
    },
    {
      agent_id: 'imax',
      status: 'blocked',
      current_task: 'Vercel deploy pipeline maintenance',
      progress_pct: 20,
      reason_code: 'AUTH_REFRESH_FAILED',
      needs_owner: 'SELF',
    },
    {
      agent_id: 'nas',
      status: 'working',
      current_task: 'NAS hosting + backups + infra support',
      progress_pct: 40,
      reason_code: null,
      needs_owner: null,
    },
  ];

  for (const a of agents) {
    await post('/api/agents', a);
  }

  // Events (timeline)
  const events = [
    { agent_id: 'nova', type: 'task_started', priority: 'normal', summary: 'Implement Mission Control v0.2 APIs', detail: 'Added agents/chatroom/proposals/incidents endpoints + SQLite schema.' },
    { agent_id: 'nova', type: 'task_done', priority: 'normal', summary: 'Frontend Dashboard pages scaffolded', detail: 'Overview, ChatRoom, Proposals, Incidents, Agent Timeline.' },
    { agent_id: 'imax', type: 'alert', priority: 'high', summary: 'Deployment blocked: auth refresh failed', detail: 'Provider token refresh failed; re-auth required. Restart does not help.' },
    { agent_id: 'qual', type: 'request_help', priority: 'normal', summary: 'Need release link for regression', detail: 'Please provide dashboard URL + version tags.' },
    { agent_id: 'icy', type: 'proposal_review', priority: 'normal', summary: 'Reviewing proposals for decision routing', detail: 'Auto-routing by SELF/ICY/DAVID governance rules.' },
  ].map((e, idx) => ({
    ...e,
    timestamp: iso(now - (idx + 1) * 7 * 60 * 1000),
  }));

  for (const e of events) {
    await post('/api/events', e);
  }

  // ChatRoom messages
  const messages = [
    { sender: 'nova', content: '议题：Mission Control 的 Chat Room 采用“不反对即执行”规则，是否需要加默认异议窗口（如 30min）？', topic: 'Governance' },
    { sender: 'icy', content: '建议加 30min 异议窗口；critical 事项必须显式确认。', topic: 'Governance' },
    { sender: 'David', content: '同意：默认 30min，无异议即接受；critical 必须显式确认。', topic: 'Governance' },
    { sender: 'qual', content: '我准备在验收后跑一轮回归：登录/导航/列表刷新/按钮权限。', topic: 'QA' },
  ];

  for (const m of messages) {
    await post('/api/chatroom/messages', m);
  }

  // Proposals
  const proposals = [
    {
      author: 'nova',
      title: 'Front-end static hosting move into server (single origin)',
      decision_level: 'DAVID',
      impact: 'Medium',
      cost: 'Low',
      reason: 'Changes server routing + deployment structure (底层改动)'
    },
    {
      author: 'icy',
      title: 'Adopt backoff strategy for RATE_LIMIT incidents (global)',
      decision_level: 'ICY',
      impact: 'High',
      cost: 'Low',
      reason: 'Cross-agent scheduling & tooling policy'
    }
  ];
  for (const p of proposals) {
    await post('/api/proposals', p);
  }

  // Incidents
  const incidents = [
    { agent_id: 'imax', reason_code: 'AUTH_REFRESH_FAILED', human_message: 'Auth refresh_token_reused; 必须重新授权（重启无效）', next_action: 'Run re-auth flow and update token store' },
    { agent_id: 'qual', reason_code: 'WAITING_RELEASE_LINK', human_message: '等待发布链接，无法开始回归测试', next_action: 'Provide dashboard URL + version id' },
  ];

  for (const i of incidents) {
    await post('/api/incidents', i);
  }

  console.log('✅ Seeded demo data successfully:', API_URL);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
