#!/usr/bin/env node
/**
 * NAS-ubuntu-AI ↔ Mission Control ChatRoom Bridge
 * 
 * 功能：
 *  1. 定期拉 ChatRoom 消息
 *  2. 看到 @Nas 的新消息 → 通过 Telegram Bot 推送到群组
 *  3. 更新 NAS-ubuntu-AI 在 Dashboard 的状态（CPU/内存/服务状态）
 *  4. 上报 NAS 心跳事件
 *  5. 检测 Mission Control 服务健康，异常时自动 revive + 通报
 * 
 * 运行方式（在 NAS 上）：
 *   node nas-chatroom-bridge.js
 *   pm2 start nas-chatroom-bridge.js --name nas-mc-bridge
 * 
 * 环境变量：
 *   MISSION_CONTROL_URL  (default: http://localhost:8765)
 *   MC_TOKEN             (default: cmf-mc-token-2026)
 *   TG_BOT_TOKEN         Telegram Bot Token (nasubuntudavid_bot token)
 *   TG_GROUP_ID          Telegram Group ID (e.g. -1003872131933)
 *   POLL_INTERVAL_MS     Poll interval in ms (default: 10000)
 */

const mc = require('/opt/mission-control/../cmf-mission-control/mission-control/agent-sdk');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MC_URL = process.env.MISSION_CONTROL_URL || 'http://localhost:8765';
const MC_TOKEN = process.env.MC_TOKEN || 'cmf-mc-token-2026';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_GROUP_ID = process.env.TG_GROUP_ID || '-1003872131933';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000');
const HEALTH_INTERVAL = parseInt(process.env.HEALTH_INTERVAL_MS || '60000');
const STATE_FILE = path.join(__dirname, '.nas-bridge-state.json');

mc.init({ agentId: 'Nas', token: MC_TOKEN, baseUrl: MC_URL, silent: false });

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastSeenAt: new Date(0).toISOString() };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sendTelegram(text) {
  if (!TG_BOT_TOKEN) {
    console.log('[NAS Bridge] No TG_BOT_TOKEN, skipping Telegram notify');
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TG_GROUP_ID, text, parse_mode: 'Markdown' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TG_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', e => { console.warn('[NAS Bridge] TG send failed:', e.message); resolve(null); });
    req.write(body);
    req.end();
  });
}

function getNasStats() {
  try {
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedPct = Math.round((1 - os.freemem() / os.totalmem()) * 100);

    let pm2Status = '';
    try {
      pm2Status = execSync('pm2 jlist 2>/dev/null', { timeout: 3000 }).toString();
      const procs = JSON.parse(pm2Status);
      pm2Status = procs.map(p => `${p.name}:${p.pm2_env.status}`).join(', ');
    } catch {
      pm2Status = 'pm2 unavailable';
    }

    return { cpuLoad, totalMem, freeMem, usedPct, pm2Status };
  } catch (e) {
    return null;
  }
}

// Check Mission Control health
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${MC_URL}/health`, { timeout: 3000 }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve(data.status === 'running');
        } catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

let lastHealthOk = true;

async function healthCheck() {
  const healthy = await checkHealth();
  if (!healthy && lastHealthOk) {
    // Server just went down
    console.warn('[NAS Bridge] Mission Control server DOWN, attempting restart...');
    try {
      execSync('pm2 restart mission-control', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 3000));
      const recovered = await checkHealth();
      if (recovered) {
        mc.event('resumed', 'Mission Control auto-restarted successfully', { priority: 'high' });
        await sendTelegram('⚠️ *NAS Alert*: Mission Control server was down — auto-restarted ✅');
      } else {
        mc.incident('SERVICE_DOWN', 'Mission Control server is down and failed to auto-restart', 'Manual intervention required');
        await sendTelegram('🚨 *NAS Alert*: Mission Control server DOWN — auto-restart FAILED. Manual check needed!');
      }
    } catch (e) {
      mc.incident('SERVICE_DOWN', `Mission Control restart failed: ${e.message}`, 'Check pm2 logs');
    }
  }
  lastHealthOk = healthy;
}

async function poll() {
  const state = loadState();

  // Fetch new messages
  const newMessages = await mc.pollMessages(state.lastSeenAt, 100);

  if (newMessages.length > 0) {
    const latest = newMessages[newMessages.length - 1];
    state.lastSeenAt = latest.timestamp;
    saveState(state);

    for (const msg of newMessages) {
      if (msg.sender === 'Nas') continue;

      const mentions = (() => {
        try { return msg.mentions ? JSON.parse(msg.mentions) : []; } catch { return []; }
      })();

      const mentionsNas = msg.content && (
        msg.content.includes('@Nas') ||
        msg.content.includes('@nas') ||
        mentions.some(m => m.toLowerCase() === 'nas')
      );

      if (mentionsNas) {
        const topic = msg.topic ? ` [#${msg.topic}]` : '';
        const tgText = `🏛️ *Mission Control ChatRoom*${topic}\n*${msg.sender}* @Nas 你:\n\n${msg.content}`;
        console.log(`[NAS Bridge] @mention from ${msg.sender}: ${msg.content}`);
        await sendTelegram(tgText);

        mc.event('chat_message', `@Nas mentioned by ${msg.sender}`, {
          detail: msg.content,
          priority: 'high',
        });
      }
    }
  }

  // Update Nas status with system stats
  const stats = getNasStats();
  if (stats) {
    const task = `CPU: ${stats.cpuLoad} | RAM: ${stats.usedPct}% | ${stats.pm2Status}`;
    mc.setStatus('RUNNING', task, 0);
  } else {
    mc.setStatus('RUNNING', 'NAS Bridge running', 0);
  }
}

// Startup
mc.setStatus('RUNNING', 'NAS Bridge started', 0);
mc.event('task_started', 'NAS ChatRoom bridge online', {
  detail: `MC URL: ${MC_URL} | Poll: ${POLL_INTERVAL}ms`,
});

console.log(`[NAS Bridge] Started. Polling every ${POLL_INTERVAL}ms`);

// Poll loop
poll();
setInterval(poll, POLL_INTERVAL);
setInterval(healthCheck, HEALTH_INTERVAL);
