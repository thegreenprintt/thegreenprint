// ─── COMMUNITY CHAT + SIGNALS + WEB PUSH + SCANNER HUB (one function) ─────────
// Backed by the project's existing Redis (REDIS_URL) via ioredis.
//   GET  /api/chat                 -> last 100 chat messages
//   POST /api/chat {user,text}     -> post a chat message (profanity auto-masked)
//   GET  /api/chat?kind=signals    -> last 50 Greenprint signals
//   POST /api/chat?kind=signals {key,pair,dir,note} -> admin post a signal
//   POST /api/chat?kind=del {key,id} -> admin delete a chat message
//   GET  /api/chat?kind=push       -> { key } (VAPID public key for the client)
//   POST /api/chat?kind=push {action:"subscribe"|"send", ...}
//   POST /api/chat?kind=tv&key=TV_WEBHOOK_KEY  <- TradingView scanner webhook.
//         Cleans the message, posts it to the community chat as "The Greenprint",
//         fires a push to all devices, AND forwards it on to Telegram (plain).
//   POST/GET /api/chat?kind=lockpush&key=GP_ADMIN_KEY -> post today's Lock of the
//         Day to the chat + push (used by the daily schedule and manual triggers).
// Everything lives here to stay under the Hobby 12-serverless-function cap.

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
const PKEY = 'gp:push:subs:v1';
const AUTHOR = 'The Greenprint';
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

function decodeEntities(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
// For the app chat + push: strip ALL html → plain text.
function stripTags(s) { return decodeEntities(String(s).replace(/<[^>]*>/g, '')).replace(/[ \t]+\n/g, '\n').trim(); }
// For the Telegram forward: kill only the <pre> code box, keep <b>/<i> bold/italics.
function stripPre(s) { return String(s).replace(/<\/?pre>/gi, '').trim(); }

async function tgSend(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return true;
  } catch (e) { return false; }
}

// Push helper (web-push lazy-required so a load issue can never break chat).
async function sendPush(r, title, body, url) {
  let webpush;
  try { webpush = require('web-push'); } catch (e) { return 0; }
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return 0;
  try { webpush.setVapidDetails('mailto:support@thegreenprint.trade', pub, priv); } catch (e) { return 0; }
  let all = {};
  try { all = (await r.hgetall(PKEY)) || {}; } catch (e) { return 0; }
  const payload = JSON.stringify({ title: title, body: body, url: url || '/app' });
  let sent = 0;
  await Promise.all(Object.keys(all).map(async (ep) => {
    let sub;
    try { sub = JSON.parse(all[ep]); } catch (e) { return; }
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) { try { await r.hdel(PKEY, ep); } catch (e) {} } }
  }));
  return sent;
}

async function postChat(r, text) {
  const msg = { id: Date.now() + Math.floor(Math.random() * 999), user: AUTHOR, text: text, ts: Date.now() };
  await r.rpush(KEY, JSON.stringify(msg));
  await r.ltrim(KEY, -300, -1);
  return msg;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const kind = String((req.query && req.query.kind) || '');
  const qkey = String((req.query && req.query.key) || '');

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
    // ── SCANNER RECEIVER — a copy of the TradingView call → chat + push ────────
    // Your existing Telegram alert is untouched; this is a SEPARATE alert that
    // sends a copy here. By default we do NOT re-post to Telegram (your direct
    // alert already did). Add &fwd=1 only if you ever want the app to forward to
    // Telegram instead of a direct alert (needs TELEGRAM_BOT_TOKEN set).
    if (kind === 'tv') {
      const wk = process.env.GP_TV_KEY || '';
      if (!wk || qkey !== wk) return res.status(401).json({ error: 'unauthorized' });
      const text = String((body && body.text) || '');
      const chatId = String((body && body.chat_id) || '');
      if (!text) return res.status(200).json({ ok: true, skipped: 'no_text' });
      // 1. Post into the community chat as The Greenprint (plain text).
      const chatText = stripTags(text);
      await postChat(r, chatText);
      // 2. Push everyone.
      const lines = chatText.split('\n');
      const pTitle = (lines[0] || 'New call').slice(0, 80);
      const pBody = (lines.slice(1).join('\n').replace(/\n{2,}/g, '\n').trim() || 'Tap to view the call').slice(0, 300);
      const pushed = await sendPush(r, pTitle, pBody, '/app?tab=Community');
      // 3. Optional Telegram forward (OFF by default so your direct alert stays the source).
      let tg = false;
      const fwd = String((req.query && req.query.fwd) || '') === '1';
      if (fwd && chatId) tg = await tgSend(chatId, stripPre(text));
      return res.status(200).json({ ok: true, chat: true, pushed: pushed, telegram: tg });
    }

    // ── LOCK OF THE DAY — post today's top pick to chat + push ─────────────────
    if (kind === 'lockpush') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = clean(body.key, 128) || qkey;
      if (adminKey && k !== adminKey) return res.status(403).json({ error: 'not_admin' });
      const leagues = ['NFL', 'NBA', 'NHL', 'MLB', 'WNBA'];
      let best = null;
      for (const lg of leagues) {
        try {
          const d = await fetch('https://thegreenprint.trade/api/props?league=' + lg + '&t=' + Date.now()).then((x) => x.json());
          const s = (d && d.slips && d.slips[0]) ? d.slips[0] : null;
          if (s && (!best || (s.score || 0) > (best.score || 0))) best = s;
        } catch (e) {}
      }
      if (!best) return res.status(200).json({ ok: true, note: 'no_lock' });
      const line = best.player + ' — ' + best.side + ' ' + best.line + ' ' + best.stat;
      const hit = best.l10 ? (' · hit ' + best.l10.hit + '/' + best.l10.of + ' of last 10') : '';
      await postChat(r, '🔒 LOCK OF THE DAY\n' + line + '\n' + best.team + ' vs ' + best.opp + hit);
      const pushed = await sendPush(r, '🔒 Lock of the Day', line, '/app?tab=Picks');
      return res.status(200).json({ ok: true, lock: best.player, pushed: pushed });
    }

    // ── DAILY RESET — wipe the community chat, post a fresh welcome ──
    if (kind === 'clearchat') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = clean(body.key, 128) || qkey;
      if (adminKey && k !== adminKey) return res.status(403).json({ error: 'not_admin' });
      try { await r.del(KEY); } catch (e) {}
      await postChat(r, '🌅 Fresh day. Drop your plays and let\'s get it. 💚');
      return res.status(200).json({ ok: true, cleared: true });
    }

    // ── WEB PUSH ───────────────────────────────────────────────────────────────
    if (kind === 'push') {
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY || '' });
      }
      const action = String(body.action || '');
      if (action === 'subscribe') {
        const sub = body.subscription;
        if (!sub || !sub.endpoint) return res.status(400).json({ error: 'bad_sub' });
        try { await r.hset(PKEY, sub.endpoint, JSON.stringify(sub)); } catch (e) {}
        return res.status(200).json({ ok: true });
      }
      if (action === 'send') {
        const adminKey = process.env.GP_ADMIN_KEY || '';
        if (adminKey && clean(body.key, 128) !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const sent = await sendPush(r, clean(body.title, 80) || 'The Greenprint', clean(body.body, 180), clean(body.url, 60) || '/app');
        return res.status(200).json({ ok: true, sent: sent });
      }
      return res.status(400).json({ error: 'unknown_action' });
    }

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
      try { await sendPush(r, '💬 ' + user, text.slice(0, 140), '/app?tab=Community'); } catch (e) {}
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
