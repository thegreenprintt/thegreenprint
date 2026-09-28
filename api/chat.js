// ─── COMMUNITY CHAT (shared, cross-device) ───────────────────────────────────
// Backed by the project's existing Redis (REDIS_URL) via ioredis. Messages are
// stored in one capped list so every member sees the same room in real time.

const Redis = require('ioredis');

let client = null;
function redis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    client.on('error', () => {}); // don't crash the function on transient errors
  }
  return client;
}

const KEY = 'gp:chat:v1';
const clean = (s, n) => String(s == null ? '' : s).slice(0, n).replace(/\s+/g, ' ').trim();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let r;
  try {
    r = redis();
  } catch (e) {
    return res.status(200).json({ messages: [], error: 'no_store' });
  }

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
      if (!body || typeof body !== 'object') body = {};

      const user = clean(body.user, 24) || 'Trader';
      const text = clean(body.text, 500);
      if (!text) return res.status(400).json({ error: 'empty' });

      const msg = { id: Date.now() + Math.floor(Math.random() * 999), user: user, text: text, ts: Date.now() };
      await r.rpush(KEY, JSON.stringify(msg));
      await r.ltrim(KEY, -300, -1); // keep the most recent 300
      return res.status(200).json({ ok: true, msg: msg });
    }

    // GET -> last 100 messages
    const raw = await r.lrange(KEY, -100, -1);
    const messages = (raw || [])
      .map((s) => { try { return JSON.parse(s); } catch (e) { return null; } })
      .filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ messages: messages });
  } catch (e) {
    return res.status(200).json({ messages: [], error: 'store_unavailable' });
  }
};
