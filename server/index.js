/**
 * CMF Mission Control Server - Canton Financial AI Team
 * Cloud Backend: Express + SQLite (Railway-ready)
 * Version: 0.2.0 | 2026-03-24
 * Author: Nova (Lead Developer)
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8765;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const API_TOKEN = process.env.API_TOKEN;

if (!API_TOKEN) {
  console.warn('[WARN] API_TOKEN not set — all requests will be accepted (dev mode)');
}

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Database Setup ───────────────────────────────────────────────────────────
const DB_PATH = path.join(DATA_DIR, 'mission_control.db');
const db = new Database(DB_PATH);

// Apply schema from schema.sql if tables don't exist yet
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');
if (fs.existsSync(SCHEMA_PATH)) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
} else {
  // Fallback inline schema (minimal)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_status (
      agent_id TEXT PRIMARY KEY,
      agent_name TEXT,
      status TEXT DEFAULT 'idle',
      current_task_id TEXT,
      current_task_desc TEXT,
      task_started_at TEXT,
      model_name TEXT,
      tokens_used INTEGER DEFAULT 0,
      tokens_limit INTEGER DEFAULT 0,
      last_heartbeat TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      agent_id TEXT,
      target_agent_id TEXT,
      task_id TEXT,
      summary TEXT,
      detail TEXT,
      model_name TEXT,
      tokens_used INTEGER,
      severity TEXT DEFAULT 'info',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assigned_by TEXT,
      assigned_to TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'p2',
      result_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      participants TEXT,
      conclusion TEXT NOT NULL,
      action_items TEXT,
      decided_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      thread_id TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at TEXT DEFAULT (datetime('now')),
      read_at TEXT
    );
  `);
}

// JSONL audit log
const EVENTS_JSONL = path.join(DATA_DIR, 'events.jsonl');

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (!API_TOKEN) return next(); // dev mode
  const token = req.headers['x-api-token'] || req.query.token;
  if (token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── SSE Streaming (Phase 2 Instant Triggers) ─────────────────────────────────
const sseClients = new Map(); // agent_id -> res

app.get('/api/stream', (req, res) => {
  const agent_id = req.query.agent_id;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required for stream' });

  // Optional auth
  if (API_TOKEN) {
    const token = req.headers['x-api-token'] || req.query.token;
    if (token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.set(agent_id, res);
  res.write(`data: ${JSON.stringify({ type: 'connected', agent_id })}\n\n`);

  // Heartbeat to keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(agent_id);
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public: dashboard UI
app.get('/dashboard', (req, res) => {
  const dashPath = path.join(__dirname, 'dashboard.html');
  if (fs.existsSync(dashPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fs.readFileSync(dashPath, 'utf8'));
  } else {
    res.status(404).send('Dashboard not found');
  }
});

// Public: root landing
app.get('/', (req, res) => {
  const agentCount = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  res.json({
    service: 'CMF Mission Control Server',
    version: '0.2.0',
    status: 'running',
    endpoints: [
      'GET  /dashboard  (可视化面板)',
      'GET  /health',
      'GET  /api/overview',
      'GET  /api/status/all',
      'GET  /api/events',
      'GET  /api/tasks',
      'GET  /api/decisions',
      'GET  /api/messages',
      'POST /api/status',
      'POST /api/event',
      'POST /api/task',
      'POST /api/decision',
      'POST /api/message',
      'POST /api/message/read'
    ],
    db: { agents: agentCount, events: eventCount }
  });
});

// Public: health check
app.get('/health', (req, res) => {
  const agentCount = db.prepare('SELECT COUNT(*) as c FROM agent_status').get().c;
  const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  res.json({
    status: 'ok',
    service: 'cmf-mission-control',
    version: '0.2.0',
    db: { agents: agentCount, events: eventCount }
  });
});

// POST /api/status - Agent 上报状态
app.post('/api/status', auth, (req, res) => {
  const {
    agent_id, agent_name, status, current_task_id, current_task_desc,
    task_started_at, model_name, tokens_used, tokens_limit,
    last_output_quality
  } = req.body;

  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

  const validStatuses = ['online', 'working', 'idle', 'error', 'unresponsive'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO agent_status (agent_id, agent_name, status, current_task_id, current_task_desc,
      task_started_at, model_name, tokens_used, tokens_limit, last_output_quality,
      last_heartbeat, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      agent_name = COALESCE(excluded.agent_name, agent_name),
      status = COALESCE(excluded.status, status),
      current_task_id = COALESCE(excluded.current_task_id, current_task_id),
      current_task_desc = COALESCE(excluded.current_task_desc, current_task_desc),
      task_started_at = COALESCE(excluded.task_started_at, task_started_at),
      model_name = COALESCE(excluded.model_name, model_name),
      tokens_used = COALESCE(excluded.tokens_used, tokens_used),
      tokens_limit = COALESCE(excluded.tokens_limit, tokens_limit),
      last_output_quality = COALESCE(excluded.last_output_quality, last_output_quality),
      last_heartbeat = excluded.last_heartbeat,
      updated_at = excluded.updated_at
  `).run(
    agent_id, agent_name || null, status || 'idle',
    current_task_id || null, current_task_desc || null, task_started_at || null,
    model_name || null, tokens_used || 0, tokens_limit || 0,
    last_output_quality || null, now, now
  );

  res.json({ ok: true, timestamp: now });
});

// POST /api/event - 写入事件
app.post('/api/event', auth, (req, res) => {
  const {
    event_type, agent_id, target_agent_id, task_id,
    summary, detail, model_name, tokens_used, severity
  } = req.body;

  if (!event_type || !summary) {
    return res.status(400).json({ error: 'event_type and summary required' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO events (event_type, agent_id, target_agent_id, task_id,
      summary, detail, model_name, tokens_used, severity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event_type, agent_id || null, target_agent_id || null, task_id || null,
    summary, detail || null, model_name || null, tokens_used || null,
    severity || 'info', now
  );

  // Append to JSONL audit log
  const row = { id: result.lastInsertRowid, event_type, agent_id, summary, severity: severity || 'info', created_at: now };
  fs.appendFileSync(EVENTS_JSONL, JSON.stringify(row) + '\n');

  res.json({ ok: true, id: result.lastInsertRowid });
});

// POST /api/task - 创建/更新任务
app.post('/api/task', auth, (req, res) => {
  const { task_id, title, description, assigned_by, assigned_to, status, priority, result_summary } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const tid = task_id || uuidv4();
  const now = new Date().toISOString();
  const completed_at = (status === 'done' || status === 'failed') ? now : null;

  db.prepare(`
    INSERT INTO tasks (task_id, title, description, assigned_by, assigned_to,
      status, priority, result_summary, created_at, updated_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      title = excluded.title,
      description = COALESCE(excluded.description, description),
      assigned_by = COALESCE(excluded.assigned_by, assigned_by),
      assigned_to = COALESCE(excluded.assigned_to, assigned_to),
      status = COALESCE(excluded.status, status),
      priority = COALESCE(excluded.priority, priority),
      result_summary = COALESCE(excluded.result_summary, result_summary),
      updated_at = excluded.updated_at,
      completed_at = COALESCE(excluded.completed_at, completed_at)
  `).run(
    tid, title, description || null, assigned_by || null, assigned_to || null,
    status || 'pending', priority || 'p2', result_summary || null,
    now, now, completed_at
  );

  res.json({ ok: true, task_id: tid });
});

// POST /api/decision - 记录决策
app.post('/api/decision', auth, (req, res) => {
  const { title, participants, conclusion, action_items, decided_by } = req.body;
  if (!title || !conclusion) return res.status(400).json({ error: 'title and conclusion required' });

  const result = db.prepare(`
    INSERT INTO decisions (title, participants, conclusion, action_items, decided_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    title,
    participants ? JSON.stringify(participants) : null,
    conclusion,
    action_items ? JSON.stringify(action_items) : null,
    decided_by || null
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// POST /api/message - 发送点对点消息
app.post('/api/message', auth, (req, res) => {
  const { from_agent, to_agent, thread_id, content } = req.body;
  if (!from_agent || !to_agent || !content) return res.status(400).json({ error: 'from_agent, to_agent, and content required' });

  const final_thread = thread_id || uuidv4();
  const result = db.prepare(`
    INSERT INTO messages (from_agent, to_agent, thread_id, content)
    VALUES (?, ?, ?, ?)
  `).run(from_agent, to_agent, final_thread, content);

  const msgId = result.lastInsertRowid;

  // Real-time SSE push if target agent is listening
  if (sseClients.has(to_agent)) {
    const payload = JSON.stringify({
      type: 'new_message',
      message: { id: msgId, from_agent, to_agent, thread_id: final_thread, content, status: 'unread' }
    });
    sseClients.get(to_agent).write(`data: ${payload}\n\n`);
  }

  res.json({ ok: true, id: msgId, thread_id: final_thread });
});

// POST /api/message/read - 标记消息为已读
app.post('/api/message/read', auth, (req, res) => {
  const { message_id } = req.body;
  if (!message_id) return res.status(400).json({ error: 'message_id required' });

  db.prepare(`UPDATE messages SET status = 'read', read_at = datetime('now') WHERE id = ?`).run(message_id);
  res.json({ ok: true });
});

// GET /api/messages - 查询消息
app.get('/api/messages', auth, (req, res) => {
  const { to_agent, from_agent, thread_id, status, limit = 50 } = req.query;
  let query = 'SELECT * FROM messages WHERE 1=1';
  const params = [];
  if (to_agent) { query += ' AND to_agent = ?'; params.push(to_agent); }
  if (from_agent) { query += ' AND from_agent = ?'; params.push(from_agent); }
  if (thread_id) { query += ' AND thread_id = ?'; params.push(thread_id); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  res.json({ messages: db.prepare(query).all(...params) });
});

// GET /api/overview - 团队总览
app.get('/api/overview', auth, (req, res) => {
  const agents = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  const recentEvents = db.prepare(
    'SELECT * FROM events ORDER BY created_at DESC LIMIT 20'
  ).all();
  const criticalAlerts = db.prepare(
    "SELECT * FROM events WHERE severity IN ('error','critical') ORDER BY created_at DESC LIMIT 10"
  ).all();
  const activeTasks = db.prepare(
    "SELECT * FROM tasks WHERE status IN ('pending','in_progress','blocked') ORDER BY priority, created_at LIMIT 20"
  ).all();
  const recentDecisions = db.prepare(
    'SELECT * FROM decisions ORDER BY created_at DESC LIMIT 5'
  ).all();

  const statusCounts = agents.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  res.json({
    summary: {
      total_agents: agents.length,
      ...statusCounts,
      active_tasks: activeTasks.length,
      recent_alerts: criticalAlerts.length,
    },
    agents,
    active_tasks: activeTasks,
    critical_alerts: criticalAlerts,
    recent_decisions: recentDecisions,
    recent_events: recentEvents,
  });
});

// GET /api/status/all - 所有 Agent 最新状态
app.get('/api/status/all', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  res.json({ agents: rows });
});

// GET /api/events - 查询事件流
app.get('/api/events', auth, (req, res) => {
  const { agent_id, event_type, severity, date, limit = 50 } = req.query;
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  if (agent_id) { query += ' AND agent_id = ?'; params.push(agent_id); }
  if (event_type) { query += ' AND event_type = ?'; params.push(event_type); }
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  if (date) { query += ' AND date(created_at) = ?'; params.push(date); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json({ events: db.prepare(query).all(...params) });
});

// GET /api/tasks - 查询任务
app.get('/api/tasks', auth, (req, res) => {
  const { assigned_to, status, priority, limit = 50 } = req.query;
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (assigned_to) { query += ' AND assigned_to = ?'; params.push(assigned_to); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  query += ' ORDER BY priority, created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json({ tasks: db.prepare(query).all(...params) });
});

// GET /api/decisions - 查询决策记录
app.get('/api/decisions', auth, (req, res) => {
  const { limit = 20 } = req.query;
  const rows = db.prepare('SELECT * FROM decisions ORDER BY created_at DESC LIMIT ?').all(parseInt(limit));
  res.json({ decisions: rows });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CMF Mission Control Server v0.2.0`);
  console.log(`   Port:     ${PORT}`);
  console.log(`   DB:       ${DB_PATH}`);
  console.log(`   Auth:     ${API_TOKEN ? 'enabled (API_TOKEN set)' : 'DISABLED (dev mode)'}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
});
