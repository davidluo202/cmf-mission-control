#!/usr/bin/env node
/**
 * CMF Mission Control Listener (SSE + Pull Fallback)
 * - SSE: real-time wake-ups (0 latency)
 * - Pull: safety net (works even when VPN breaks SSE)
 *
 * Usage:
 *   MC_AGENT_ID=nova MC_TOKEN=cmf-mc-token-2026 node tools/mc-listener.js
 *
 * Optional:
 *   MC_BASE_URL=https://cmf-mission-control-production.up.railway.app
 *   MC_POLL_SECONDS=120
 */

const https = require('https');
const { exec } = require('child_process');

const BASE_URL = process.env.MC_BASE_URL || 'https://cmf-mission-control-production.up.railway.app';
const AGENT_ID = process.env.MC_AGENT_ID;
const TOKEN = process.env.MC_TOKEN;
const POLL_SECONDS = parseInt(process.env.MC_POLL_SECONDS || '120', 10);

if (!AGENT_ID) {
  console.error('Missing env: MC_AGENT_ID');
  process.exit(1);
}
if (!TOKEN) {
  console.error('Missing env: MC_TOKEN');
  process.exit(1);
}

function jsonReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const req = https.request(
      url,
      {
        method,
        headers: {
          'x-api-token': TOKEN,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: data ? JSON.parse(data) : {} });
          } catch (e) {
            resolve({ status: res.statusCode, json: {} });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function wakeOpenClaw(message) {
  const prompt = `[Mission Control 内部通信]\nfrom: ${message.from_agent}\nthread: ${message.thread_id}\ncontent: ${message.content}\n\n请处理并回复（/api/message），完成后标记已读（/api/message/read）。`;

  // NOTE: This assumes openclaw CLI is on PATH.
  exec(`openclaw message send "${prompt.replace(/\"/g, '\\"')}"`, (err) => {
    if (err) console.error('[wake] failed:', err.message);
    else console.log('[wake] ok');
  });
}

async function markRead(id) {
  await jsonReq('POST', '/api/message/read', { message_id: id });
}

async function pollOnce() {
  const path = `/api/messages?to_agent=${encodeURIComponent(AGENT_ID)}&status=unread&limit=50`;
  const r = await jsonReq('GET', path);
  if (r.status !== 200) {
    console.warn('[poll] non-200:', r.status);
    return;
  }
  const msgs = r.json.messages || [];
  if (!msgs.length) return;

  console.log(`[poll] ${msgs.length} unread messages`);
  // process oldest first
  msgs.reverse();
  for (const m of msgs) {
    console.log(`[poll] recv id=${m.id} from=${m.from_agent} thread=${m.thread_id}`);
    wakeOpenClaw(m);
    await markRead(m.id);
  }
}

function startPolling() {
  setInterval(() => {
    pollOnce().catch((e) => console.error('[poll] err:', e.message));
  }, POLL_SECONDS * 1000);

  pollOnce().catch((e) => console.error('[poll] err:', e.message));
}

function startSSE() {
  const url = new URL(BASE_URL + '/api/stream');
  url.searchParams.set('agent_id', AGENT_ID);
  url.searchParams.set('token', TOKEN);

  console.log('[sse] connecting:', url.toString().replace(TOKEN, '***'));

  https
    .get(url, (res) => {
      res.on('data', async (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'new_message' && payload.message) {
              const m = payload.message;
              console.log(`[sse] recv id=${m.id} from=${m.from_agent} thread=${m.thread_id}`);
              wakeOpenClaw(m);
              await markRead(m.id);
            }
          } catch (_) {}
        }
      });
      res.on('end', () => {
        console.warn('[sse] ended, reconnect in 5s');
        setTimeout(startSSE, 5000);
      });
    })
    .on('error', (err) => {
      console.warn('[sse] error:', err.message, 'reconnect in 5s');
      setTimeout(startSSE, 5000);
    });
}

console.log(`MC Listener starting: agent=${AGENT_ID}, poll=${POLL_SECONDS}s`);
startPolling();
startSSE();
