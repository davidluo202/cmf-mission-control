#!/usr/bin/env node
/**
 * Generic Agent ↔ Mission Control Bridge
 * 适用于：Icy / Qual / Imax / 任意 Agent
 * 
 * 只需修改下面的 AGENT_CONFIG 即可接入
 * 
 * 运行：
 *   AGENT_ID=Qual TG_BOT_TOKEN=xxx node generic-agent-bridge.js
 *   pm2 start generic-agent-bridge.js --name qual-mc-bridge -- --agent=Qual
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── 配置区（按 Agent 修改） ────────────────────────────────────────
const AGENT_CONFIG = {
  // Agent ID（显示在 Dashboard 上的名字）
  agentId: process.env.AGENT_ID || 'Qual',

  // Mission Control 地址
  mcUrl: process.env.MC_URL || process.env.MISSION_CONTROL_URL || 'http://100.107.235.107:8765',
  mcToken: process.env.MC_TOKEN || 'cmf-mc-token-2026',

  // Telegram 通知配置（收到 @mention 时通知）
  tgBotToken: process.env.TG_BOT_TOKEN || '',
  tgGroupId: process.env.TG_GROUP_ID || '-1003872131933',

  // 轮询间隔（ms）
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '10000'),

  // OpenClaw session 目录（用于读取工作状态，可为 null）
  sessionDir: process.env.SESSION_DIR || null,
  // 例如: /Users/xxx/.openclaw/agents/icy-ai/sessions

  // 初始状态
  initialStatus: process.env.INITIAL_STATUS || 'IDLE',
  initialTask: process.env.INITIAL_TASK || 'Standing by',
};
// ────────────────────────────────────────────────────────────────────

const STATE_FILE = path.join(__dirname, `.${AGENT_CONFIG.agentId.toLowerCase()}-bridge-state.json`);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastSeenAt: new Date(0).toISOString() }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function apiPost(apiPath, body) {
  return new Promise((resolve) => {
    const url = new URL(AGENT_CONFIG.mcUrl + apiPath);
    const data = JSON.stringify(body);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'x-api-token': AGENT_CONFIG.mcToken },
    }, res => { let r = ''; res.on('data', c => r += c); res.on('end', () => resolve(true)); });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
    req.write(data); req.end();
  });
}

function apiGet(apiPath) {
  return new Promise((resolve) => {
    const url = new URL(AGENT_CONFIG.mcUrl + apiPath);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search, method: 'GET',
      headers: { 'x-api-token': AGENT_CONFIG.mcToken },
    }, res => { let r = ''; res.on('data', c => r += c); res.on('end', () => { try { resolve(JSON.parse(r)); } catch { resolve(null); } }); });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function sendTelegram(text) {
  if (!AGENT_CONFIG.tgBotToken) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: AGENT_CONFIG.tgGroupId, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${AGENT_CONFIG.tgBotToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { let r = ''; res.on('data', c => r += c); res.on('end', () => resolve(JSON.parse(r))); });
    req.on('error', e => { console.warn('[Bridge] TG error:', e.message); resolve(null); });
    req.write(body); req.end();
  });
}

function getSessionStatus() {
  if (!AGENT_CONFIG.sessionDir || !fs.existsSync(AGENT_CONFIG.sessionDir)) return null;
  try {
    const files = fs.readdirSync(AGENT_CONFIG.sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(AGENT_CONFIG.sessionDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return null;
    const ageMs = Date.now() - files[0].mtime;
    const isActive = ageMs < 5 * 60 * 1000;
    let lastTask = '';
    const content = fs.readFileSync(path.join(AGENT_CONFIG.sessionDir, files[0].name), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      try {
        const e = JSON.parse(lines[i]);
        if (e.role === 'assistant' && e.content) {
          const text = Array.isArray(e.content) ? e.content.find(c => c.type === 'text')?.text || '' : (typeof e.content === 'string' ? e.content : '');
          if (text.length > 10) { lastTask = text.slice(0, 100).replace(/\n/g, ' '); break; }
        }
      } catch {}
    }
    return { isActive, task: lastTask || 'Session active' };
  } catch { return null; }
}

async function poll() {
  const state = loadState();
  const agentName = AGENT_CONFIG.agentId;

  // Fetch new @mention messages
  const result = await apiGet(`/api/chatroom/messages?limit=100`);
  if (result?.messages) {
    const newMsgs = result.messages.filter(m => new Date(m.timestamp) > new Date(state.lastSeenAt) && m.sender !== agentName);
    if (newMsgs.length > 0) {
      state.lastSeenAt = newMsgs[newMsgs.length - 1].timestamp;
      saveState(state);
      for (const msg of newMsgs) {
        const mentions = (() => { try { return msg.mentions ? JSON.parse(msg.mentions) : []; } catch { return []; } })();
        const mentioned = msg.content?.includes(`@${agentName}`) || mentions.some(m => m.toLowerCase() === agentName.toLowerCase());
        if (mentioned) {
          const topic = msg.topic ? ` [#${msg.topic}]` : '';
          await sendTelegram(`🏛️ *Mission Control*${topic}\n*${msg.sender}* @${agentName} 你:\n\n${msg.content}`);
          await apiPost('/api/events', { agent_id: agentName, type: 'chat_message', summary: `@${agentName} mentioned by ${msg.sender}`, detail: msg.content, priority: 'high' });
        }
      }
    }
  }

  // Update agent status
  const session = getSessionStatus();
  const status = session?.isActive ? 'RUNNING' : AGENT_CONFIG.initialStatus;
  const task = session?.task || AGENT_CONFIG.initialTask;
  await apiPost('/api/agents', { agent_id: agentName, status, current_task: task, progress_pct: 0 });
  console.log(`[${agentName} Bridge] ${status} | ${task.slice(0, 60)}`);
}

// Startup
apiPost('/api/agents', { agent_id: AGENT_CONFIG.agentId, status: AGENT_CONFIG.initialStatus, current_task: `${AGENT_CONFIG.agentId} bridge started`, progress_pct: 0 });
apiPost('/api/events', { agent_id: AGENT_CONFIG.agentId, type: 'task_started', summary: `${AGENT_CONFIG.agentId} bridge online`, priority: 'normal' });

console.log(`[${AGENT_CONFIG.agentId} Bridge] MC: ${AGENT_CONFIG.mcUrl} | Poll: ${AGENT_CONFIG.pollInterval}ms`);
poll();
setInterval(poll, AGENT_CONFIG.pollInterval);
