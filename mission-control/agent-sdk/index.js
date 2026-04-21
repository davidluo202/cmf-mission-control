/**
 * Mission Control Agent SDK
 * Canton Financial AI Team
 * 
 * Usage:
 *   const mc = require('./mission-control/agent-sdk');
 *   mc.init({ agentId: 'nova', token: 'cmf-mc-token-2026', baseUrl: 'https://cmf-mission-control-production.up.railway.app' });
 *   mc.setStatus('RUNNING', 'Building ChatRoom feature', 60);
 *   mc.event('task_started', 'Starting feature X', { detail: '...' });
 *   mc.incident('RATE_LIMIT', 'Hit OpenAI rate limit', 'Retry in 60s');
 *   mc.startHeartbeat(300000); // ping every 5 minutes to stay ONLINE
 */

const https = require('https');
const http = require('http');

let _config = {
  agentId: 'unknown',
  token: 'cmf-mc-token-2026',
  baseUrl: process.env.MISSION_CONTROL_URL || 'https://cmf-mission-control-production.up.railway.app',
  silent: false, // set true to suppress console logs
};

function init(config) {
  _config = { ..._config, ...config };
}

function _post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(_config.baseUrl + path);
    const data = JSON.stringify(body);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-token': _config.token,
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', (e) => {
      if (!_config.silent) console.warn(`[MC] POST ${path} failed: ${e.message}`);
      resolve(null); // never throw — agent work must not be blocked by MC failures
    });
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

/**
 * Update this agent's status on the dashboard
 * @param {string} status  RUNNING | IDLE | WAITING_AUTH | WAITING_DECISION | BLOCKED | ERROR
 * @param {string} task    Human-readable description of current task
 * @param {number} pct     Progress 0-100
 * @param {object} opts    {
 *   reason_code,        // error/block reason code
 *   needs_owner,        // which human needs to act
 *   model,              // current AI model, e.g. "claude-opus-4-6"
 *   model_usage,        // { tokens_used, quota, pct } — model token usage
 *   last_task,          // last completed task description
 *   last_task_at,       // ISO timestamp of last task completion
 *   needs_support_from, // which agent(s) you need help from, e.g. "Icy,Nova"
 *   offline_reason,     // human-readable reason if ERROR/OFFLINE
 * }
 */
function setStatus(status, task = '', pct = 0, opts = {}) {
  return _post('/api/agents', {
    agent_id: _config.agentId,
    status,
    current_task: task,
    progress_pct: pct,
    reason_code: opts.reason_code || null,
    needs_owner: opts.needs_owner || null,
    model: opts.model || null,
    model_usage: opts.model_usage || null,
    last_task: opts.last_task || null,
    last_task_at: opts.last_task_at || null,
    needs_support_from: opts.needs_support_from || null,
    offline_reason: opts.offline_reason || null,
  });
}

/**
 * Log an event to the agent's timeline
 * @param {string} type     task_started | task_completed | tool_called | tool_result | blocked | resumed | error_occurred | chat_message
 * @param {string} summary  Short summary
 * @param {object} opts     { detail, priority, links, next_actions, target_agent }
 */
function event(type, summary, opts = {}) {
  return _post('/api/events', {
    agent_id: _config.agentId,
    type,
    summary,
    priority: opts.priority || 'normal',
    detail: opts.detail || null,
    links: opts.links || null,
    next_actions: opts.next_actions || null,
    target_agent: opts.target_agent || null,
  });
}

/**
 * Submit an incident (error / block)
 * @param {string} reason_code     RATE_LIMIT | BILLING_EXHAUSTED | AUTH_FAILED | BLOCKED | etc.
 * @param {string} human_message   Human-readable description
 * @param {string} next_action     What should be done to resolve
 */
function incident(reason_code, human_message, next_action = '') {
  return _post('/api/incidents', {
    agent_id: _config.agentId,
    reason_code,
    human_message,
    next_action,
  });
}

/**
 * Send a message to the Chat Room
 * @param {string} content    Message content
 * @param {object} opts       { topic, mentions: string[] }
 */
function chat(content, opts = {}) {
  const { v4: uuidv4 } = (() => {
    try { return require('uuid'); } catch { return { v4: () => Math.random().toString(36).slice(2) }; }
  })();
  return _post('/api/chatroom/messages', {
    sender: _config.agentId,
    content,
    topic: opts.topic || null,
    mentions: opts.mentions || null,
    client_message_id: uuidv4(),
  });
}

/**
 * Submit a proposal for decision
 * @param {string} title          Title
 * @param {string} decision_level ICY | DAVID
 * @param {object} opts           { impact, cost, reason }
 */
function propose(title, decision_level, opts = {}) {
  return _post('/api/proposals', {
    author: _config.agentId,
    title,
    decision_level,
    impact: opts.impact || null,
    cost: opts.cost || '0',
    reason: opts.reason || null,
  });
}

/**
 * Send a lightweight heartbeat ping to keep this agent ONLINE on the dashboard.
 * Does not change status/task — just updates updated_at.
 */
function heartbeat() {
  return _post(`/api/agents/${_config.agentId}/heartbeat`, {});
}

/**
 * Start a recurring heartbeat timer.
 * @param {number} intervalMs  Interval in ms (default: 5 minutes)
 * @returns {NodeJS.Timeout}   The interval handle (call clearInterval to stop)
 */
function startHeartbeat(intervalMs = 5 * 60 * 1000) {
  heartbeat(); // ping immediately
  return setInterval(() => heartbeat(), intervalMs);
}

function _get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(_config.baseUrl + path);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'x-api-token': _config.token },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', (e) => {
      if (!_config.silent) console.warn(`[MC] GET ${path} failed: ${e.message}`);
      resolve(null);
    });
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Fetch recent chat messages
 * @param {number} limit  Max messages to fetch (default 50)
 */
function getMessages(limit = 50) {
  return _get(`/api/chatroom/messages?limit=${limit}`);
}

/**
 * Poll for new messages since a given timestamp (ISO string)
 * Returns only messages newer than sinceTimestamp
 * @param {string} sinceTimestamp  ISO timestamp string
 * @param {number} limit
 */
async function pollMessages(sinceTimestamp, limit = 50) {
  const result = await getMessages(limit);
  if (!result || !result.messages) return [];
  return result.messages.filter(m => new Date(m.timestamp) > new Date(sinceTimestamp));
}

module.exports = { init, setStatus, event, incident, chat, propose, getMessages, pollMessages, heartbeat, startHeartbeat };
