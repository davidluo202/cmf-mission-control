/**
 * Mission Control Server - Canton Financial AI Team
 * Phase 2: REST API + SQLite (Agent States, ChatRoom, Proposals, Incidents, Alerts)
 * Author: Nova (CMF Lead Developer)
 * Version: 0.6.0 | 2026-04-01
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8765;
const SERVER_START_TIME = Date.now();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const API_TOKEN = process.env.API_TOKEN || 'cmf-mc-token-2026';
// Dashboard UI password (set via env var in Railway/production)
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'cmf-mc-2026';

app.use(cors());
app.use(express.json());
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'mission_control.db'));

// Schema migrations — each ALTER TABLE is wrapped in try/catch; already-existing columns are silently ignored
const migrations = [
  `ALTER TABLE chat_messages ADD COLUMN client_message_id TEXT UNIQUE`,
  `ALTER TABLE agent_status ADD COLUMN model TEXT`,
  `ALTER TABLE agent_status ADD COLUMN model_usage TEXT`,
  `ALTER TABLE agent_status ADD COLUMN last_task TEXT`,
  `ALTER TABLE agent_status ADD COLUMN last_task_at TEXT`,
  `ALTER TABLE agent_status ADD COLUMN needs_support_from TEXT`,
  `ALTER TABLE agent_status ADD COLUMN offline_reason TEXT`,
  `ALTER TABLE agent_status ADD COLUMN partner_agent_id TEXT`,
  `ALTER TABLE agent_status ADD COLUMN partner_status_emoji TEXT`,
  `ALTER TABLE agent_status ADD COLUMN last_emoji_update TEXT`,
  // v0.6.0: rescue_mechanism
  `CREATE TABLE IF NOT EXISTS rescue_tasks (
    id TEXT PRIMARY KEY,
    requester_agent TEXT,
    target_agent TEXT,
    timestamp TEXT,
    status TEXT,
    rescue_type TEXT,
    result TEXT
  )`,
  // v0.5.2: alerts table
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    severity TEXT,
    target TEXT,
    agent_id TEXT,
    alert_type TEXT,
    message TEXT,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TEXT
  )`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists — safe to ignore */ }
}

// Database Schema v0.2
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_status (
    agent_id TEXT PRIMARY KEY,
    timestamp TEXT,
    status TEXT,
    current_task TEXT,
    progress_pct INTEGER,
    reason_code TEXT,
    needs_owner TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    timestamp TEXT,
    type TEXT,
    priority TEXT,
    summary TEXT,
    detail TEXT,
    links TEXT,
    next_actions TEXT,
    target_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sender TEXT,
    timestamp TEXT,
    content TEXT,
    mentions TEXT,
    topic TEXT,
    client_message_id TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    author TEXT,
    timestamp TEXT,
    title TEXT,
    decision_level TEXT,
    status TEXT,
    impact TEXT,
    cost TEXT,
    reason TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    timestamp TEXT,
    reason_code TEXT,
    human_message TEXT,
    next_action TEXT,
    status TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  if (token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (req, res) => {
  const uptimeSec = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  res.json({
    service: 'CMF Mission Control Server',
    version: '0.5.2',
    status: 'running',
    uptime_sec: uptimeSec,
    started_at: new Date(SERVER_START_TIME).toISOString(),
  });
});

// POST /api/auth/login — plain string comparison (internal tool, no bcrypt needed)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }
  res.json({ ok: true, token: API_TOKEN });
});

// GET /api/agents (Agent 总览)
app.get('/api/agents', auth, (req, res) => {
  const agents = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  res.json({ agents });
});

