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
const crypto = require('crypto');
const RESERVED = ['the greenprint', 'greenprint', 'admin', 'mod', 'moderator', 'gp', 'jay', 'owner', 'staff'];
function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
function newToken() { return crypto.randomBytes(24).toString('hex'); }
async function sessionName(r, token) {
  if (!token) return null;
  let email;
  try { email = await r.get('gp:sess:' + token); } catch (e) { return null; }
  if (!email) return null;
  try { const u = JSON.parse((await r.hget('gp:users', email)) || '{}'); return u.name || null; } catch (e) { return null; }
}

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
    // ACCOUNTS - signup / login / session
    if (kind === 'auth') {
      const action = String(body.action || '');
      if (action === 'signup') {
        const email = clean(body.email, 120).toLowerCase();
        const name = clean(body.name, 24);
        const pw = String(body.password || '');
        const at = email.indexOf('@');
        if (at < 1 || email.indexOf('.', at) < at + 2) return res.status(400).json({ error: 'bad_email' });
        if (name.length < 3) return res.status(400).json({ error: 'name_short' });
        if (RESERVED.indexOf(name.toLowerCase()) !== -1) return res.status(400).json({ error: 'name_reserved' });
        if (pw.length < 6) return res.status(400).json({ error: 'pw_short' });
        if (await r.hget('gp:users', email)) return res.status(409).json({ error: 'email_taken' });
        if (await r.hget('gp:names', name.toLowerCase())) return res.status(409).json({ error: 'name_taken' });
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPw(pw, salt);
        await r.hset('gp:users', email, JSON.stringify({ email: email, name: name, salt: salt, hash: hash, ts: Date.now() }));
        await r.hset('gp:names', name.toLowerCase(), email);
        const token = newToken();
        await r.set('gp:sess:' + token, email, 'EX', 5184000);
        return res.status(200).json({ ok: true, token: token, name: name });
      }
      if (action === 'login') {
        const email = clean(body.email, 120).toLowerCase();
        const pw = String(body.password || '');
        let user = null;
        try { user = JSON.parse((await r.hget('gp:users', email)) || 'null'); } catch (e) { user = null; }
        if (!user) return res.status(401).json({ error: 'no_user' });
        if (hashPw(pw, user.salt) !== user.hash) return res.status(401).json({ error: 'bad_pw' });
        const token = newToken();
        await r.set('gp:sess:' + token, email, 'EX', 5184000);
        return res.status(200).json({ ok: true, token: token, name: user.name });
      }
      if (action === 'me') {
        const nm = await sessionName(r, clean(body.token, 64));
        return res.status(200).json({ ok: !!nm, name: nm || '' });
      }
      return res.status(400).json({ error: 'unknown_action' });
    }
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

    // ── BUSINESS TRACKER — private snapshot of the One House book of business ──
    //   POST ?kind=track {key:GP_ADMIN_KEY, source, snapshot:{counts, members[]}}
    //         -> store the latest snapshot (used by the nightly refresh task).
    //   GET  ?kind=track&key=<GP_ADMIN_KEY or GP_TRACK_KEY>
    //         -> return the stored snapshot (the private /track page reads this).
    // A missing/empty snapshot is rejected so a failed refresh never wipes the
    // last good data — the page keeps showing the previous night until a real
    // refresh succeeds.
    if (kind === 'track') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const trackKey = process.env.GP_TRACK_KEY || '';
      const TKEY = 'gp:track:v1';
      if (req.method === 'POST' && String(body.action || '') !== 'setpass' && String(body.action || '') !== 'setresend') {
        const k = clean(body.key, 128) || qkey;
        if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const snap = body.snapshot;
        if (!snap || typeof snap !== 'object' || !Array.isArray(snap.members) || snap.members.length === 0) {
          return res.status(400).json({ error: 'bad_snapshot' });
        }
        const record = {
          updatedAt: Date.now(),
          source: clean(body.source, 24) || 'manual',
          counts: (snap.counts && typeof snap.counts === 'object') ? snap.counts : {},
          goal: (snap.goal && typeof snap.goal === 'object') ? snap.goal : null,
          members: snap.members.slice(0, 2000),
        };
        try { await r.set(TKEY, JSON.stringify(record)); }
        catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, stored: record.members.length, updatedAt: record.updatedAt });
      }
      // SET the viewer passcode (admin only). Stored in Redis, never in source.
      //   POST ?kind=track&action=setpass {key:GP_ADMIN_KEY, pass}
      if (req.method === 'POST' && String(body.action || '') === 'setpass') {
        const k2 = clean(body.key, 128) || qkey;
        if (!adminKey || k2 !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const p = clean(body.pass, 128);
        if (!p || p.length < 3) return res.status(400).json({ error: 'bad_pass' });
        try { await r.set('gp:track:pass', p); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, set: true });
      }
      // STORE the Resend API key (admin only). Lets email send without Vercel env access.
      //   POST ?kind=track {key:GP_ADMIN_KEY, action:'setresend', resendKey:'re_...'}
      if (req.method === 'POST' && String(body.action || '') === 'setresend') {
        const k3 = clean(body.key, 128) || qkey;
        if (!adminKey || k3 !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const rk = clean(body.resendKey, 200);
        if (!rk || rk.indexOf('re_') !== 0) return res.status(400).json({ error: 'bad_key' });
        try { await r.set('gp:resend:key', rk); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, set: true });
      }
      // GET — read, gated by the admin key, the env view key, or the stored passcode
      const k = qkey || clean(body.key, 128);
      let storedPass = '';
      try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
      const okKey = (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
      if (!okKey) return res.status(403).json({ error: 'not_admin' });
      let rec = null;
      try { rec = JSON.parse((await r.get(TKEY)) || 'null'); } catch (e) { rec = null; }
      let marks = {};
      try { marks = JSON.parse((await r.get('gp:track:marks')) || '{}') || {}; } catch (e) { marks = {}; }
      let tree = [];
      try { tree = JSON.parse((await r.get('gp:track:tree')) || '[]') || []; } catch (e) { tree = []; }
      let geo = {};
      try { geo = JSON.parse((await r.get('gp:track:geo')) || '{}') || {}; } catch (e) { geo = {}; }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, snapshot: rec, marks: marks, tree: tree, geo: geo });
    }

    // ── LEADS — leads now live in PRIVATE Redis, never the public Firebase DB ─
    // Capture (public, write-only), update (admin), read (admin), and a one-time
    // migrate from the old Firebase node. This closes the hole where anyone could
    // download /live/leads.json. Keys mirror the old email-slug keys.
    const FB_RTDB = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com';
    const LEADS_H = 'gp:leads:h';
    const leadSlug = (em) => clean(em, 160).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60) || 'no_email';
    const leadGate = async () => {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const trackKey = process.env.GP_TRACK_KEY || '';
      const k = qkey || clean(body.key, 128);
      let storedPass = '';
      try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
      return (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
    };

    //   POST ?kind=lead-capture {lead:{name,email,phone,src,path,...}}  (public funnel)
    if (kind === 'lead-capture') {
      const lead = (body && typeof body.lead === 'object' && body.lead) ? body.lead : (body || {});
      const email = clean(lead.email, 160).toLowerCase();
      if (!email || email.indexOf('@') < 0) return res.status(400).json({ ok: false, error: 'bad_email' });
      const key = leadSlug(email);
      let existing = {};
      try { const e = await r.hget(LEADS_H, key); if (e) existing = JSON.parse(e) || {}; } catch (x) {}
      const allow = ['name', 'email', 'phone', 'src', 'path', 'experience', 'why', 'budget', 'wantsIdeas'];
      const incoming = {};
      for (const f of allow) { if (lead[f] !== undefined && lead[f] !== null) incoming[f] = (typeof lead[f] === 'string') ? lead[f].slice(0, 500) : lead[f]; }
      const now = new Date().toISOString();
      const merged = Object.assign({}, existing, incoming, { email: email, firstSeen: existing.firstSeen || now, lastSeen: now, joinCount: (existing.joinCount || 0) + 1 });
      try { await r.hset(LEADS_H, key, JSON.stringify(merged)); } catch (x) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      return res.status(200).json({ ok: true });
    }

    //   POST ?kind=lead-update {key, leadKey, patch:{status,note,...}}  (admin)
    if (kind === 'lead-update') {
      if (!(await leadGate())) return res.status(403).json({ error: 'not_admin' });
      const key = clean(body.leadKey, 80);
      if (!key) return res.status(400).json({ ok: false, error: 'bad_key' });
      const patch = (body.patch && typeof body.patch === 'object') ? body.patch : {};
      let existing = {};
      try { const e = await r.hget(LEADS_H, key); if (e) existing = JSON.parse(e) || {}; } catch (x) {}
      const allow = ['status', 'note', 'name', 'email', 'phone', 'path'];
      const clean2 = {};
      for (const f of allow) { if (patch[f] !== undefined) clean2[f] = (typeof patch[f] === 'string') ? patch[f].slice(0, 2000) : patch[f]; }
      const merged = Object.assign({}, existing, clean2);
      try { await r.hset(LEADS_H, key, JSON.stringify(merged)); } catch (x) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      return res.status(200).json({ ok: true });
    }

    //   GET ?kind=lead-migrate&key=<admin>  — one-time copy of the old Firebase node into Redis
    if (kind === 'lead-migrate') {
      if (!(await leadGate())) return res.status(403).json({ error: 'not_admin' });
      let data = null;
      try { data = await (await fetch(FB_RTDB + '/live/leads.json', { cache: 'no-store' })).json(); } catch (x) {}
      if (!data || typeof data !== 'object') return res.status(200).json({ ok: true, migrated: 0, note: 'nothing_in_firebase' });
      let n = 0;
      for (const k of Object.keys(data)) {
        try {
          const v = data[k] || {};
          let existing = {};
          try { const e = await r.hget(LEADS_H, k); if (e) existing = JSON.parse(e) || {}; } catch (x) {}
          // Firebase copy wins only for fields it has; keep anything newer already in Redis.
          await r.hset(LEADS_H, k, JSON.stringify(Object.assign({}, v, existing)));
          n++;
        } catch (x) {}
      }
      return res.status(200).json({ ok: true, migrated: n });
    }

    //   GET ?kind=leads&key=<admin|track|pass>  — read from private Redis
    if (kind === 'leads') {
      if (!(await leadGate())) return res.status(403).json({ error: 'not_admin' });
      const leads = {};
      let fromRedis = 0;
      try {
        const all = await r.hgetall(LEADS_H);
        if (all) { for (const k of Object.keys(all)) { try { leads[k] = JSON.parse(all[k]); fromRedis++; } catch (x) {} } }
      } catch (x) {}
      // Fallback: if Redis is still empty (pre-migration), read the old Firebase node
      // so the tracker is never blank during the transition.
      if (fromRedis === 0) {
        try {
          const d = await (await fetch(FB_RTDB + '/live/leads.json', { cache: 'no-store' })).json();
          if (d && typeof d === 'object') { for (const k of Object.keys(d)) leads[k] = d[k]; }
        } catch (x) {}
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, leads: leads, source: fromRedis > 0 ? 'redis' : 'firebase-fallback', count: Object.keys(leads).length });
    }

    // ── GEO — Viato phone/location enrichment keyed by email (and name:) ──────
    //   POST ?kind=track-geo {key:GP_ADMIN_KEY, geo:{ email: {p,c,s} }}
    if (kind === 'track-geo') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = qkey || clean(body.key, 128);
      if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_admin' });
      if (req.method === 'POST') {
        const geo = body.geo;
        if (!geo || typeof geo !== 'object' || Array.isArray(geo)) return res.status(400).json({ error: 'bad_geo' });
        try { await r.set('gp:track:geo', JSON.stringify(geo)); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, stored: Object.keys(geo).length });
      }
      let geo = {};
      try { geo = JSON.parse((await r.get('gp:track:geo')) || '{}') || {}; } catch (e) { geo = {}; }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, geo: geo });
    }

    // ── ONE HOUSE GEO ENRICH — fills each member's real city/state/phone by looking
    //   them up (by username) through the same public subscribe search the site uses.
    //   Batched to stay within the serverless time limit; call repeatedly until done.
    //   GET ?kind=1h-geo&key=<admin>&batch=0
    if (kind === '1h-geo') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = qkey || clean(body.key, 128);
      if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_authorized' });
      const SIZE = 40;
      const batch = Math.max(0, parseInt(String((req.query && req.query.batch) || '0'), 10) || 0);
      // member list (username + email + name) — cached in Redis after batch 0 so later batches skip the login+genealogy pull
      let list = null;
      try { const c = await r.get('gp:track:gnlist'); if (c) list = JSON.parse(c); } catch (e) {}
      if (!list || batch === 0) {
        const email = (process.env.ONE_HOUSE_EMAIL || '').trim();
        const pass = (process.env.ONE_HOUSE_PASSWORD || '').trim();
        if (!email || !pass) return res.status(200).json({ ok: false, error: 'no_1h_credentials' });
        const B = 'https://backend.1houseglobal.dev';
        let token = '';
        try {
          const lr = await fetch(B + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: email, password: pass }) });
          const lj = await lr.json().catch(() => null);
          token = (lj && (lj.access_token || lj.accessToken || lj.token)) || '';
          if (!token) return res.status(200).json({ ok: false, error: 'login_failed' });
        } catch (e) { return res.status(200).json({ ok: false, error: 'login_error', detail: String((e && e.message) || e) }); }
        const H = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
        list = [];
        try {
          let page = 1, last = 1;
          do {
            const gr = await fetch(B + '/api/user/genealogy-list?page=' + page, { headers: H });
            const gj = await gr.json().catch(() => null);
            const d = gj && gj.data; const arr = (d && Array.isArray(d.data)) ? d.data : [];
            last = (d && d.last_page) || 1;
            for (const n of arr) { const u = n.user || {}; list.push({ u: String(u.username || '').trim(), e: String(u.email || '').toLowerCase().trim(), n: String(n.fullname || u.username || '').trim() }); }
            page++;
          } while (page <= last && page <= 30);
        } catch (e) { return res.status(200).json({ ok: false, error: 'genealogy_error', detail: String((e && e.message) || e) }); }
        if (!list.length) return res.status(200).json({ ok: false, error: 'no_nodes' });
        try { await r.set('gp:track:gnlist', JSON.stringify(list), 'EX', 3600); } catch (e) {}
      }
      // load existing geo, process this batch
      let geo = {}; try { geo = JSON.parse((await r.get('gp:track:geo')) || '{}') || {}; } catch (e) {}
      const PROXY = 'https://vuefjlszkeijndgvshxv.supabase.co/functions/v1/backend-proxy';
      const slice = list.slice(batch * SIZE, batch * SIZE + SIZE);
      let found = 0;
      for (const m of slice) {
        const term = m.u || m.e; if (!term) continue;
        try {
          const pr = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: '/distributor/search', method: 'GET', queryParams: { search: term }, requiresAdmin: false }) });
          const pj = await pr.json().catch(() => null);
          const arr = (pj && pj.data && Array.isArray(pj.data.data)) ? pj.data.data : [];
          let hit = arr.find((x) => String(x.username || '').toLowerCase() === m.u.toLowerCase());
          if (!hit && m.e) hit = arr.find((x) => String(x.email || '').toLowerCase() === m.e);
          if (hit && m.e) { geo[m.e] = { p: String(hit.phone || ''), c: String(hit.city || ''), s: String(hit.state || '') }; if (hit.city || hit.state || hit.phone) found++; }
        } catch (e) {}
      }
      try { await r.set('gp:track:geo', JSON.stringify(geo)); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      const processedTo = batch * SIZE + slice.length;
      const withState = Object.values(geo).filter((g) => g && g.s).length;
      return res.status(200).json({ ok: true, batch: batch, processedThisBatch: slice.length, foundThisBatch: found, total: list.length, nextBatch: processedTo < list.length ? batch + 1 : null, done: processedTo >= list.length, geoWithState: withState });
    }

    // ── ONE HOUSE AUTO-REFRESH — logs in, pulls genealogy, rebuilds the tracker ──
    //   GET ?kind=1h-refresh  (guarded by GP_ADMIN_KEY or a Vercel/GitHub cron)
    //   Needs env ONE_HOUSE_EMAIL + ONE_HOUSE_PASSWORD. Runs hands-off hourly.
    if (kind === '1h-refresh') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const ua = String((req.headers && req.headers['user-agent']) || '');
      const isCron = /vercel-cron|github|greenprint-refresh/i.test(ua);
      const k = qkey || clean(body.key, 128);
      const PING = 'gp1h-cron-pull-v1'; // public trigger token, safe because the pull is rate-limited and returns no PII
      const isAdmin = adminKey && k === adminKey;
      if (!isCron && !isAdmin && k !== PING) return res.status(403).json({ error: 'not_authorized' });
      // Self-rate-limit: never hit One House more than once per ~9 min, so a public trigger can't be abused.
      const force = isAdmin && String((req.query && req.query.force) || '') === '1';
      if (!force) { try { const p0 = JSON.parse((await r.get('gp:track:v1')) || 'null'); if (p0 && p0.source === 'auto-1h' && (Date.now() - (p0.updatedAt || 0)) < 9 * 60 * 1000) return res.status(200).json({ ok: true, skipped: true, reason: 'recent' }); } catch (e) {} }
      const rawEmail = process.env.ONE_HOUSE_EMAIL || '';
      const rawPass = process.env.ONE_HOUSE_PASSWORD || '';
      const email = rawEmail.trim();
      const pass = rawPass.trim();
      if (!email || !pass) return res.status(200).json({ ok: false, error: 'no_1h_credentials' });
      const B = 'https://backend.1houseglobal.dev';
      // 1) login
      let token = '';
      try {
        const lr = await fetch(B + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: email, password: pass }) });
        const lj = await lr.json().catch(() => null);
        token = (lj && (lj.access_token || lj.accessToken || lj.token || (lj.data && (lj.data.access_token || lj.data.accessToken || lj.data.token)))) || '';
        if (!token) return res.status(200).json({ ok: false, error: 'login_failed', detail: (lj && lj.message) || lr.status });
      } catch (e) { return res.status(200).json({ ok: false, error: 'login_error', detail: String((e && e.message) || e) }); }
      // 2) pull genealogy (all pages)
      const H = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
      const nodes = [];
      try {
        let page = 1, last = 1;
        do {
          const gr = await fetch(B + '/api/user/genealogy-list?page=' + page, { headers: H });
          const gj = await gr.json().catch(() => null);
          const d = gj && gj.data; const arr = (d && Array.isArray(d.data)) ? d.data : [];
          last = (d && d.last_page) || 1;
          for (const n of arr) {
            const u = n.user || {}; const pk = n.active_package || {};
            nodes.push({ id: n.user_id, sp: (u.sponsor == null ? null : u.sponsor), name: String(n.fullname || u.username || '').trim(), email: String(u.email || '').toLowerCase(), paid: /yes/i.test(String(n.paid_subscription)), subs: n.subscribers_count || 0, lvl: n.level, amount: Number(pk.amount) || 0, purchase: pk.purchase_date || n.paid_subscription_date || null });
          }
          page++;
        } while (page <= last && page <= 30);
      } catch (e) { return res.status(200).json({ ok: false, error: 'genealogy_error', detail: String((e && e.message) || e) }); }
      if (!nodes.length) return res.status(200).json({ ok: false, error: 'no_nodes' });
      // 3) build members + tree
      const DAY = 86400000; const now = Date.now();
      const estDue = (basis) => { const b = Date.parse(String(basis || '').replace(' ', 'T')) || 0; if (!b) return null; let d = b; while (d < now) d += 30 * DAY; return new Date(d).toISOString().slice(0, 10); };
      const tree = nodes.map((n) => ({ id: n.id, sp: n.sp, name: n.name, email: n.email, active: n.paid ? 1 : 0, subs: n.subs, lvl: n.lvl, paid: n.paid ? 1 : 0 }));
      const members = nodes.map((n) => {
        const nextDue = n.paid ? estDue(n.purchase) : null;
        const du = nextDue ? Math.ceil((Date.parse(nextDue) - now) / DAY) : null;
        let status = 'inactive';
        if (n.paid) status = (du !== null && du < 0) ? 'lapsed' : 'active';
        return { name: n.name, email: n.email, phone: '', level: n.lvl, status: status, amount: n.paid ? (n.amount || 200) : 0, nextDue: nextDue, referred: n.subs };
      });
      let active = 0, inactive = 0, lapsed = 0, due = 0;
      for (const m of members) { if (m.status === 'active') active++; else if (m.status === 'lapsed') lapsed++; else inactive++; const d = m.nextDue ? Math.ceil((Date.parse(m.nextDue) - now) / DAY) : null; if (m.status === 'active' && d !== null && d <= 7) due++; }
      // 4) preserve the existing goal (earnings) so the $10K tracker keeps its number
      let goal = null; try { const prev = JSON.parse((await r.get('gp:track:v1')) || 'null'); goal = prev && prev.goal ? prev.goal : null; } catch (e) {}
      const record = { updatedAt: now, source: 'auto-1h', counts: { active: active, inactive: inactive, lapsed: lapsed, due: due, withPhone: 0, total: members.length }, goal: goal, members: members.slice(0, 2000) };
      try { await r.set('gp:track:v1', JSON.stringify(record)); await r.set('gp:track:tree', JSON.stringify(tree.slice(0, 5000))); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      // 5) diff vs last run and push alerts (new subscribers, newly past due)
      try {
        let baseN = null; try { baseN = JSON.parse((await r.get('gp:track:notify:last')) || 'null'); } catch (e) {}
        const activeEmails = members.filter((m) => m.status === 'active').map((m) => m.email).filter(Boolean);
        const notifs = [];
        if (baseN && Array.isArray(baseN.activeEmails)) {
          const prevSet = new Set(baseN.activeEmails);
          const added = activeEmails.filter((e) => e && !prevSet.has(e));
          if (added.length) notifs.push({ t: '🎉 ' + added.length + ' new subscriber' + (added.length > 1 ? 's' : '') + '!', b: 'Your One House business just grew. Open the tracker.' });
          if (typeof baseN.lapsed === 'number' && lapsed > baseN.lapsed) { const dd = lapsed - baseN.lapsed; notifs.push({ t: '⚠️ ' + dd + ' went past due', b: 'Win them back before they lapse. Tap to work them.' }); }
        }
        for (const n of notifs) { try { await sendPush(r, n.t, n.b, '/track'); } catch (e) {} }
        await r.set('gp:track:notify:last', JSON.stringify({ activeEmails: activeEmails, lapsed: lapsed, count: active, ts: now }));
      } catch (e) {}
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, source: 'auto-1h', members: members.length, active: active, inactive: inactive, lapsed: lapsed });
    }

    // ── ORG TREE — store/read the One House genealogy (sponsor links) ─────────
    //   POST ?kind=track-tree {key:GP_ADMIN_KEY, tree:[{id,sp,name,email,active,subs,lvl,...}]}
    if (kind === 'track-tree') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = qkey || clean(body.key, 128);
      if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_admin' });
      if (req.method === 'POST') {
        const tree = body.tree;
        if (!Array.isArray(tree) || tree.length === 0) return res.status(400).json({ error: 'bad_tree' });
        try { await r.set('gp:track:tree', JSON.stringify(tree.slice(0, 5000))); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, stored: tree.length });
      }
      let tree = [];
      try { tree = JSON.parse((await r.get('gp:track:tree')) || '[]') || []; } catch (e) { tree = []; }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, tree: tree });
    }

    // ── PIPELINE MARKS — persist per-member outreach stage / notes ────────────
    //   POST ?kind=track-mark {key, email, stage?, note?, touch?}  → upsert one
    //   GET  ?kind=track-mark&key=...                              → all marks
    if (kind === 'track-mark') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const trackKey = process.env.GP_TRACK_KEY || '';
      const k = qkey || clean(body.key, 128);
      let storedPass = '';
      try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
      const okKey = (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
      if (!okKey) return res.status(403).json({ error: 'not_admin' });
      const MKEY = 'gp:track:marks';
      let marks = {};
      try { marks = JSON.parse((await r.get(MKEY)) || '{}') || {}; } catch (e) { marks = {}; }
      if (req.method === 'POST') {
        const email = clean(body.email, 160).toLowerCase();
        if (!email || email.indexOf('@') < 1) return res.status(400).json({ error: 'bad_email' });
        const STAGES = ['new', 'contacted', 'talking', 'committed', 'closed', 'skip'];
        const VOICES = ['default', 'auntie', 'og', 'homie'];
        const prev = marks[email] || {};
        const next = { stage: prev.stage || 'new', note: prev.note || '', touchedAt: prev.touchedAt || 0, closedAt: prev.closedAt || 0, voice: prev.voice || 'default', birthday: prev.birthday || '' };
        if (body.stage !== undefined) { const st = clean(body.stage, 16); if (STAGES.indexOf(st) >= 0) { next.stage = st; if (st === 'closed') next.closedAt = Date.now(); } }
        if (body.note !== undefined) next.note = clean(body.note, 400);
        if (body.voice !== undefined) { const v = clean(body.voice, 16); if (VOICES.indexOf(v) >= 0) next.voice = v; }
        if (body.birthday !== undefined) { const bd = clean(body.birthday, 10); next.birthday = /^\d{2}-\d{2}$/.test(bd) ? bd : ''; }
        if (body.touch) next.touchedAt = Date.now();
        marks[email] = next;
        try { await r.set(MKEY, JSON.stringify(marks)); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        return res.status(200).json({ ok: true, email: email, mark: next });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, marks: marks });
    }

    // ── TRACKER EMAIL — reactivation email to a member, or Jay's daily alert ──
    //   POST ?kind=track-email {key:GP_ADMIN_KEY, to, name?, subject?, html?}
    //   If html is omitted, a default reactivation email (Jay's voice) is sent.
    if (kind === 'track-email') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const trackKey = process.env.GP_TRACK_KEY || '';
      const k = clean(body.key, 128) || qkey;
      let storedPass = '';
      try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
      const okKey = (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
      if (!okKey) return res.status(403).json({ error: 'not_admin' });
      const to = clean(body.to, 160);
      if (!to || to.indexOf('@') < 1) return res.status(400).json({ error: 'bad_to' });
      const capName = (s) => { s = (s || '').trim(); return s ? s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : s; };
      const name = capName(clean(body.name, 60)) || 'there';
      const style = clean(body.style, 20) || 'checkin';
      const SUB = 'https://subscribe.1houseglobal.com/jay';
      const P = (s) => '<p style="font-size:16px;line-height:1.6">' + s + '</p>';
      const BTN = '<p style="margin:22px 0"><a href="' + SUB + '" style="background:#00FF85;color:#080808;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block">Come back to the room</a></p>';
      const wrap = (inner) =>
        '<div style="font-family:Inter,Arial,sans-serif;background:#080808;color:#f5f5f5;padding:28px;border-radius:12px;max-width:560px">' +
        '<div style="color:#00FF85;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">The Greenprint</div>' +
        inner +
        '<p style="font-size:15px;line-height:1.6;font-weight:700">— Jay</p>' +
        '<p style="font-size:12px;line-height:1.5;color:#777;margin-top:18px">The Greenprint · educational only, not financial advice. Reply STOP and I will not reach out again.</p>' +
        '</div>';
      let subject, inner;
      if (style === 'nudge') {
        subject = clean(body.subject, 200) || (name + ', thinking about you');
        inner = P('Hey ' + name + ',') + P('It\'s Jay. It\'s been a little while and you came to mind. The energy in the room lately has honestly been incredible, and I found myself wondering how you\'re doing.') + P('No pressure at all, I just wanted to reach out. How have you been?');
      } else if (style === 'invite') {
        subject = clean(body.subject, 200) || (name + ', I\'d love to catch up');
        inner = P('Hey ' + name + ',') + P('It\'s Jay. I\'ve genuinely missed having you with us in One House. We\'re live every single day now and the room has grown into something special. You joined for a reason, and I\'d love to help you pick that back up whenever you\'re ready.') + BTN + P('Either way, I\'d love to hear how you\'re doing. Just reply and I\'ll personally get you squared away.');
      } else { // checkin (default) — pure, no pitch
        subject = clean(body.subject, 200) || (name + ', just checking in');
        inner = P('Hey ' + name + ',') + P('It\'s Jay. It\'s been a minute and you\'ve been on my mind, so I just wanted to check in. No agenda at all.') + P('How are you doing? I\'d love to hear from you whenever you get a sec.');
      }
      const html = String(body.html || '') || wrap(inner);
      // A plain-text alternative is a major deliverability signal (HTML-only reads as spam).
      const stripText = (h) => h.replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
      let textBody = stripText(inner) + '\n\n— Jay\n\nThe Greenprint. Educational only, not financial advice. Reply STOP and I will not reach out again.';
      if (style === 'invite') textBody += '\n\nCome back to the room: ' + SUB;
      let Resend;
      try { Resend = require('resend').Resend; } catch (e) { return res.status(200).json({ ok: false, error: 'resend_unavailable' }); }
      let rkey = process.env.RESEND_API_KEY || '';
      if (!rkey) { try { rkey = (await r.get('gp:resend:key')) || ''; } catch (e) {} }
      if (!rkey) return res.status(200).json({ ok: false, error: 'no_resend_key' });
      try {
        const resend = new Resend(rkey);
        const out = await resend.emails.send({
          from: 'Jay from The Greenprint <jay@thegreenprint.trade>',
          to: to,
          replyTo: 'jay@thegreenprint.trade',
          subject: subject,
          html: html,
          text: textBody,
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@thegreenprint.trade?subject=unsubscribe>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        return res.status(200).json({ ok: true, id: out && out.data ? out.data.id : null });
      } catch (e) { return res.status(200).json({ ok: false, error: String((e && e.message) || e) }); }
    }

    // ── TRACKER NOTIFY — morning brief + change alerts, pushed to Jay ─────────
    //   Fires from Vercel cron (user-agent vercel-cron) or admin key.
    //   ?kind=track-notify&mode=daily|brief|watch
    if (kind === 'track-notify') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const ua = String((req.headers && req.headers['user-agent']) || '');
      const isCron = /vercel-cron/i.test(ua);
      const k = qkey || clean(body.key, 128);
      if (!isCron && !(adminKey && k === adminKey)) return res.status(403).json({ error: 'not_admin' });
      const mode = clean((req.query && req.query.mode) || body.mode || 'daily', 12);
      let rec = null;
      try { rec = JSON.parse((await r.get('gp:track:v1')) || 'null'); } catch (e) {}
      if (!rec || !Array.isArray(rec.members)) return res.status(200).json({ ok: true, note: 'no_snapshot', sent: 0 });
      const members = rec.members;
      const goal = rec.goal || {};
      const target = Number(goal.target) || 10000, perSub = Number(goal.perSub) || 100;
      const earn = (typeof goal.earnings === 'number') ? goal.earnings : null;
      const subsToGo = earn != null ? Math.max(0, Math.ceil((target - earn) / perSub)) : null;
      const DAY = 86400000;
      const du = (iso) => { if (!iso) return null; const t = new Date(iso).getTime(); return isNaN(t) ? null : Math.ceil((t - Date.now()) / DAY); };
      let active = 0, due = 0, lapsed = 0; const activeEmails = [];
      for (const m of members) {
        if (m.status === 'active') { active++; if (m.email) activeEmails.push(String(m.email).toLowerCase()); }
        if (m.status === 'lapsed') lapsed++;
        const d = du(m.nextDue); if (m.status === 'active' && d != null && d <= 3) due++;
      }
      let base = null; try { base = JSON.parse((await r.get('gp:track:notify:last')) || 'null'); } catch (e) {}
      const notifs = [];
      const kDollar = '$' + Math.round(target / 1000) + 'K';
      if (base && Array.isArray(base.activeEmails)) {
        const prev = new Set(base.activeEmails);
        const added = activeEmails.filter((e) => e && !prev.has(e));
        if (added.length) notifs.push({ title: '🎉 ' + added.length + ' new subscriber' + (added.length > 1 ? 's' : '') + '!', body: subsToGo != null ? "You're " + subsToGo + ' away from ' + kDollar + '. Keep going.' : 'Momentum is building. Keep going.', url: '/track' });
        if (typeof base.lapsed === 'number' && lapsed > base.lapsed) { const d = lapsed - base.lapsed; notifs.push({ title: '⚠️ ' + d + ' ' + (d > 1 ? 'members' : 'member') + ' just went past due', body: 'Open your tracker and win them back before they lapse.', url: '/track' }); }
      }
      if (mode === 'daily' || mode === 'brief') {
        notifs.push({ title: '☀️ Good morning, Jay', body: (subsToGo != null ? "You're " + subsToGo + ' from ' + kDollar + '. ' : '') + due + ' due this week, ' + lapsed + ' past due. Tap to work your list.', url: '/track' });
      }
      let sent = 0;
      for (const n of notifs) { try { sent += await sendPush(r, n.title, n.body, n.url); } catch (e) {} }
      try { await r.set('gp:track:notify:last', JSON.stringify({ activeEmails: activeEmails, lapsed: lapsed, count: active, ts: Date.now() })); } catch (e) {}
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, sent: sent, notifs: notifs.length, subsToGo: subsToGo });
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
      const user = (await sessionName(r, clean(body.token, 64))) || clean(body.user, 24) || 'Trader';
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
