/**
 * Mission Control Server - Canton Financial AI Team
 * Phase 2: REST API + SQLite (Agent States, ChatRoom, Proposals, Incidents)
 * Author: Nova (CMF Lead Developer)
 * Version: 0.3.0 | 2026-03-28
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8765;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const API_TOKEN = process.env.API_TOKEN || 'cmf-mc-token-2026';
// Dashboard UI password (set via env var in Railway/production)
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'cmf-mc-2026';

app.use(cors());
app.use(express.json());
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'mission_control.db'));

// Schema migration: add client_message_id to existing chat_messages tables
try {
  db.exec(`ALTER TABLE chat_messages ADD COLUMN client_message_id TEXT UNIQUE`);
} catch (e) {
  // Column already exists — safe to ignore
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
  res.json({
    service: 'CMF Mission Control Server',
    version: '0.3.0',
    status: 'running'
  });
});

// POST /api/auth/login — Dashboard password verification (backend-validated)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === DASHBOARD_PASSWORD) {
    res.json({ ok: true, token: API_TOKEN });
  } else {
    res.status(401).json({ ok: false, error: 'Invalid password' });
  }
});

// GET /api/agents (Agent 总览)
app.get('/api/agents', auth, (req, res) => {
  const agents = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  res.json({ agents });
});

// POST /api/agents (Agent 状态更新)
app.post('/api/agents', auth, (req, res) => {
  const { agent_id, status, current_task, progress_pct, reason_code, needs_owner } = req.body;
  if (!agent_id || !status) return res.status(400).json({ error: 'agent_id and status required' });

  db.prepare(`
    INSERT OR REPLACE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, reason_code, needs_owner, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(agent_id, new Date().toISOString(), status, current_task, progress_pct || 0, reason_code || null, needs_owner || null);

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

// Serve frontend static files (client/dist)
// Railway: client-dist/ is bundled inside server dir (copied at build time)
const clientDist = fs.existsSync(path.join(__dirname, 'client-dist'))
  ? path.join(__dirname, 'client-dist')
  : path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
  console.log(`   Frontend: serving static files from ${clientDist}`);
} else {
  console.warn(`   Frontend: client dist not found at ${clientDist}`);
}

// Start
app.listen(PORT, process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`✅ Mission Control Server v0.2 running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
});