// POST /api/agents (Agent 状态更新)
app.post('/api/agents', auth, (req, res) => {
  const {
    agent_id, status, current_task, progress_pct, reason_code, needs_owner,
    model, model_usage, last_task, last_task_at, needs_support_from, offline_reason,
    health, // optional: { gateway_status: {status, detail}, model_api: {...}, ... }
    partner_agent_id, partner_status_emoji, // v0.6.0: 互助配对 + emoji 状态
  } = req.body;
  if (!agent_id || !status) return res.status(400).json({ error: 'agent_id and status required' });

  db.prepare(`
    INSERT OR REPLACE INTO agent_status
      (agent_id, timestamp, status, current_task, progress_pct, reason_code, needs_owner,
       model, model_usage, last_task, last_task_at, needs_support_from, offline_reason,
       partner_agent_id, partner_status_emoji, last_emoji_update, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    agent_id, new Date().toISOString(), status,
    current_task || null, progress_pct || 0,
    reason_code || null, needs_owner || null,
    model || null,
    model_usage ? JSON.stringify(model_usage) : null,
    last_task || null, last_task_at || null,
    needs_support_from || null,
    offline_reason || null,
    partner_agent_id || null,
    partner_status_emoji || null,
    partner_status_emoji ? new Date().toISOString() : null
  );

  // Bulk-upsert health checks if provided
  if (health && typeof health === 'object') {
    const VALID_TYPES = ['gateway_status', 'model_api', 'session_health', 'vpn_routing', 'heartbeat_stale'];
    const VALID_STATUSES = ['OK', 'WARNING', 'ERROR', 'UNKNOWN'];
    const stmt = db.prepare(`
      INSERT INTO health_checks (id, agent_id, timestamp, check_type, status, detail, auto_resolved)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    const ts = new Date().toISOString();
    for (const [check_type, val] of Object.entries(health)) {
      if (!VALID_TYPES.includes(check_type)) continue;
      const checkStatus = val?.status;
      if (!checkStatus || !VALID_STATUSES.includes(checkStatus)) continue;
      const detail = val?.detail || null;
      const id = 'hc_' + uuidv4().substring(0, 8);
      stmt.run(id, agent_id, ts, check_type, checkStatus, detail);
    }
  }

  res.json({ ok: true });
});

// POST /api/events (事件上报)
app.post('/api/events', auth, (req, res) => {
  const { agent_id, type, priority, summary, detail, links, next_actions, target_agent } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO events (id, agent_id, timestamp, type, priority, summary, detail, links, next_actions, target_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, agent_id, new Date().toISOString(),
    type, priority || 'normal', summary, detail || null,
    links ? JSON.stringify(links) : null,
    next_actions ? JSON.stringify(next_actions) : null,
    target_agent || null
  );
  res.json({ ok: true, id });
});

// GET /api/agents/:id/timeline (特定 Agent 事件流)
app.get('/api/agents/:id/timeline', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM events WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.id);
  res.json({ events: rows });
});

// GET /api/chatroom/messages (会议室拉取)
app.get('/api/chatroom/messages', auth, (req, res) => {
  const { limit = 50 } = req.query;
  const rows = db.prepare('SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT ?').all(parseInt(limit));
  res.json({ messages: rows.reverse() });
});

// POST /api/chatroom/messages (发到会议室)
app.post('/api/chatroom/messages', auth, (req, res) => {
  const { sender, content, mentions, topic, client_message_id } = req.body;
  if (!sender || !content) return res.status(400).json({ error: 'sender and content required' });

  // Idempotency: if client_message_id provided and already exists, return ok without inserting
  if (client_message_id) {
    const existing = db.prepare('SELECT id FROM chat_messages WHERE client_message_id = ?').get(client_message_id);
    if (existing) return res.json({ ok: true, id: existing.id, deduplicated: true });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT OR IGNORE INTO chat_messages (id, sender, timestamp, content, mentions, topic, client_message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, sender, new Date().toISOString(), content, mentions ? JSON.stringify(mentions) : null, topic || null, client_message_id || null);
  res.json({ ok: true, id });
});

// DELETE /api/chatroom/messages (clear all chat — admin only)
app.delete('/api/chatroom/messages', auth, (req, res) => {
  db.prepare('DELETE FROM chat_messages').run();
  res.json({ ok: true });
});

// POST /api/proposals (提交提案)
app.post('/api/proposals', auth, (req, res) => {
  const { author, title, decision_level, impact, cost, reason } = req.body;
  const id = 'prop_' + uuidv4().substring(0, 8);
  db.prepare(`
    INSERT INTO proposals (id, author, timestamp, title, decision_level, status, impact, cost, reason)
    VALUES (?, ?, ?, ?, ?, 'WAITING_DECISION', ?, ?, ?)
  `).run(id, author, new Date().toISOString(), title, decision_level, impact || null, cost || null, reason || null);
  res.json({ ok: true, id });
});

// GET /api/proposals (获取提案)
app.get('/api/proposals', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM proposals ORDER BY timestamp DESC').all();
  res.json({ proposals: rows });
});

