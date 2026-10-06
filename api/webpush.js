// ─── WEB PUSH NOTIFICATIONS (root /api function — reliable on this project) ──
//   GET  /api/webpush                      -> { key } (VAPID public key)
//   POST /api/webpush {action:"subscribe", subscription}  -> store a device
//   POST /api/webpush {action:"send", key, title, body, url} -> admin: push all
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, REDIS_URL, GP_ADMIN_KEY

const Redis = require('ioredis');
const webpush = require('web-push');

let client = null;
function redis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, connectTimeout: 4000, enableOfflineQueue: true, lazyConnect: false });
    client.on('error', () => {});
  }
  return client;
}

const SUBS_KEY = 'gp:push:subs:v1';

function vapidReady() {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try { webpush.setVapidDetails('mailto:support@thegreenprint.trade', pub, priv); return true; }
  catch (e) { return false; }
}

async function sendPush(title, body, url) {
  if (!vapidReady()) return 0;
  const r = redis();
  let all = {};
  try { all = (await r.hgetall(SUBS_KEY)) || {}; } catch (e) { return 0; }
  const payload = JSON.stringify({ title: title, body: body, url: url || '/app' });
  let sent = 0;
  await Promise.all(Object.keys(all).map(async (ep) => {
    let sub;
    try { sub = JSON.parse(all[ep]); } catch (e) { return; }
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) { try { await r.hdel(SUBS_KEY, ep); } catch (e) {} } }
  }));
  return sent;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY || '' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
  const action = String(body.action || '');

  if (action === 'subscribe') {
    const sub = body.subscription;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'bad_sub' });
    try { await redis().hset(SUBS_KEY, sub.endpoint, JSON.stringify(sub)); } catch (e) {}
    return res.status(200).json({ ok: true });
  }

  if (action === 'send') {
    const adminKey = process.env.GP_ADMIN_KEY || '';
    if (!adminKey || String(body.key || '') !== adminKey) return res.status(403).json({ error: 'not_admin' });
    const sent = await sendPush(String(body.title || 'The Greenprint'), String(body.body || ''), String(body.url || '/app'));
    return res.status(200).json({ ok: true, sent: sent });
  }

  return res.status(400).json({ error: 'unknown_action' });
};
