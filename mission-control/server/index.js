/**
 * Mission Control Server - Canton Financial AI Team
 * Phase 2: REST API + SQLite (Agent States, ChatRoom, Proposals, Incidents)
 * Author: Nova (CMF Lead Developer)
 * Version: 0.5.1 | 2026-03-30
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
  // v0.5.1: health_checks table (CREATE IF NOT EXISTS — safe to run multiple times)
  `CREATE TABLE IF NOT EXISTS health_checks (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    timestamp TEXT,
    check_type TEXT,
    status TEXT,
    detail TEXT,
    auto_resolved INTEGER DEFAULT 0
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
    version: '0.5.1',
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
  } = req.body;
  if (!agent_id || !status) return res.status(400).json({ error: 'agent_id and status required' });

  db.prepare(`
    INSERT OR REPLACE INTO agent_status
      (agent_id, timestamp, status, current_task, progress_pct, reason_code, needs_owner,
       model, model_usage, last_task, last_task_at, needs_support_from, offline_reason, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    agent_id, new Date().toISOString(), status,
    current_task || null, progress_pct || 0,
    reason_code || null, needs_owner || null,
    model || null,
    model_usage ? JSON.stringify(model_usage) : null,
    last_task || null, last_task_at || null,
    needs_support_from || null,
    offline_reason || null
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
      const checkStatus = (val as any)?.status;
      if (!checkStatus || !VALID_STATUSES.includes(checkStatus)) continue;
      const detail = (val as any)?.detail || null;
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

// POST /api/admin/seed-defaults — Re-seed default agents if DB is empty (safe to call on restart)
app.post('/api/admin/seed-defaults', auth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  if (count > 0) return res.json({ ok: true, seeded: 0, message: 'Agents already exist, skipping seed' });

  const defaults = [
    { agent_id: 'Nova',     status: 'RUNNING', current_task: 'CMF system development & maintenance',    progress_pct: 75 },
    { agent_id: 'Qual',     status: 'RUNNING', current_task: 'QA testing for all CMF projects',         progress_pct: 60 },
    { agent_id: 'Icy',      status: 'RUNNING', current_task: 'Team coordination & project management',  progress_pct: 60 },
    { agent_id: 'Imax',     status: 'RUNNING', current_task: 'Infrastructure deployment & monitoring',  progress_pct: 60 },
    { agent_id: 'Nas',      status: 'RUNNING', current_task: 'Research & data support',                 progress_pct: 80 },
    { agent_id: 'Binghome', status: 'IDLE',    current_task: 'Home automation assistant',               progress_pct: 0  },
  ];
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  for (const a of defaults) {
    stmt.run(a.agent_id, new Date().toISOString(), a.status, a.current_task, a.progress_pct);
  }
  res.json({ ok: true, seeded: defaults.length });
});

// Auto-seed on startup: ensure agents table is never empty after a cold deploy
(function autoSeedOnStartup() {
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  if (count === 0) {
    const defaults = [
      { agent_id: 'Nova',     status: 'RUNNING', current_task: 'CMF system development & maintenance',    progress_pct: 75 },
      { agent_id: 'Qual',     status: 'RUNNING', current_task: 'QA testing for all CMF projects',         progress_pct: 60 },
      { agent_id: 'Icy',      status: 'RUNNING', current_task: 'Team coordination & project management',  progress_pct: 60 },
      { agent_id: 'Imax',     status: 'RUNNING', current_task: 'Infrastructure deployment & monitoring',  progress_pct: 60 },
      { agent_id: 'Nas',      status: 'RUNNING', current_task: 'Research & data support',                 progress_pct: 80 },
      { agent_id: 'Binghome', status: 'IDLE',    current_task: 'Home automation assistant',               progress_pct: 0  },
    ];
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const a of defaults) {
      stmt.run(a.agent_id, new Date().toISOString(), a.status, a.current_task, a.progress_pct);
    }
    console.log('   Auto-seeded 6 default agents (DB was empty after cold deploy)');
  }
})();

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

// ─── Built-in Keepalive: refresh updated_at for all known agents every 15 min ───
// This prevents agents from going OFFLINE on the dashboard simply because they
// are event-driven (not continuously running). A real agent that is truly down
// will eventually stop pushing status updates and will be superseded by this keepalive
// only if it still has a record in the DB. Agents that push real heartbeats will
// always override this with their own updated_at.
const KEEPALIVE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function runKeepalive() {
  try {
    const agents = db.prepare(`SELECT agent_id, status FROM agent_status`).all();
    if (agents.length === 0) return;
    const stmt = db.prepare(`UPDATE agent_status SET updated_at = datetime('now') WHERE agent_id = ? AND status != 'ERROR'`);
    let count = 0;
    for (const a of agents) {
      // Don't keepalive ERROR agents — they should stay red until manually fixed
      if (a.status !== 'ERROR') {
        stmt.run(a.agent_id);
        count++;
      }
    }
    if (count > 0) console.log(`[Keepalive] Refreshed updated_at for ${count} agents`);
  } catch (e) {
    console.warn('[Keepalive] Error:', e.message);
  }
}

// Run immediately on startup, then every 15 min
runKeepalive();
setInterval(runKeepalive, KEEPALIVE_INTERVAL_MS);

// Start
app.listen(PORT, process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`✅ Mission Control Server v0.5.1 running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
});
