#!/usr/bin/env node
/**
 * Nova ↔ Mission Control ChatRoom Bridge
 * 
 * 功能：
 *  1. 定期拉 ChatRoom 消息
 *  2. 看到 @Nova 的新消息 → 通过 Telegram Bot 推送到群组
 *  3. 更新 Nova 在 Dashboard 的状态
 *  4. 上报 Nova 心跳 event
 * 
 * 运行方式：
 *   node nova-chatroom-bridge.js
 *   或加入 pm2: pm2 start nova-chatroom-bridge.js --name nova-mc-bridge
 * 
 * 环境变量：
 *   MISSION_CONTROL_URL  (default: http://100.107.235.107:8765)
 *   MC_TOKEN             (default: cmf-mc-token-2026)
 *   TG_BOT_TOKEN         Telegram Bot Token (cmfcoding_bot)
 *   TG_GROUP_ID          Telegram Group ID (e.g. -1003872131933)
 *   POLL_INTERVAL_MS     Poll interval in ms (default: 10000)
 */

const mc = require('../agent-sdk');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MC_URL = process.env.MISSION_CONTROL_URL || 'http://100.107.235.107:8765';
const MC_TOKEN = process.env.MC_TOKEN || 'cmf-mc-token-2026';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_GROUP_ID = process.env.TG_GROUP_ID || '-1003872131933';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000');
const STATE_FILE = path.join(__dirname, '.nova-bridge-state.json');

mc.init({ agentId: 'Nova', token: MC_TOKEN, baseUrl: MC_URL, silent: false });

// Load persisted last-seen timestamp
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

// Send Telegram message
function sendTelegram(text) {
  if (!TG_BOT_TOKEN) {
    console.log('[Nova Bridge] No TG_BOT_TOKEN set, skipping Telegram notify');
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
    req.on('error', e => { console.warn('[Nova Bridge] TG send failed:', e.message); resolve(null); });
    req.write(body);
    req.end();
  });
}

async function poll() {
  const state = loadState();
  
  // Fetch new messages
  const newMessages = await mc.pollMessages(state.lastSeenAt, 100);
  
  if (newMessages.length > 0) {
    // Update last seen
    const latest = newMessages[newMessages.length - 1];
    state.lastSeenAt = latest.timestamp;
    saveState(state);
    
    // Check for @Nova mentions
    for (const msg of newMessages) {
      if (msg.sender === 'Nova') continue; // skip own messages
      
      const mentions = (() => {
        try { return msg.mentions ? JSON.parse(msg.mentions) : []; } catch { return []; }
      })();
      
      const contentMentionsNova = msg.content && (
        msg.content.includes('@Nova') || 
        msg.content.includes('@nova') ||
        mentions.some(m => m.toLowerCase() === 'nova')
      );
      
      if (contentMentionsNova) {
        const topic = msg.topic ? ` [#${msg.topic}]` : '';
        const tgText = `🏛️ *Mission Control ChatRoom*${topic}\n*${msg.sender}* @Nova 你:\n\n${msg.content}`;
        console.log(`[Nova Bridge] @mention from ${msg.sender}: ${msg.content}`);
        await sendTelegram(tgText);
        
        // Log to timeline
        mc.event('chat_message', `@Nova mentioned by ${msg.sender}`, {
          detail: msg.content,
          priority: 'high',
        });
      }
    }
  }
  
  // Heartbeat: update Nova status every poll
  mc.setStatus('RUNNING', 'Monitoring ChatRoom & development tasks', 0);
}

// Initial status push
mc.setStatus('RUNNING', 'Nova ChatRoom Bridge started', 0);
mc.event('task_started', 'Nova ChatRoom bridge online', { detail: `Polling every ${POLL_INTERVAL}ms` });

console.log(`[Nova Bridge] Started. Polling ${MC_URL} every ${POLL_INTERVAL}ms`);

// Poll loop
poll(); // immediate first poll
setInterval(poll, POLL_INTERVAL);
