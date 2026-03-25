/**
 * Seed rich, decision-useful demo data.
 * Usage:
 *   API_URL=http://127.0.0.1:8765 API_TOKEN=cmf-mc-token-2026 node scripts/seed-rich.js
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

const now = Date.now();
const iso = (minsAgo) => new Date(now - minsAgo * 60 * 1000).toISOString();

async function main() {
  const agents = [
    {
      agent_id: 'icy',
      status: 'working',
      current_task: 'Reviewing proposals + coordinating agent priorities for Mission Control rollout',
      progress_pct: 60,
      reason_code: null,
      needs_owner: null,
    },
    {
      agent_id: 'nova',
      status: 'working',
      current_task: 'Fix ChatRoom send + make dashboard decision-useful (reason_code/needs_owner/proposals)',
      progress_pct: 75,
      reason_code: null,
      needs_owner: null,
    },
    {
      agent_id: 'qual',
      status: 'needs_approval',
      current_task: 'Regression ready; waiting for official test scope + acceptance checklist',
      progress_pct: 0,
      reason_code: 'WAITING_TEST_SCOPE',
      needs_owner: 'DAVID',
    },
    {
      agent_id: 'imax',
      status: 'blocked',
      current_task: 'Deploy automation: pm2 + static hosting unification',
      progress_pct: 25,
      reason_code: 'AUTH_REFRESH_FAILED',
      needs_owner: 'SELF',
    },
    {
      agent_id: 'nas',
      status: 'working',
      current_task: 'Hosting Mission Control + backups + port exposure verification',
      progress_pct: 50,
      reason_code: null,
      needs_owner: null,
    },
    {
      agent_id: 'binghome',
      status: 'idle',
      current_task: 'Standby: home automation + support',
      progress_pct: 0,
      reason_code: null,
      needs_owner: null,
    },
  ];

  for (const a of agents) await post('/api/agents', a);

  const events = [
    {
      agent_id: 'nova',
      timestamp: iso(45),
      type: 'task_started',
      priority: 'normal',
      summary: 'Start: make dashboard usable for real decisions',
      detail: 'Fix API baseURL (no localhost), enrich seed data, and add clearer fields for reason_code/needs_owner.',
      next_actions: ['Fix client api baseURL', 'Add seed-rich script', 'Deploy to NAS'],
    },
    {
      agent_id: 'imax',
      timestamp: iso(35),
      type: 'alert',
      priority: 'high',
      summary: 'Blocked: provider auth refresh failed',
      detail: 'refresh_token_reused; restart does not help. Need re-auth flow + token update.',
      next_actions: ['Run re-auth instructions', 'Update token store', 'Retry deploy pipeline'],
    },
    {
      agent_id: 'qual',
      timestamp: iso(30),
      type: 'request_help',
      priority: 'normal',
      summary: 'Need acceptance checklist for regression',
      detail: 'Define pass criteria for: overview, chatroom send/receive, proposals approve/reject, incidents revive.',
      next_actions: ['David confirms acceptance checklist', 'Qual executes regression', 'Report findings'],
      target_agent: 'david',
    },
    {
      agent_id: 'icy',
      timestamp: iso(20),
      type: 'proposal_review',
      priority: 'normal',
      summary: 'Decision routing rule applied',
      detail: 'Tooling/scheduling => ICY, bottom-file changes/cost/risk => DAVID, daily self-work => SELF.',
      next_actions: ['Collect pending proposals', 'Escalate DAVID-level proposals'],
    },
    {
      agent_id: 'nas',
      timestamp: iso(10),
      type: 'task_done',
      priority: 'normal',
      summary: 'NAS ports reserved and runtime ready',
      detail: 'Ports 8765/8077 opened; Node v24 installed; pm2 available.',
      next_actions: ['Keep pm2 alive', 'Backup data directory'],
    },
  ];

  for (const e of events) await post('/api/events', e);

  const messages = [
    {
      sender: 'nova',
      content: '【议题】Chat Room 规则：默认 30 分钟异议窗口；critical 事项需显式确认。是否同意写入协议并在 UI 展示？',
      topic: 'Governance',
    },
    {
      sender: 'icy',
      content: '同意。并建议 UI 上对 critical 标红 + 必须点击 Confirm。',
      topic: 'Governance',
    },
    {
      sender: 'David',
      content: '同意 30 分钟异议窗口；critical 必须显式确认。',
      topic: 'Governance',
    },
    {
      sender: 'qual',
      content: '建议验收 checklist：1) ChatRoom 能发能收 2) Proposals 能 approve/reject 3) Incidents 一键 revive 4) Agent timeline 可回放。',
      topic: 'QA',
    },
  ];

  for (const m of messages) await post('/api/chatroom/messages', m);

  const proposals = [
    {
      author: 'nova',
      title: 'Fix dashboard API base URL (remove localhost hardcode)',
      decision_level: 'ICY',
      impact: 'High',
      cost: 'Low',
      reason: 'Cross-agent usability; required for production rollout',
    },
    {
      author: 'nova',
      title: 'Unify static hosting into API server (single-origin) + add /api proxy',
      decision_level: 'DAVID',
      impact: 'Medium',
      cost: 'Low',
      reason: 'Changes deployment structure (底层改动)',
    },
  ];

  for (const p of proposals) await post('/api/proposals', p);

  const incidents = [
    {
      agent_id: 'imax',
      reason_code: 'AUTH_REFRESH_FAILED',
      human_message: 'Auth refresh_token_reused；必须重新授权（重启无效）',
      next_action: 'Run re-auth flow and update token store',
    },
    {
      agent_id: 'qual',
      reason_code: 'WAITING_TEST_SCOPE',
      human_message: '等待 David 确认验收 checklist；否则无法开始回归',
      next_action: 'David confirm checklist and scope',
    },
  ];

  for (const i of incidents) await post('/api/incidents', i);

  console.log('✅ Seeded rich demo data successfully:', API_URL);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
