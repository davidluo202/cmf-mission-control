#!/usr/bin/env node
/**
 * Nova → Mission Control Status Reporter
 * 
 * 独立运行：每隔 N 秒向 Mission Control 推送 Nova 的工作状态
 * 通过读取 OpenClaw session 日志来判断 Nova 当前在做什么
 * 
 * 运行：
 *   MC_URL=http://xxx:8765 node nova-mc-reporter.js
 *   pm2 start nova-mc-reporter.js --name nova-mc-reporter
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MC_URL = process.env.MC_URL || process.env.MISSION_CONTROL_URL || 'http://100.107.235.107:8765';
const MC_TOKEN = process.env.MC_TOKEN || 'cmf-mc-token-2026';
const AGENT_ID = 'Nova';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '15000');

// OpenClaw session logs path
const SESSION_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'cmf-coding-ai', 'sessions');
const MEMORY_DIR = path.join(os.homedir(), '.openclaw', 'workspace-cmfcoding', 'memory');

function post(path, body) {
  return new Promise((resolve) => {
    const url = new URL(MC_URL + path);
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
        'x-api-token': MC_TOKEN,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
    req.write(data);
    req.end();
  });
}

function getLatestSessionInfo() {
  try {
    if (!fs.existsSync(SESSION_DIR)) return null;
    
    // Get most recently modified session file
    const files = fs.readdirSync(SESSION_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(SESSION_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) return null;
    
    const latestFile = path.join(SESSION_DIR, files[0].name);
    const ageMs = Date.now() - files[0].mtime;
    
    // Read last few lines of the session
    const content = fs.readFileSync(latestFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    // Parse last assistant message to get current task
    let lastTask = '';
    let lastUserMsg = '';
    
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (!lastTask && entry.role === 'assistant' && entry.content) {
          const text = Array.isArray(entry.content)
            ? entry.content.find(c => c.type === 'text')?.text || ''
            : (typeof entry.content === 'string' ? entry.content : '');
          if (text.length > 10) {
            // Take first 80 chars as task summary
            lastTask = text.slice(0, 80).replace(/\n/g, ' ').trim();
            break;
          }
        }
      } catch {}
    }
    
    // Session age determines status
    const isActive = ageMs < 5 * 60 * 1000; // active if modified in last 5 min
    
    return {
      isActive,
      ageMs,
      lastTask: lastTask || 'Session active',
      sessionFile: files[0].name,
    };
  } catch (e) {
    return null;
  }
}

function getTodayMemoryTask() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    
    for (const date of [today, yesterday]) {
      const f = path.join(MEMORY_DIR, `${date}.md`);
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        // Get last non-empty line as recent task
        const lines = content.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) {
          return lines[lines.length - 1].replace(/^[-*•]\s*/, '').slice(0, 100);
        }
      }
    }
  } catch {}
  return null;
}

let lastEventTime = 0;

async function report() {
  const session = getLatestSessionInfo();
  const memTask = getTodayMemoryTask();
  
  let status = 'IDLE';
  let task = memTask || 'No active tasks';
  let progress = 0;
  
  if (session) {
    if (session.isActive) {
      status = 'RUNNING';
      task = session.lastTask || memTask || 'Processing request';
      progress = 50;
    } else {
      status = 'IDLE';
      task = memTask || 'Awaiting tasks';
    }
  }
  
  // Push status
  const ok = await post('/api/agents', {
    agent_id: AGENT_ID,
    status,
    current_task: task,
    progress_pct: progress,
    reason_code: null,
    needs_owner: null,
  });
  
  if (ok) {
    console.log(`[Nova Reporter] status=${status} task="${task.slice(0, 50)}..."`);
  } else {
    console.warn(`[Nova Reporter] Failed to push to ${MC_URL}`);
  }
  
  // Push heartbeat event every 5 minutes
  const now = Date.now();
  if (now - lastEventTime > 5 * 60 * 1000) {
    lastEventTime = now;
    await post('/api/events', {
      agent_id: AGENT_ID,
      type: 'heartbeat',
      summary: `Nova heartbeat: ${status}`,
      priority: 'low',
      detail: task,
    });
  }
}

console.log(`[Nova Reporter] Starting. MC: ${MC_URL} | Interval: ${INTERVAL_MS}ms`);
report();
setInterval(report, INTERVAL_MS);