// POST /api/proposals/:id/approve (审批)
app.post('/api/proposals/:id/approve', auth, (req, res) => {
  const { action, reviewer } = req.body; // action = APPROVED | REJECTED
  db.prepare(`UPDATE proposals SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(action, req.params.id);
  res.json({ ok: true });
});

// GET /api/incidents (获取故障池)
app.get('/api/incidents', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY timestamp DESC').all();
  res.json({ incidents: rows });
});

// POST /api/incidents (上报故障)
app.post('/api/incidents', auth, (req, res) => {
  const { agent_id, reason_code, human_message, next_action } = req.body;
  const id = 'inc_' + uuidv4().substring(0, 8);
  db.prepare(`
    INSERT INTO incidents (id, agent_id, timestamp, reason_code, human_message, next_action, status)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
  `).run(id, agent_id, new Date().toISOString(), reason_code, human_message, next_action);
  res.json({ ok: true, id });
});

// POST /api/incidents/:id/revive (复活操作)
app.post('/api/incidents/:id/revive', auth, (req, res) => {
  db.prepare(`UPDATE incidents SET status = 'RESOLVED', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ─── Health Check Endpoints ─────────────────────────────────────────────────

// POST /api/health-checks — agent reports a health check result
app.post('/api/health-checks', auth, (req, res) => {
  const { agent_id, check_type, status, detail } = req.body;
  if (!agent_id || !check_type || !status) {
    return res.status(400).json({ error: 'agent_id, check_type, and status required' });
  }
  const VALID_TYPES = ['gateway_status', 'model_api', 'session_health', 'vpn_routing', 'heartbeat_stale'];
  const VALID_STATUSES = ['OK', 'WARNING', 'ERROR', 'UNKNOWN'];
  if (!VALID_TYPES.includes(check_type)) return res.status(400).json({ error: `Invalid check_type. Valid: ${VALID_TYPES.join(', ')}` });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });

  const id = 'hc_' + uuidv4().substring(0, 8);
  db.prepare(`
    INSERT INTO health_checks (id, agent_id, timestamp, check_type, status, detail, auto_resolved)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(id, agent_id, new Date().toISOString(), check_type, status, detail || null);
  res.json({ ok: true, id });
});

// GET /api/health-checks — get health check records (filterable by agent_id, status, check_type)
app.get('/api/health-checks', auth, (req, res) => {
  const { agent_id, status, check_type, limit = 200 } = req.query;
  let sql = 'SELECT * FROM health_checks WHERE 1=1';
  const params = [];
  if (agent_id) { sql += ' AND agent_id = ?'; params.push(agent_id); }
  if (status)   { sql += ' AND status = ?';   params.push(status); }
  if (check_type) { sql += ' AND check_type = ?'; params.push(check_type); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = db.prepare(sql).all(...params);
  res.json({ health_checks: rows });
});

// GET /api/health-checks/summary — per-agent latest status for each check type
app.get('/api/health-checks/summary', auth, (req, res) => {
  // For each (agent_id, check_type), return the most recent record
  const rows = db.prepare(`
    SELECT h.*
    FROM health_checks h
    INNER JOIN (
      SELECT agent_id, check_type, MAX(timestamp) as max_ts
      FROM health_checks
      GROUP BY agent_id, check_type
    ) latest ON h.agent_id = latest.agent_id
                AND h.check_type = latest.check_type
                AND h.timestamp = latest.max_ts
    ORDER BY h.agent_id, h.check_type
  `).all();

  // Group into { [agent_id]: { [check_type]: {status, detail, timestamp, id} } }
  const summary = {};
  for (const row of rows) {
    if (!summary[row.agent_id]) summary[row.agent_id] = {};
    summary[row.agent_id][row.check_type] = {
      id: row.id,
      status: row.status,
      detail: row.detail,
      timestamp: row.timestamp,
      auto_resolved: row.auto_resolved,
    };
  }
  res.json({ summary });
});

// POST /api/health-checks/:id/resolve — mark a health check as resolved
app.post('/api/health-checks/:id/resolve', auth, (req, res) => {
  const check = db.prepare('SELECT * FROM health_checks WHERE id = ?').get(req.params.id);
  if (!check) return res.status(404).json({ error: 'Health check not found' });
  db.prepare(`UPDATE health_checks SET status = 'OK', auto_resolved = 1 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// POST /api/agents/:id/heartbeat (Agent 心跳 ping — 只更新 updated_at，不改状态)
app.post('/api/agents/:id/heartbeat', auth, (req, res) => {
  const agent = db.prepare('SELECT * FROM agent_status WHERE agent_id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  db.prepare(`UPDATE agent_status SET updated_at = datetime('now') WHERE agent_id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ─── v0.6.0: Rescue / Mutual Aid Endpoints ───────────────────────────────────

// POST /api/rescue/request — Agent requests help from partner
app.post('/api/rescue/request', auth, (req, res) => {
  const { requester_agent, target_agent, rescue_type } = req.body;
  if (!requester_agent || !target_agent || !rescue_type) {
    return res.status(400).json({ error: 'requester_agent, target_agent, and rescue_type required' });
  }
  // rescue_type: 'PATROL_CHECK', 'TROUBLE_SHOOT', 'BACKUP_TASK', 'HEALTH_CHECK'
  const id = 'rescue_' + uuidv4().substring(0, 8);
  db.prepare(`
    INSERT INTO rescue_tasks (id, requester_agent, target_agent, timestamp, status, rescue_type, result)
    VALUES (?, ?, ?, ?, 'PENDING', ?, NULL)
  `).run(id, requester_agent, target_agent, new Date().toISOString(), rescue_type);
  
  // Log event
  db.prepare(`INSERT INTO events (id, agent_id, timestamp, type, priority, summary, target_agent)
    VALUES (?, ?, ?, 'rescue_requested', 'normal', ?, ?)`
  ).run(uuidv4(), requester_agent, new Date().toISOString(),
    `${requester_agent} requested ${rescue_type} from ${target_agent}`, target_agent);
  
  res.json({ ok: true, id });
});

// GET /api/rescue/tasks — Get rescue tasks (filter by status, agent)
app.get('/api/rescue/tasks', auth, (req, res) => {
  const { status, agent_id, limit = 50 } = req.query;
  let sql = 'SELECT * FROM rescue_tasks WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (agent_id) { sql += ' AND (requester_agent = ? OR target_agent = ?)'; params.push(agent_id, agent_id); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = db.prepare(sql).all(...params);
  res.json({ rescue_tasks: rows });
});

// POST /api/rescue/respond — Partner responds to rescue request
app.post('/api/rescue/respond', auth, (req, res) => {
  const { task_id, response, result } = req.body;
  if (!task_id || !response) {
    return res.status(400).json({ error: 'task_id and response required' });
  }
  // response: 'ACCEPTED', 'REJECTED', 'COMPLETED'
  const task = db.prepare('SELECT * FROM rescue_tasks WHERE id = ?').get(task_id);
  if (!task) return res.status(404).json({ error: 'Rescue task not found' });
  
  const newStatus = response === 'COMPLETED' ? 'COMPLETED' : (response === 'REJECTED' ? 'REJECTED' : 'IN_PROGRESS');
  db.prepare(`UPDATE rescue_tasks SET status = ?, result = ? WHERE id = ?`)
    .run(newStatus, result || null, task_id);
  
  // Log event
  db.prepare(`INSERT INTO events (id, agent_id, timestamp, type, priority, summary, target_agent)
    VALUES (?, ?, ?, 'rescue_response', 'normal', ?, ?)`
  ).run(uuidv4(), task.target_agent, new Date().toISOString(),
    `${task.target_agent} responded to rescue request: ${response}`, task.requester_agent);
  
  res.json({ ok: true });
});

// GET /api/rescue/partners — Get each agent's assigned partner
app.get('/api/rescue/partners', auth, (req, res) => {
  const agents = db.prepare('SELECT agent_id, partner_agent_id FROM agent_status WHERE partner_agent_id IS NOT NULL').all();
  res.json({ partners: agents });
});

// POST /api/rescue/assign — David/Icy assigns partner pairs
app.post('/api/rescue/assign', auth, (req, res) => {
  const { agent_a, agent_b } = req.body;
  if (!agent_a || !agent_b) return res.status(400).json({ error: 'agent_a and agent_b required' });
  
  db.prepare('UPDATE agent_status SET partner_agent_id = ? WHERE agent_id = ?').run(agent_b, agent_a);
  db.prepare('UPDATE agent_status SET partner_agent_id = ? WHERE agent_id = ?').run(agent_a, agent_b);
  
  res.json({ ok: true, message: `${agent_a} ↔ ${agent_b} paired for mutual aid` });
});

// POST /api/agents/emoji — Update agent's emoji status (received from Telegram/command)
app.post('/api/agents/emoji', auth, (req, res) => {
  const { agent_id, emoji } = req.body;
  if (!agent_id || !emoji) return res.status(400).json({ error: 'agent_id and emoji required' });
  
  // Valid emoji: 👀, 🧠, 🪏, ☕️, ✅, 🛑
  const VALID_EMOJIS = ['👀', '🧠', '🪏', '☕️', '✅', '🛑'];
  if (!VALID_EMOJIS.includes(emoji)) {
    return res.status(400).json({ error: `Invalid emoji. Valid: ${VALID_EMOJIS.join(', ')}` });
  }
  
  db.prepare('UPDATE agent_status SET partner_status_emoji = ?, last_emoji_update = datetime(\'now\') WHERE agent_id = ?')
    .run(emoji, agent_id);
  
  res.json({ ok: true });
});

// GET /api/agents/emoji/:agent_id — Get agent's current emoji status
app.get('/api/agents/emoji/:agent_id', auth, (req, res) => {
  const agent = db.prepare('SELECT agent_id, partner_status_emoji, last_emoji_update FROM agent_status WHERE agent_id = ?').get(req.params.agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// POST /api/admin/seed-defaults — Re-seed default agents if DB is empty (safe to call on restart)
app.post('/api/admin/seed-defaults', auth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  if (count > 0) return res.json({ ok: true, seeded: 0, message: 'Agents already exist, skipping seed' });

  const defaults = [
    { agent_id: 'Nova',     status: 'RUNNING', current_task: 'CMF system development & maintenance',    progress_pct: 75, partner_agent_id: 'Qual' },
    { agent_id: 'Qual',     status: 'RUNNING', current_task: 'QA testing for all CMF projects',         progress_pct: 60, partner_agent_id: 'Nova' },
    { agent_id: 'Icy',      status: 'RUNNING', current_task: 'Team coordination & project management',  progress_pct: 60, partner_agent_id: 'Imax' },
    { agent_id: 'Imax',     status: 'RUNNING', current_task: 'Infrastructure deployment & monitoring',  progress_pct: 60, partner_agent_id: 'Icy' },
    { agent_id: 'Nas',      status: 'RUNNING', current_task: 'Research & data support',                 progress_pct: 80, partner_agent_id: 'Binghome' },
    { agent_id: 'Binghome', status: 'IDLE',    current_task: 'Home automation assistant',               progress_pct: 0,  partner_agent_id: 'Nas' },
  ];
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, partner_agent_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  for (const a of defaults) {
    stmt.run(a.agent_id, new Date().toISOString(), a.status, a.current_task, a.progress_pct, a.partner_agent_id);
  }
  res.json({ ok: true, seeded: defaults.length });
});

// Auto-seed on startup: ensure agents table is never empty after a cold deploy
(function autoSeedOnStartup() {
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  if (count === 0) {
    const defaults = [
      { agent_id: 'Nova',     status: 'RUNNING', current_task: 'CMF system development & maintenance',    progress_pct: 75, partner_agent_id: 'Qual' },
      { agent_id: 'Qual',     status: 'RUNNING', current_task: 'QA testing for all CMF projects',         progress_pct: 60, partner_agent_id: 'Nova' },
      { agent_id: 'Icy',      status: 'RUNNING', current_task: 'Team coordination & project management',  progress_pct: 60, partner_agent_id: 'Imax' },
      { agent_id: 'Imax',     status: 'RUNNING', current_task: 'Infrastructure deployment & monitoring',  progress_pct: 60, partner_agent_id: 'Icy' },
      { agent_id: 'Nas',      status: 'RUNNING', current_task: 'Research & data support',                 progress_pct: 80, partner_agent_id: 'Binghome' },
      { agent_id: 'Binghome', status: 'IDLE',    current_task: 'Home automation assistant',               progress_pct: 0,  partner_agent_id: 'Nas' },
    ];
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, partner_agent_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const a of defaults) {
      stmt.run(a.agent_id, new Date().toISOString(), a.status, a.current_task, a.progress_pct, a.partner_agent_id);
    }
    console.log('   Auto-seeded 6 default agents with partner pairs (DB was empty after cold deploy)');
  }
})();

// ─── Alert Helpers ───────────────────────────────────────────────────────────

/**
 * Create an alert only if no unacknowledged alert of the same type exists for this agent.
 * Returns the new alert id, or null if a duplicate was found.
 */
function createAlertIfNew(agentId, alertType, severity, target, message) {
  const existing = db.prepare(
    'SELECT id FROM alerts WHERE agent_id = ? AND alert_type = ? AND acknowledged = 0'
  ).get(agentId, alertType);
  if (existing) return null;

  const id = 'alrt_' + uuidv4().substring(0, 8);
  db.prepare(`
    INSERT INTO alerts (id, timestamp, severity, target, agent_id, alert_type, message, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, new Date().toISOString(), severity, target, agentId, alertType, message);
  console.log(`[Monitor] Alert [${severity}] ${agentId} — ${alertType}: ${message}`);
  return id;
}

// ─── Alert API Endpoints ─────────────────────────────────────────────────────

// GET /api/alerts — list alerts (filterable by severity, target, acknowledged, agent_id)
app.get('/api/alerts', auth, (req, res) => {
  const { severity, target, acknowledged, agent_id, limit = 100 } = req.query;
  let sql = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (severity)   { sql += ' AND severity = ?';   params.push(severity); }
  if (target)     { sql += ' AND target = ?';     params.push(target); }
  if (agent_id)   { sql += ' AND agent_id = ?';   params.push(agent_id); }
  if (acknowledged !== undefined) {
    sql += ' AND acknowledged = ?';
    params.push(acknowledged === 'true' || acknowledged === '1' ? 1 : 0);
  }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = db.prepare(sql).all(...params);
  res.json({ alerts: rows });
});

// GET /api/alerts/unacknowledged — quick count breakdown by severity
app.get('/api/alerts/unacknowledged', auth, (req, res) => {
  const total    = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0').get().c;
  const critical = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND severity = ?').get('CRITICAL').c;
  const warning  = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND severity = ?').get('WARNING').c;
  const info     = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0 AND severity = ?').get('INFO').c;
  res.json({ total, critical, warning, info });
});

// POST /api/alerts/:id/acknowledge — mark an alert as acknowledged
app.post('/api/alerts/:id/acknowledge', auth, (req, res) => {
  const { acknowledged_by } = req.body || {};
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  db.prepare(`
    UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?
  `).run(acknowledged_by || 'David', new Date().toISOString(), req.params.id);
  res.json({ ok: true });
});

// POST /api/alerts/acknowledge-all — acknowledge all unacknowledged alerts
app.post('/api/alerts/acknowledge-all', auth, (req, res) => {
  const { acknowledged_by } = req.body || {};
  const ts = new Date().toISOString();
  const result = db.prepare(`
    UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE acknowledged = 0
  `).run(acknowledged_by || 'David', ts);
  res.json({ ok: true, count: result.changes });
});

// ─── Proactive Monitoring Loop ───────────────────────────────────────────────

const MONITOR_INTERVAL_MS      = 5  * 60 * 1000; // run every 5 minutes
const STALE_WARNING_MS         = 30 * 60 * 1000; // 30 min → WARNING / STALE
const STALE_OFFLINE_MS         = 2  * 60 * 60 * 1000; // 2 h → OFFLINE
const HEALTH_STALE_MS          = 1  * 60 * 60 * 1000; // 1 h → mark UNKNOWN
const HEALTH_ERROR_WARNING_MS  = 30 * 60 * 1000; // ERROR 30 min → WARNING alert
const HEALTH_ERROR_CRITICAL_MS = 1  * 60 * 60 * 1000; // ERROR 1 h → CRITICAL alert

function msToHumanShort(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function normalizeTs(ts) {
  if (!ts) return 0;
  return new Date(ts.endsWith('Z') ? ts : ts + 'Z').getTime();
}

function runMonitoringLoop() {
  const now = Date.now();
  console.log(`[Monitor] Proactive check at ${new Date().toISOString()}`);

  try {
    // ── 1. Agent Staleness Detection ─────────────────────────────────────
    const agents = db.prepare('SELECT * FROM agent_status').all();
    let offlineCount = 0;

    for (const agent of agents) {
      const ageMs = now - normalizeTs(agent.updated_at);

      if (ageMs > STALE_OFFLINE_MS) {
        offlineCount++;

        // Transition to OFFLINE if not already set
        if (agent.status !== 'OFFLINE') {
          db.prepare(`UPDATE agent_status SET status = 'OFFLINE' WHERE agent_id = ?`).run(agent.agent_id);

          // Log event
          db.prepare(`INSERT INTO events (id, agent_id, timestamp, type, priority, summary)
            VALUES (?, ?, ?, 'agent_offline', 'high', ?)`
          ).run(uuidv4(), agent.agent_id, new Date().toISOString(),
            `${agent.agent_id} marked OFFLINE — no heartbeat for ${msToHumanShort(ageMs)}`);

          // Open incident (deduplicated)
          const existingInc = db.prepare(
            `SELECT id FROM incidents WHERE agent_id = ? AND reason_code = 'HEARTBEAT_STALE' AND status = 'OPEN'`
          ).get(agent.agent_id);
          if (!existingInc) {
            const incId = 'inc_' + uuidv4().substring(0, 8);
            db.prepare(`INSERT INTO incidents (id, agent_id, timestamp, reason_code, human_message, next_action, status)
              VALUES (?, ?, ?, 'HEARTBEAT_STALE', ?, 'Investigate agent and restore heartbeat', 'OPEN')`
            ).run(incId, agent.agent_id, new Date().toISOString(),
              `${agent.agent_id} offline — no heartbeat for ${msToHumanShort(ageMs)}`);
          }
        }

        createAlertIfNew(agent.agent_id, 'agent_offline', 'CRITICAL', 'ALL',
          `${agent.agent_id} has been OFFLINE for ${msToHumanShort(ageMs)} — no heartbeat received`);

      } else if (ageMs > STALE_WARNING_MS) {
        // Log stale event only if status was not already WARNING/OFFLINE
        if (agent.status !== 'OFFLINE' && agent.status !== 'WARNING') {
          db.prepare(`INSERT INTO events (id, agent_id, timestamp, type, priority, summary)
            VALUES (?, ?, ?, 'agent_stale', 'normal', ?)`
          ).run(uuidv4(), agent.agent_id, new Date().toISOString(),
            `${agent.agent_id} heartbeat stale — last seen ${msToHumanShort(ageMs)} ago`);
        }

        createAlertIfNew(agent.agent_id, 'agent_stale', 'WARNING', 'ICY',
          `${agent.agent_id} heartbeat stale — last seen ${msToHumanShort(ageMs)} ago`);
      }
    }

    // Multiple agents offline → escalate to DAVID
    if (offlineCount >= 2) {
      createAlertIfNew('SYSTEM', 'multiple_agents_offline', 'CRITICAL', 'DAVID',
        `${offlineCount} agents are currently OFFLINE — possible infrastructure issue`);
    }

    // ── 2. Health Check Staleness ──────────────────────────────────────────
    const latestChecks = db.prepare(`
      SELECT h.*
      FROM health_checks h
      INNER JOIN (
        SELECT agent_id, check_type, MAX(timestamp) as max_ts
        FROM health_checks
        GROUP BY agent_id, check_type
      ) latest ON h.agent_id = latest.agent_id
                  AND h.check_type = latest.check_type
                  AND h.timestamp = latest.max_ts
    `).all();

    for (const check of latestChecks) {
      const checkAgeMs = now - normalizeTs(check.timestamp);

      // Mark stale checks as UNKNOWN
      if (checkAgeMs > HEALTH_STALE_MS && check.status !== 'UNKNOWN') {
        db.prepare(`UPDATE health_checks SET status = 'UNKNOWN' WHERE id = ?`).run(check.id);
      }

      // Escalate persistent ERROR checks
      if (check.status === 'ERROR') {
        if (checkAgeMs > HEALTH_ERROR_CRITICAL_MS) {
          createAlertIfNew(
            check.agent_id,
            `health_critical_${check.check_type}`,
            'CRITICAL', 'DAVID',
            `${check.agent_id} ${check.check_type} has been ERROR for ${msToHumanShort(checkAgeMs)} — immediate action needed`
          );
        } else if (checkAgeMs > HEALTH_ERROR_WARNING_MS) {
          createAlertIfNew(
            check.agent_id,
            `health_error_${check.check_type}`,
            'WARNING', 'ICY',
            `${check.agent_id} ${check.check_type} is in ERROR state for ${msToHumanShort(checkAgeMs)}`
          );
        }
      }
    }

    console.log(`[Monitor] Done — ${agents.length} agents, ${latestChecks.length} health checks reviewed`);
  } catch (e) {
    console.error('[Monitor] Error:', e.message);
  }
}

// Run immediately on startup, then every 5 minutes
runMonitoringLoop();
setInterval(runMonitoringLoop, MONITOR_INTERVAL_MS);

// Serve frontend static files (client/dist)
// Railway: client-dist/ is bundled inside server dir (copied at build time)
const clientDist = fs.existsSync(path.join(__dirname, 'client-dist'))
  ? path.join(__dirname, 'client-dist')
  : path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  // Serve static assets (JS/CSS/images)
  app.use(express.static(clientDist));

  const indexPath = path.resolve(clientDist, 'index.html');

  // Root → SPA index.html
  app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  });

  // All non-API routes → SPA index.html (Express 5 uses /*splat)
  app.get('/*splat', (req, res, next) => {
    const p = req.path;
    if (p.startsWith('/api') || p === '/health') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  });

  console.log(`   Frontend: serving static files from ${clientDist}`);
  console.log(`   Index: ${indexPath}`);
} else {
  console.warn(`   Frontend dist NOT found at: ${clientDist}`);
}

// ─── Server Startup Event ────────────────────────────────────────────────────
(function logStartupEvent() {
  try {
    db.prepare(`INSERT INTO events (id, agent_id, timestamp, type, priority, summary)
      VALUES (?, 'SYSTEM', ?, 'system_startup', 'normal', ?)`
    ).run(uuidv4(), new Date().toISOString(), 'Mission Control v0.5.2 started');

    // Immediately alert on any agent already offline at startup
    const agents = db.prepare('SELECT * FROM agent_status').all();
    const now = Date.now();
    for (const agent of agents) {
      const ageMs = now - normalizeTs(agent.updated_at);
      if (ageMs > STALE_OFFLINE_MS) {
        createAlertIfNew(agent.agent_id, 'agent_offline', 'CRITICAL', 'ALL',
          `${agent.agent_id} was OFFLINE at server startup — no heartbeat for ${msToHumanShort(ageMs)}`);
      }
    }
  } catch (e) {
    console.warn('[Startup] Could not log startup event:', e.message);
  }
})();

// Start
app.listen(PORT, process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`✅ Mission Control Server v0.5.2 running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
});
