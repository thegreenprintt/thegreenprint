// ─── COMMUNITY CHAT + GREENPRINT SIGNALS (shared, cross-device) ──────────────
// Backed by the project's existing Redis (REDIS_URL) via ioredis.
//   GET  /api/chat                 -> last 100 chat messages
//   POST /api/chat {user,text}     -> post a chat message (profanity auto-masked)
//   GET  /api/chat?kind=signals    -> last 50 Greenprint signals
//   POST /api/chat?kind=signals {key,pair,dir,note}
//         -> post a signal; requires key === process.env.GP_ADMIN_KEY (admin only)
//   POST /api/chat?kind=del {key,id} -> admin delete a chat message

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
    client.on('error', () => {});
  }
  return client;
}

const KEY = 'gp:chat:v1';
const SKEY = 'gp:signals:v1';
const clean = (s, n) => String(s == null ? '' : s).slice(0, n).replace(/\s+/g, ' ').trim();

// Light profanity filter — masks rather than blocks so the room stays friendly.
const BANNED = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'asshole', 'dick', 'pussy', 'whore', 'slut'];
function maskProfanity(text) {
  let out = text;
  for (const w of BANNED) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, (m) => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
  }
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const kind = String((req.query && req.query.kind) || '');

  let r;
  try {
    r = redis();
  } catch (e) {
    return res.status(200).json({ messages: [], signals: [], error: 'no_store' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  try {
    // ── SIGNALS ──────────────────────────────────────────────────────────────
    if (kind === 'signals') {
      if (req.method === 'POST') {
        const adminKey = process.env.GP_ADMIN_KEY || '';
        if (!adminKey || clean(body.key, 128) !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const pair = clean(body.pair, 24).toUpperCase();
        const dir = /SHORT|SELL/i.test(clean(body.dir, 12)) ? 'SHORT' : 'LONG';
        const note = clean(body.note, 400);
        if (!pair) return res.status(400).json({ error: 'no_pair' });
        const sig = { id: Date.now() + Math.floor(Math.random() * 999), pair, dir, note, ts: Date.now() };
        await r.rpush(SKEY, JSON.stringify(sig));
        await r.ltrim(SKEY, -80, -1);
        return res.status(200).json({ ok: true, signal: sig });
      }
      const raw = await r.lrange(SKEY, -50, -1);
      const signals = (raw || []).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean).reverse();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ signals });
    }

    // ── ADMIN DELETE A CHAT MESSAGE ───────────────────────────────────────────
    if (kind === 'del' && req.method === 'POST') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      if (!adminKey || clean(body.key, 128) !== adminKey) return res.status(403).json({ error: 'not_admin' });
      const id = body.id;
      const raw = await r.lrange(KEY, 0, -1);
      for (const s of raw || []) {
        try { const m = JSON.parse(s); if (m && String(m.id) === String(id)) { await r.lrem(KEY, 1, s); break; } } catch (e) {}
      }
      return res.status(200).json({ ok: true });
    }

    // ── CHAT ───────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const user = clean(body.user, 24) || 'Trader';
      let text = clean(body.text, 500);
      if (!text) return res.status(400).json({ error: 'empty' });
      text = maskProfanity(text);
      const msg = { id: Date.now() + Math.floor(Math.random() * 999), user, text, ts: Date.now() };
      await r.rpush(KEY, JSON.stringify(msg));
      await r.ltrim(KEY, -300, -1);
      return res.status(200).json({ ok: true, msg });
    }

    const raw = await r.lrange(KEY, -100, -1);
    const messages = (raw || []).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ messages });
  } catch (e) {
    return res.status(200).json({ messages: [], signals: [], error: 'store_unavailable' });
  }
};
