/**
 * Mission Control Server - Canton Financial AI Team
 * Phase 1: REST API + SQLite
 * Author: Nova (CMF Lead Developer)
 * Version: 0.1.0 | 2026-03-21
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

// Setup
app.use(cors());
app.use(express.json());
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Database
const db = new Database(path.join(DATA_DIR, 'mission_control.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_status (
    agent_id TEXT PRIMARY KEY,
    timestamp TEXT,
    status TEXT,
    current_task TEXT,
    progress_pct INTEGER,
    blocked_by TEXT,
    next_checkin TEXT,
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
  CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  CREATE INDEX IF NOT EXISTS idx_events_priority ON events(priority);
`);

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  if (token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// === Routes ===

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mission-control', version: '0.1.0' });
});

// POST /api/status - Agent 上报状态
app.post('/api/status', auth, (req, res) => {
  const { agent_id, timestamp, status, current_task, progress_pct, blocked_by, next_checkin } = req.body;
  if (!agent_id || !status) return res.status(400).json({ error: 'agent_id and status required' });

  const validStatuses = ['idle', 'working', 'blocked', 'needs_approval', 'offline'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare(`
    INSERT OR REPLACE INTO agent_status (agent_id, timestamp, status, current_task, progress_pct, blocked_by, next_checkin, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(agent_id, timestamp || new Date().toISOString(), status, current_task, progress_pct || 0, blocked_by, next_checkin);

  res.json({ ok: true });
});

// POST /api/event - 写入事件
app.post('/api/event', auth, (req, res) => {
  const { agent_id, timestamp, type, priority, summary, detail, links, next_actions, target_agent } = req.body;
  if (!agent_id || !type || !summary) return res.status(400).json({ error: 'agent_id, type, summary required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO events (id, agent_id, timestamp, type, priority, summary, detail, links, next_actions, target_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, agent_id,
    timestamp || new Date().toISOString(),
    type, priority || 'normal', summary,
    detail || null,
    links ? JSON.stringify(links) : null,
    next_actions ? JSON.stringify(next_actions) : null,
    target_agent || null
  );

  // Also append to JSONL file for human-readable audit
  const jsonlPath = path.join(DATA_DIR, 'events.jsonl');
  fs.appendFileSync(jsonlPath, JSON.stringify({ id, agent_id, timestamp, type, priority, summary }) + '\n');

  res.json({ ok: true, id });
});

// GET /api/status/all - 获取所有 Agent 最新状态
app.get('/api/status/all', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  res.json({ agents: rows });
});

// GET /api/overview - 团队总览
app.get('/api/overview', auth, (req, res) => {
  const agents = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all();
  const recentEvents = db.prepare(
    "SELECT * FROM events ORDER BY timestamp DESC LIMIT 20"
  ).all();
  const criticalAlerts = db.prepare(
    "SELECT * FROM events WHERE priority='critical' ORDER BY timestamp DESC LIMIT 10"
  ).all();
  const todayDone = db.prepare(
    "SELECT COUNT(*) as count FROM events WHERE type='task_done' AND date(timestamp) = date('now')"
  ).get();
  const escalations = db.prepare(
    "SELECT * FROM events WHERE type LIKE 'escalate%' ORDER BY timestamp DESC LIMIT 5"
  ).all();

  res.json({
    summary: {
      total_agents: agents.length,
      working: agents.filter(a => a.status === 'working').length,
      blocked: agents.filter(a => a.status === 'blocked').length,
      needs_approval: agents.filter(a => a.status === 'needs_approval').length,
      tasks_done_today: todayDone.count
    },
    agents,
    critical_alerts: criticalAlerts,
    escalations,
    recent_events: recentEvents
  });
});

// GET /api/events - 查询事件流
app.get('/api/events', auth, (req, res) => {
  const { agent_id, type, priority, date, limit = 50 } = req.query;
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  if (agent_id) { query += ' AND agent_id = ?'; params.push(agent_id); }
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (date) { query += ' AND date(timestamp) = ?'; params.push(date); }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = db.prepare(query).all(...params);
  res.json({ events: rows, count: rows.length });
});

// Start
app.listen(PORT, process.env.BIND_HOST || '0.0.0.0', () => {
  console.log(`✅ Mission Control Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Data dir: ${DATA_DIR}`);
});
