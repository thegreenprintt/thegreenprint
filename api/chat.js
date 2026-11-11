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
// Owner-only push subscriptions (Jay's devices, registered from the private
// /track page). Business-tracker alerts go ONLY here, never to the public pool.
const OKEY = 'gp:push:owner:v1';
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
// hashKey selects the audience: PKEY = the public subscriber pool (community
// chat, trading calls, lock of the day), OKEY = owner-only (business tracker).
async function sendPush(r, title, body, url, hashKey) {
  let webpush;
  try { webpush = require('web-push'); } catch (e) { return 0; }
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return 0;
  try { webpush.setVapidDetails('mailto:support@thegreenprint.trade', pub, priv); } catch (e) { return 0; }
  const HK = hashKey || PKEY;
  let all = {};
  try { all = (await r.hgetall(HK)) || {}; } catch (e) { return 0; }
  const payload = JSON.stringify({ title: title, body: body, url: url || '/app' });
  let sent = 0;
  await Promise.all(Object.keys(all).map(async (ep) => {
    let sub;
    try { sub = JSON.parse(all[ep]); } catch (e) { return; }
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) { try { await r.hdel(HK, ep); } catch (e) {} } }
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

  // ── The Greenprint AI engine (kind=ai) ─────────────────────────────────────
  // Self-contained: does not use Redis. Keeps us under the Hobby 12-function cap
  // by living inside this existing function instead of adding a new one.
  //   GET  /api/chat?kind=ai              -> health/config check (no key exposed)
  //   POST /api/chat?kind=ai {messages}   -> streams the AI reply as plain text

  // ── Memory extraction (kind=mem) ──────────────────────────────────────────
  //   POST /api/chat?kind=mem {memory:[...], exchange:[{role,content},...]}
  //   -> { memory:[...] } merged, durable facts about the user. Cheap + fast.
  if (kind === 'mem') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const memKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY ||
      process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_OPENROUTER_API_KEY || '';
    if (!memKey) return res.status(200).json({ memory: [] });
    let mb = {};
    try { mb = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) { return res.status(400).json({ error: 'bad_body' }); }
    const existing = Array.isArray(mb.memory) ? mb.memory.slice(0, 30).map((s) => String(s).slice(0, 200)) : [];
    const exch = Array.isArray(mb.exchange) ? mb.exchange.slice(-4).map((m) => (m.role === 'user' ? 'User: ' : 'AI: ') + String(m.content || '').slice(0, 1200)).join('\n') : '';
    if (!exch) return res.status(200).json({ memory: existing });
    const prompt =
      "You maintain a short memory of durable facts about a user of The Greenprint AI. " +
      "Here is what you already remember (one fact per line):\n" + (existing.join('\n') || '(nothing yet)') +
      "\n\nHere is the latest exchange:\n" + exch +
      "\n\nReturn an updated memory list as a JSON array of short fact strings. Keep only durable, useful facts about the user " +
      "(their business, goals, preferences, projects, what they are building, their style). Merge duplicates, drop anything " +
      "temporary or trivial, never store sensitive personal data. Keep at most 25 facts, each under 160 characters. " +
      "If nothing is worth remembering, return the existing list unchanged. Reply with ONLY the JSON array.";
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + memKey, 'HTTP-Referer': 'https://thegreenprint.trade', 'X-Title': 'The Greenprint AI' },
        body: JSON.stringify({ model: process.env.GREENPRINT_AI_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free', messages: [{ role: 'user', content: prompt }], max_tokens: 700 }),
      });
      if (!r.ok) return res.status(200).json({ memory: existing });
      const j = await r.json();
      let txt = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      txt = txt.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
      const a = txt.indexOf('['); const b = txt.lastIndexOf(']');
      let out = existing;
      if (a !== -1 && b !== -1) { try { const parsed = JSON.parse(txt.slice(a, b + 1)); if (Array.isArray(parsed)) out = parsed.map((s) => String(s).slice(0, 160)).filter(Boolean).slice(0, 25); } catch (e) {} }
      return res.status(200).json({ memory: out });
    } catch (e) { return res.status(200).json({ memory: existing }); }
  }

  if (kind === 'ai') {
    const aiKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_KEY ||
      process.env.OPEN_ROUTER_API_KEY ||
      process.env.NEXT_OPENROUTER_API_KEY ||
      '';
    const AI_MODEL = process.env.GREENPRINT_AI_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
    // Fallback free models tried in order if the primary is rate-limited (429) or down.
    const AI_FALLBACKS = [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'thinkingmachines/inkling:free',
    ];
    const AI_SYSTEM =
      "You are The Greenprint AI, the in-house AI for The Greenprint, a trading-education brand " +
      "covering day trading, investing, and commercial real estate. You are direct, confident, and practical. " +
      "No hype, no fake enthusiasm, no generic motivational filler. You explain markets and trading clearly. " +
      "Never guarantee or promise trading profits. Never invent live prices or market data; if asked for a live " +
      "price, say you do not have live market data. When you refer to risk control on a trade, always write " +
      "'stop loss' or 'stop losses', never 'stops'. Do not use em dashes or en dashes anywhere in your writing; " +
      "use commas or periods instead. Keep answers useful and to the point. " +
      "When you are given live web search results, use them to answer with current facts and briefly cite the sources.\n\n" +
      "WEBSITE BUILDING: When the user asks you to build, make, create, or design a website, landing page, " +
      "or any web page, you output a COMPLETE standalone HTML document and wrap it EXACTLY like this:\n" +
      "===GREENPRINT_SITE_START===\n" +
      "<!doctype html><html>...the entire page with inline CSS and JS, no external files...</html>\n" +
      "===GREENPRINT_SITE_END===\n" +
      "Rules for the HTML: one self-contained file, all CSS in a <style> tag and all JS in a <script> tag, " +
      "no external stylesheets or scripts except Google Fonts links. Make it genuinely premium and high end, " +
      "the quality of a 9-figure brand. Default to a full multi-section page, not a bare hero: a sticky nav, " +
      "a bold hero with a clear headline and call to action, a features or what-you-get section, social proof " +
      "or results framing, an FAQ or about block, and a footer. Use a distinctive Google Font pairing (not Inter), " +
      "a considered color palette, real on-topic copy (never lorem ipsum), tasteful motion (hover states, subtle " +
      "reveals), strong type scale, and generous spacing. Must be fully responsive and look great on a phone. " +
      "Dark modern aesthetic unless asked otherwise. " +
      "Before the opening marker, write ONE short sentence saying what you built. After the closing marker, " +
      "write ONE short sentence on what they can change next. Put NOTHING else outside the markers. " +
      "For any request that is NOT a website, never use these markers, just answer normally.";

    if (req.method === 'GET') {
      const seen = Object.keys(process.env).filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
      let liveKeyTest = 'skipped (no key)';
      if (aiKey) {
        try {
          const t = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: 'Bearer ' + aiKey } });
          liveKeyTest = { status: t.status, ok: t.ok, meaning: t.ok ? 'KEY WORKS' : 'key rejected by OpenRouter' };
        } catch (e) { liveKeyTest = { error: String((e && e.message) || e) }; }
      }
      return res.status(200).json({
        engine: 'greenprint-ai', alive: true, keyPresent: !!aiKey,
        keyStartsWith: aiKey ? aiKey.slice(0, 7) : null, openrouterVarNamesFound: seen, liveKeyTest,
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    if (!aiKey) {
      const seen = Object.keys(process.env).filter((k) => /OPENROUTER|OPEN_ROUTER/i.test(k));
      return res.status(503).json({
        error: seen.length
          ? 'Found related variables but not a usable key: ' + seen.join(', ') + '. Name must be exactly OPENROUTER_API_KEY, enabled for Production, then redeploy.'
          : 'No OpenRouter key set. Add OPENROUTER_API_KEY in Vercel (Production), then redeploy.',
      });
    }
    let aiBody = {};
    try { aiBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ error: 'bad_body' }); }
    const incoming = Array.isArray(aiBody.messages) ? aiBody.messages : [];
    const history = incoming
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    const mem = Array.isArray(aiBody.memory) ? aiBody.memory.slice(0, 30).map((s) => String(s).slice(0, 200)).filter(Boolean) : [];
    let sysContent = mem.length
      ? AI_SYSTEM + "\n\nWhat you remember about this user (use it naturally, do not recite it back):\n- " + mem.join('\n- ')
      : AI_SYSTEM;
    // Build iteration: if a site already exists in the canvas, give it to the model
    // so follow-up requests EDIT it instead of starting from scratch.
    const currentSite = typeof aiBody.currentSite === 'string' ? aiBody.currentSite.slice(0, 16000) : '';
    if (currentSite) {
      sysContent += "\n\nThe user already has this website open in the canvas. If they ask to change, tweak, add to, or fix it, EDIT this exact document and return the FULL updated HTML in the site markers (do not start over unless they clearly ask for a brand new site):\n===GREENPRINT_SITE_START===\n" + currentSite + "\n===GREENPRINT_SITE_END===";
    }
    // Vision: images (data URLs) the user attached, shown with their last message.
    const images = Array.isArray(aiBody.images) ? aiBody.images.filter((s) => typeof s === 'string' && s.startsWith('data:image')).slice(0, 4) : [];
    const hasVision = images.length > 0;
    const aiMessages = [{ role: 'system', content: sysContent }].concat(history);
    if (hasVision && aiMessages.length) {
      // attach images to the final user turn as content parts for a vision model
      for (let i = aiMessages.length - 1; i >= 0; i--) {
        if (aiMessages[i].role === 'user') {
          const txt = aiMessages[i].content || 'What is in this image?';
          aiMessages[i] = { role: 'user', content: [{ type: 'text', text: txt }].concat(images.map((u) => ({ type: 'image_url', image_url: { url: u } }))) };
          break;
        }
      }
    }

    // Detect a website-build request from the latest user message. Builds are a
    // heavy generation that stalls on free models, so route them to a fast paid
    // model (cheap, reliable). Plain chat stays on the free model.
    const BUILD_MODEL = process.env.GREENPRINT_BUILD_MODEL || 'anthropic/claude-haiku-5.5';
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    const lastText = (lastUser && lastUser.content ? lastUser.content : '').toLowerCase();
    const isBuild = /\b(build|make|create|design|generate|code)\b[^.?!]*\b(website|web page|webpage|site|landing page|page|homepage|html)\b/.test(lastText);

    // Detect a question that needs CURRENT / live information, so we can turn on
    // live web search for it. Kept narrow so most chat stays search-free (and free).
    // Web search is a paid feature, gated off for now (free mode).
    const WEB_ENABLED = false;
    const needsWeb = WEB_ENABLED && !isBuild && /\b(today|todays|tonight|right now|currently|current|latest|recent|recently|this week|this month|this year|2026|2027|news|headline|price|stock|market|crypto|bitcoin|ethereum|score|weather|forecast|who is|who won|when is|release date|just happened|breaking|update on|trending)\b/.test(lastText);
    // Only free models are allowed to run right now (no paid spend). A paid model
    // id requested from the UI is ignored and the free model is used instead.
    const reqModel = (aiBody.model && /:free$/.test(String(aiBody.model))) ? aiBody.model : '';
    // Cap output so premium models don't try to reserve their full 65k-token budget
    // (which overshoots the credit balance). Builds need room; chat needs little.
    const maxTok = isBuild ? 16384 : 2048;

    // ── GitHub integration (tool use) ────────────────────────────────────────
    // When the user has connected GitHub, give the model real tools it executes
    // server-side against the GitHub API with the user's token.
    const INTEGRATIONS_ENABLED = false; // integrations use a paid tool model, gated off for now
    const ghToken = (INTEGRATIONS_ENABLED && aiBody.connections && aiBody.connections.github) ? String(aiBody.connections.github) : '';
    const orHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + aiKey, 'HTTP-Referer': 'https://thegreenprint.trade', 'X-Title': 'The Greenprint AI' };
    if (ghToken) {
      const gh = (method, path, body) => fetch('https://api.github.com' + path, {
        method, headers: { Authorization: 'Bearer ' + ghToken, Accept: 'application/vnd.github+json', 'User-Agent': 'GreenprintAI', 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      let login = '';
      try { const u = await gh('GET', '/user'); if (u.ok) { const uj = await u.json(); login = uj.login; } } catch (e) {}
      if (!login) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write("I couldn't reach your GitHub. The token may be invalid or expired, re-add it under Connections.");
        return res.end();
      }
      const full = (r) => (String(r).includes('/') ? String(r) : login + '/' + String(r));
      const GH_TOOLS = [
        { type: 'function', function: { name: 'list_repos', description: "List the user's GitHub repositories (most recently updated first).", parameters: { type: 'object', properties: {} } } },
        { type: 'function', function: { name: 'list_files', description: 'List files/folders in a repo path. repo can be "name" or "owner/name".', parameters: { type: 'object', properties: { repo: { type: 'string' }, path: { type: 'string' } }, required: ['repo'] } } },
        { type: 'function', function: { name: 'read_file', description: 'Read a text file from a repo.', parameters: { type: 'object', properties: { repo: { type: 'string' }, path: { type: 'string' } }, required: ['repo', 'path'] } } },
        { type: 'function', function: { name: 'write_file', description: 'Create or update a file in a repo (makes a commit). Provide full file contents.', parameters: { type: 'object', properties: { repo: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' }, message: { type: 'string' } }, required: ['repo', 'path', 'content'] } } },
        { type: 'function', function: { name: 'search_code', description: "Search code across the user's repos.", parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
      ];
      const execGh = async (name, a) => {
        try {
          if (name === 'list_repos') { const r = await gh('GET', '/user/repos?per_page=30&sort=updated'); const j = await r.json(); return JSON.stringify((Array.isArray(j) ? j : []).map((x) => ({ repo: x.full_name, private: x.private, url: x.html_url }))); }
          if (name === 'list_files') { const r = await gh('GET', '/repos/' + full(a.repo) + '/contents/' + (a.path || '')); const j = await r.json(); return JSON.stringify(Array.isArray(j) ? j.map((f) => ({ name: f.name, type: f.type })) : (j.message || j)); }
          if (name === 'read_file') { const r = await gh('GET', '/repos/' + full(a.repo) + '/contents/' + a.path); const j = await r.json(); if (j && j.content) return Buffer.from(j.content, 'base64').toString('utf8').slice(0, 6000); return JSON.stringify(j.message || j); }
          if (name === 'write_file') { let sha; try { const g = await gh('GET', '/repos/' + full(a.repo) + '/contents/' + a.path); if (g.ok) { const gj = await g.json(); sha = gj.sha; } } catch (e) {} const r = await gh('PUT', '/repos/' + full(a.repo) + '/contents/' + a.path, { message: a.message || 'Update via Greenprint AI', content: Buffer.from(String(a.content), 'utf8').toString('base64'), sha }); const j = await r.json(); return r.ok ? ('Committed ' + a.path + ' to ' + full(a.repo)) : ('Error: ' + JSON.stringify(j.message || j)); }
          if (name === 'search_code') { const r = await gh('GET', '/search/code?q=' + encodeURIComponent((a.query || '') + ' user:' + login)); const j = await r.json(); return JSON.stringify((j.items || []).slice(0, 8).map((i) => ({ repo: i.repository && i.repository.full_name, path: i.path }))); }
        } catch (e) { return 'Error: ' + String((e && e.message) || e); }
        return 'Unknown tool';
      };
      const toolModel = aiBody.model || BUILD_MODEL;
      const convo = [{ role: 'system', content: sysContent + "\n\nYou have live access to the user's GitHub (logged in as " + login + "). Use the GitHub tools to actually read, search, create and commit files when asked. Confirm what you did plainly." }].concat(history);
      try {
        for (let round = 0; round < 5; round++) {
          const rr = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: orHeaders, body: JSON.stringify({ model: toolModel, messages: convo, tools: GH_TOOLS, tool_choice: 'auto', max_tokens: 2048 }) });
          if (!rr.ok) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.write('GitHub assistant error (' + rr.status + '). Try again.'); return res.end(); }
          const jj = await rr.json();
          const msg = jj.choices && jj.choices[0] && jj.choices[0].message;
          if (!msg) { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.write('No response. Try again.'); return res.end(); }
          convo.push(msg);
          if (msg.tool_calls && msg.tool_calls.length) {
            for (const tc of msg.tool_calls) {
              let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
              const out = await execGh(tc.function.name, args);
              convo.push({ role: 'tool', tool_call_id: tc.id, content: typeof out === 'string' ? out : JSON.stringify(out) });
            }
            continue;
          }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.write(msg.content || 'Done.');
          return res.end();
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write('That took more steps than allowed in one go. Try asking for one thing at a time.');
        return res.end();
      } catch (e) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write('Something went wrong talking to GitHub. Try again.');
        return res.end();
      }
    }

    // Free mode: everything runs on the free model chain. Builds included
    // (slower than a paid model, but $0). A requested free model wins if given.
    // Builds and image/vision need the fast, reliable, vision-capable model (cheap).
    // Plain chat stays on the free model. A requested free model still wins for chat.
    let tryModels;
    if (isBuild || hasVision) {
      tryModels = [BUILD_MODEL, AI_MODEL].concat(AI_FALLBACKS);
    } else if (reqModel) {
      tryModels = [reqModel].concat(AI_FALLBACKS.filter((m) => m !== reqModel));
    } else {
      tryModels = [AI_MODEL].concat(AI_FALLBACKS);
    }
    let up = null;
    let lastErr = '';
    for (const mdl of tryModels) {
      try {
        up = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + aiKey,
            'HTTP-Referer': 'https://thegreenprint.trade',
            'X-Title': 'The Greenprint AI',
          },
          body: JSON.stringify(
            needsWeb
              ? { model: mdl, stream: true, messages: aiMessages, max_tokens: maxTok, plugins: [{ id: 'web', max_results: 4 }] }
              : { model: mdl, stream: true, messages: aiMessages, max_tokens: maxTok }
          ),
        });
      } catch (e) { lastErr = 'unreachable'; up = null; continue; }
      if (up.ok && up.body) break; // got a good stream
      // capture the error, then try the next model
      try { const j = await up.json(); lastErr = 'model_error_' + up.status + ((j && j.error && j.error.message) ? ': ' + j.error.message : ''); }
      catch (e) { lastErr = 'model_error_' + up.status; }
      up = null;
    }

    if (!up || !up.body) {
      return res.status(502).json({ error: lastErr || 'All free models are busy right now. Try again in a moment, or add a few dollars of OpenRouter credit to raise the free limits.' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const reader = up.body.getReader();
    const dec = new TextDecoder();
    let carry = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += dec.decode(value, { stream: true });
        const lines = carry.split('\n');
        carry = lines.pop() || '';
        for (const line of lines) {
          const tl = line.trim();
          if (tl.indexOf('data:') !== 0) continue;
          const data = tl.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j && j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
            if (delta) res.write(delta);
          } catch (e) {}
        }
      }
    } catch (e) {}
    return res.end();
  }
  // ── end AI engine ──────────────────────────────────────────────────────────

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
      let broker = null;
      try { broker = JSON.parse((await r.get('gp:broker:v1')) || 'null'); } catch (e) { broker = null; }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, snapshot: rec, marks: marks, tree: tree, geo: geo, broker: broker });
    }

    // ── BROKER / IB BOOK — Livv Global IB rebates off referred trading volume ──
    //   Jay earns a flat rebate per lot his referred traders trade (default $25).
    //   POST ?kind=broker {key:GP_ADMIN_KEY, source, perLot?, broker:{totals, traders[]}}
    //         -> store the latest IB snapshot. A missing/empty snapshot is rejected
    //            so a failed hourly pull never wipes the last good numbers.
    //   GET  ?kind=broker&key=<GP_ADMIN_KEY|GP_TRACK_KEY|passcode>
    //         -> return the stored broker snapshot (the /track Broker view reads this,
    //            and ?kind=track returns it inline too).
    if (kind === 'broker') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const trackKey = process.env.GP_TRACK_KEY || '';
      const BKEY = 'gp:broker:v1';
      const perLotDefault = Number(process.env.BROKER_PER_LOT) || 25;
      if (req.method === 'POST') {
        const k = clean(body.key, 128) || qkey;
        if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_admin' });
        const b = (body.broker && typeof body.broker === 'object') ? body.broker : null;
        const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };
        const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);
        const rawTotals = (b && b.totals && typeof b.totals === 'object') ? b.totals : {};
        const rawSubs = (b && Array.isArray(b.subIBs)) ? b.subIBs : [];
        const rawClients = (b && Array.isArray(b.clients)) ? b.clients : [];
        const rint = (v) => { const n = num(v); return n != null ? Math.round(n) : null; };
        // Commission model (Livv): commission totals + the full client roster
        // (balance=funding, volume) + a sub-IB leaderboard. Reject empties so a failed
        // pull never wipes good data.
        const anyTotal = ['monthlyCommission', 'availableCommission', 'withdrawnCommission', 'clientTransaction', 'totalClients', 'activeTraders', 'ftd', 'payPerLot'].some((key) => num(rawTotals[key]) != null);
        if (!b || (rawSubs.length === 0 && rawClients.length === 0 && !anyTotal)) {
          return res.status(400).json({ error: 'bad_snapshot' });
        }
        const clients = rawClients.slice(0, 2000).map((c) => {
          const balance = round2(num(c.balance));
          const volume = round2(num(c.volume));
          return {
            name: clean(c.name, 80) || 'Client',
            email: clean(c.email, 160).toLowerCase(),
            phone: clean(c.phone, 32),
            tradingId: clean(c.tradingId, 48),
            balance: balance, volume: volume,
            commission: round2(num(c.commission)),
            deposits: round2(num(c.deposits)), withdrawals: round2(num(c.withdrawals)),
            ibName: clean(c.ibName, 80),
            level: rint(c.level) || 1,
            funded: (balance || 0) > 0,
          };
        }).sort((a, b2) => (b2.volume || 0) - (a.volume || 0));
        // ── History + per-client movement (what Jay can't see on Livv) ──────────
        // Deltas vs the last sync and vs a daily baseline ~a week back, plus a
        // "newly funded" flag. All best-effort; never blocks the store.
        const ckey = (c) => (c.tradingId || c.email || c.name || '').toLowerCase();
        let baselineDate = null;
        try {
          const round2b = (n) => (n == null ? null : Math.round(n * 100) / 100);
          // previous snapshot → since-last-sync delta
          const prevMap = {};
          try { const p = JSON.parse((await r.get(BKEY)) || 'null'); if (p && Array.isArray(p.clients)) for (const c of p.clients) prevMap[ckey(c)] = c; } catch (e2) {}
          // write today's daily baseline once (first sync of the day)
          const dayStr = (off) => { const d = new Date(Date.now() - off * 86400000); return d.toISOString().slice(0, 10); };
          const todayKey = 'gp:broker:day:' + dayStr(0);
          let hasToday = false; try { hasToday = !!(await r.get(todayKey)); } catch (e2) {}
          if (!hasToday) { const base = {}; for (const c of clients) base[ckey(c)] = { b: c.balance, v: c.volume }; try { await r.set(todayKey, JSON.stringify(base), 'EX', 60 * 60 * 24 * 40); } catch (e2) {} }
          // find a baseline ~7 days back (closest available)
          let weekBase = null;
          for (const off of [7, 6, 8, 5, 9, 4, 10, 3, 2, 1]) { try { const v = JSON.parse((await r.get('gp:broker:day:' + dayStr(off))) || 'null'); if (v) { weekBase = v; baselineDate = dayStr(off); break; } } catch (e2) {} }
          for (const c of clients) {
            const kk = ckey(c); const pv = prevMap[kk]; const wb = weekBase && weekBase[kk];
            c.dBalance = pv ? round2b((c.balance || 0) - (Number(pv.balance) || 0)) : null;
            c.dVolume = pv ? round2b((c.volume || 0) - (Number(pv.volume) || 0)) : null;
            c.wBalance = wb ? round2b((c.balance || 0) - (Number(wb.b) || 0)) : null;
            c.wVolume = wb ? round2b((c.volume || 0) - (Number(wb.v) || 0)) : null;
            c.newFunded = wb ? ((Number(wb.b) || 0) <= 0 && (c.balance || 0) > 0) : false;
          }
        } catch (e) {}
        const csum = (f) => clients.reduce((a, c) => a + (Number(c[f]) || 0), 0);
        const totals = {
          monthlyCommission: round2(num(rawTotals.monthlyCommission)),
          availableCommission: round2(num(rawTotals.availableCommission)),
          withdrawnCommission: round2(num(rawTotals.withdrawnCommission)),
          clientTransaction: round2(num(rawTotals.clientTransaction)),
          totalClients: rint(rawTotals.totalClients) != null ? rint(rawTotals.totalClients) : (clients.length || null),
          activeTraders: rint(rawTotals.activeTraders),
          ftd: rint(rawTotals.ftd),
          payPerLot: round2(num(rawTotals.payPerLot)),
          roster: clients.length,
          funded: rint(rawTotals.funded) != null ? rint(rawTotals.funded) : clients.filter((c) => c.funded).length,
          unfunded: rint(rawTotals.unfunded) != null ? rint(rawTotals.unfunded) : clients.filter((c) => !c.funded).length,
          trading: rint(rawTotals.trading) != null ? rint(rawTotals.trading) : clients.filter((c) => (c.volume || 0) > 0).length,
          totalBalance: round2(num(rawTotals.totalBalance) != null ? num(rawTotals.totalBalance) : csum('balance')),
          totalVolume: round2(num(rawTotals.totalVolume) != null ? num(rawTotals.totalVolume) : csum('volume')),
          teamDeposits: round2(num(rawTotals.teamDeposits)),
          teamWithdrawals: round2(num(rawTotals.teamWithdrawals)),
          netFunding: round2(num(rawTotals.netFunding)),
          depositCount: rint(rawTotals.depositCount),
          withdrawalCount: rint(rawTotals.withdrawalCount),
        };
        const subIBs = rawSubs.slice(0, 500).map((s) => ({
          name: clean(s.name, 80) || 'Sub-IB',
          email: clean(s.email, 160).toLowerCase(),
          commission: round2(num(s.commission)) || 0,
        })).sort((a, b2) => b2.commission - a.commission);
        const record = {
          updatedAt: Date.now(),
          source: clean(body.source, 24) || clean(b.source, 24) || 'manual',
          broker: clean(b.name, 40) || 'Livv Global',
          model: 'commission',
          totals: totals,
          subIBs: subIBs,
          clients: clients,
          baselineDate: baselineDate,
        };
        try { await r.set(BKEY, JSON.stringify(record)); }
        catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
        // Alert Jay when available commission rises since the last pull.
        try {
          let prev = null; try { prev = JSON.parse((await r.get('gp:broker:notify:last')) || 'null'); } catch (e2) {}
          const avail = totals.availableCommission;
          if (prev && typeof prev.avail === 'number' && avail != null && avail - prev.avail >= 1) {
            const d = round2(avail - prev.avail);
            await sendPush(r, '💰 +$' + d.toLocaleString() + ' commission', 'Your Livv available commission just went up. Open the Broker tab.', '/track', OKEY).catch(() => {});
          }
          await r.set('gp:broker:notify:last', JSON.stringify({ avail: avail, ts: record.updatedAt }));
        } catch (e) {}
        return res.status(200).json({ ok: true, subIBs: subIBs.length, clients: clients.length, updatedAt: record.updatedAt });
      }
      // GET — read, gated like the tracker (admin key, env view key, or passcode).
      const k = qkey || clean(body.key, 128);
      let storedPass = '';
      try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
      const okKey = (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
      if (!okKey) return res.status(403).json({ error: 'not_admin' });
      let rec = null;
      try { rec = JSON.parse((await r.get(BKEY)) || 'null'); } catch (e) { rec = null; }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, broker: rec });
    }

    // ── SPRINT GOAL — set the $10K double-pay goal fields directly (admin only) ─
    //   POST ?kind=track-goal {key:GP_ADMIN_KEY, earnings?, target?, perSub?, deadline?}
    //   Lets the goal — above all the current earnings — be corrected in one call
    //   without waiting on a browser pull. Only touches goal; members stay intact.
    if (kind === 'track-goal') {
      const adminKey = process.env.GP_ADMIN_KEY || '';
      const k = clean(body.key, 128) || qkey;
      if (!adminKey || k !== adminKey) return res.status(403).json({ error: 'not_admin' });
      let rec = null;
      try { rec = JSON.parse((await r.get('gp:track:v1')) || 'null'); } catch (e) { rec = null; }
      if (!rec || typeof rec !== 'object') return res.status(400).json({ error: 'no_snapshot' });
      const g = (rec.goal && typeof rec.goal === 'object') ? rec.goal : { earnings: null, target: 10000, perSub: 100, deadline: '2026-11-30' };
      if (body.earnings !== undefined && body.earnings !== null && body.earnings !== '') { const e = Number(body.earnings); if (isFinite(e) && e >= 0) g.earnings = Math.round(e * 100) / 100; }
      if (body.target !== undefined) { const t = Number(body.target); if (isFinite(t) && t > 0) g.target = Math.round(t); }
      if (body.perSub !== undefined) { const p = Number(body.perSub); if (isFinite(p) && p > 0) g.perSub = Math.round(p); }
      if (body.deadline !== undefined) { const d = clean(body.deadline, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) g.deadline = d; }
      rec.goal = g; rec.updatedAt = Date.now();
      try { await r.set('gp:track:v1', JSON.stringify(rec)); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, goal: g });
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
      // discover=1 is a read-only probe (find the earnings endpoint); it writes no
      // snapshot, so it is exempt from the self-rate-limit and can run on demand.
      const DISCOVER = String((req.query && req.query.discover) || '') === '1';
      // Self-rate-limit: never hit One House more than once per ~9 min, so a public trigger can't be abused.
      const force = isAdmin && String((req.query && req.query.force) || '') === '1';
      if (!force && !DISCOVER) { try { const p0 = JSON.parse((await r.get('gp:track:v1')) || 'null'); if (p0 && p0.source === 'auto-1h' && (Date.now() - (p0.updatedAt || 0)) < 9 * 60 * 1000) return res.status(200).json({ ok: true, skipped: true, reason: 'recent' }); } catch (e) {} }
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
            nodes.push({ id: n.user_id, sp: (u.sponsor == null ? null : u.sponsor), uname: String(u.username || '').trim(), name: String(n.fullname || u.username || '').trim(), email: String(u.email || '').toLowerCase(), paid: /yes/i.test(String(n.paid_subscription)), subs: n.subscribers_count || 0, lvl: n.level, amount: Number(pk.amount) || 0, purchase: pk.purchase_date || n.paid_subscription_date || null });
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
      // 4) rebuild the goal. target/perSub/deadline are owned by the app (double-pay
      //    runs through the end of November — SPRINT_DEADLINE). earnings is pulled from
      //    One House when we can find a lifetime/total-earnings field, else the last
      //    known value is kept so the number never resets to blank.
      const SPRINT_DEADLINE = '2026-11-30';
      let prevGoal = null; try { const prev = JSON.parse((await r.get('gp:track:v1')) || 'null'); prevGoal = prev && prev.goal ? prev.goal : null; } catch (e) {}
      const prevEarn = (prevGoal && typeof prevGoal.earnings === 'number') ? prevGoal.earnings : null;
      // 4a) best-effort lifetime-earnings pull. Runs where it has network to One House
      //     (the hourly cron on Vercel). Conservative: only a strongly-named earnings
      //     field overwrites the number; every numeric candidate is logged for review.
      let pulledEarnings = null; const earnDbg = { tried: [], candidates: [], detail: [], matches: [] };
      const expForScan = Number((req.query && req.query.expect) || '');
      try {
        // Lightweight hourly set; a bigger set only when discovering the endpoint.
        // /api/profile is the confirmed earnings source: data.total_commission is the
        // lifetime earnings (total_payout is only what's been withdrawn). It leads the
        // list so the hourly pull grabs it directly; the rest are fallbacks.
        const BASE_PATHS = ['/api/profile', '/api/user/dashboard', '/api/user/earnings', '/api/user/earning', '/api/user/income'];
        const MORE_PATHS = ['/api/user/dashboard-data', '/api/user/home', '/api/home', '/api/user/overview', '/api/user/summary', '/api/user/stats', '/api/user/board', '/api/user/incomes', '/api/user/earning-summary', '/api/user/income-summary', '/api/user/earning-statics', '/api/user/earning-statistics', '/api/user/total-earning', '/api/user/total-income', '/api/user/wallet-balance', '/api/user/payout', '/api/user/payouts', '/api/user/commissions', '/api/user/commission', '/api/user/rewards', '/api/user/bonus', '/api/user/rank', '/api/user/team-sales', '/api/user/sales', '/api/user/report', '/api/user', '/api/me', '/api/profile', '/api/user/detail', '/api/user/details', '/api/dashboard/user', '/api/user/me'];
        const EARN_PATHS = DISCOVER ? BASE_PATHS.concat(MORE_PATHS) : BASE_PATHS;
        const STRICT = /(?:lifetime|total|net|overall)[_\s]*earn|earn[_\s]*(?:lifetime|total)|lifetime[_\s]*income|total[_\s]*income|total[_\s]*commission/i;
        const toNum = (v) => { if (typeof v === 'number') return isFinite(v) ? v : NaN; if (typeof v === 'string' && /^[-$,.\d]+$/.test(v.trim()) && /\d/.test(v)) { const n = Number(v.replace(/[$,]/g, '')); return isFinite(n) ? n : NaN; } return NaN; };
        const scan = (o, path, depth, keyBag, label) => {
          if (o == null || depth > 6) return;
          if (Array.isArray(o)) { for (let i = 0; i < o.length && i < 60; i++) scan(o[i], path + '[' + i + ']', depth + 1, keyBag, label); return; }
          if (typeof o !== 'object') return;
          for (const key of Object.keys(o)) {
            const kp = path ? path + '.' + key : key; const num = toNum(o[key]);
            if (isFinite(num)) {
              if (/earn|income|commission|wallet|balance|payout|bonus|reward|revenue/i.test(key)) { earnDbg.candidates.push({ k: kp, v: num }); if (keyBag) keyBag.push(kp); }
              if (isFinite(expForScan) && Math.abs(num - expForScan) < 1 && earnDbg.matches.length < 20) earnDbg.matches.push((label ? label + ' ' : '') + kp);
              if (pulledEarnings == null && STRICT.test(key) && num >= 0) pulledEarnings = num;
            } else if (o[key] && typeof o[key] === 'object') { scan(o[key], kp, depth + 1, keyBag, label); }
          }
        };
        const tryOne = async (p, method) => {
          try {
            const rr = await fetch(B + p, method === 'POST' ? { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: '{}' } : { headers: H });
            const tag = p + (method === 'POST' ? '#POST' : '') + ':' + rr.status;
            if (!rr.ok) {
              earnDbg.tried.push(tag);
              if (DISCOVER && rr.status >= 500) { const t = await rr.text().catch(() => ''); earnDbg.detail.push({ p: p + (method === 'POST' ? '#POST' : ''), status: rr.status, err: String(t || '').replace(/\s+/g, ' ').slice(0, 160) }); }
              return;
            }
            const jj = await rr.json().catch(() => null); earnDbg.tried.push(tag);
            if (jj) { const keyBag = []; scan(jj, '', 0, keyBag, p + (method === 'POST' ? '#POST' : '')); if (DISCOVER) { const top = (jj && typeof jj === 'object' && !Array.isArray(jj)) ? Object.keys(jj).slice(0, 25) : (Array.isArray(jj) ? ['<array>'] : []); earnDbg.detail.push({ p: p + (method === 'POST' ? '#POST' : ''), status: rr.status, topKeys: top, earnKeys: Array.from(new Set(keyBag)).slice(0, 20) }); } }
          } catch (e) { earnDbg.tried.push(p + ':err'); }
        };
        for (const p of EARN_PATHS) { if (pulledEarnings != null && !DISCOVER) break; await tryOne(p, 'GET'); }
        // The dashboard route 500s on a bare GET — in discovery, try POST and a couple
        // of common param shapes to coax it open (it likely holds the headline number).
        if (DISCOVER) { await tryOne('/api/user/dashboard', 'POST'); await tryOne('/api/user/dashboard?type=all', 'GET'); await tryOne('/api/dashboard', 'POST'); await tryOne('/api/user/dashboard/stats', 'GET'); await tryOne('/api/user/wallet', 'GET'); await tryOne('/api/user/wallets', 'GET'); await tryOne('/api/user/income-report', 'GET'); await tryOne('/api/user/genealogy', 'GET'); }
        try { await r.set('gp:1h:earnpull', JSON.stringify({ at: now, pulled: pulledEarnings, candidates: earnDbg.candidates.slice(0, 40), tried: earnDbg.tried, detail: earnDbg.detail.slice(0, 40) })); } catch (e) {}
      } catch (e) {}
      // Discovery probe: report what we found and stop — no snapshot write.
      if (DISCOVER) {
        res.setHeader('Cache-Control', 'no-store');
        // Units check only — never the amount: number of whole digits and whether it
        // has cents, so we can confirm it's dollars (~4-5 digits) not cents or zero.
        const mag = pulledEarnings != null ? { digits: String(Math.floor(Math.abs(pulledEarnings))).length, hasCents: Math.round(pulledEarnings * 100) % 100 !== 0, positive: pulledEarnings > 0 } : null;
        // expect=<n>: compare (never logs the amount) — reports whether the pulled value
        // matches and WHICH field equals n, so the right earnings field is confirmed.
        const exp = Number((req.query && req.query.expect) || '');
        let match = null;
        if (isFinite(exp)) {
          match = { matchesPulled: pulledEarnings != null && Math.abs(pulledEarnings - exp) < 1, matchField: (earnDbg.candidates.find((c) => Math.abs(c.v - exp) < 1) || {}).k || null, anyFieldMatches: Array.from(new Set(earnDbg.matches)).slice(0, 20) };
        }
        return res.status(200).json({ ok: true, discover: true, earn: { tried: earnDbg.tried, candidateKeys: Array.from(new Set(earnDbg.candidates.map((c) => c.k))).slice(0, 40), detail: earnDbg.detail.slice(0, 40), pulled: pulledEarnings != null, mag: mag, match: match } });
      }
      // NOTE: One House's API does not expose the dashboard "Lifetime Earnings" figure
      // (the /api/user/dashboard route 500s; total_commission is a different number), so
      // we do NOT auto-overwrite earnings here — that would show a wrong value. earnings
      // is owned by whatever last set it via ?kind=track-goal (the ✎ editor, or the
      // hourly browser scrape that reads the real dashboard number). We only preserve it.
      const goal = { earnings: prevEarn, target: 10000, perSub: 100, deadline: SPRINT_DEADLINE };
      const record = { updatedAt: now, source: 'auto-1h', counts: { active: active, inactive: inactive, lapsed: lapsed, due: due, withPhone: 0, total: members.length }, goal: goal, members: members.slice(0, 2000) };
      try { await r.set('gp:track:v1', JSON.stringify(record)); await r.set('gp:track:tree', JSON.stringify(tree.slice(0, 5000))); } catch (e) { return res.status(200).json({ ok: false, error: 'store_failed' }); }
      // 4b) incremental geo — fill real city/state/phone for members that don't have it yet
      //     (new joiners, mostly). Capped per run so the hourly stays fast & hands-off.
      try {
        let geo = {}; try { geo = JSON.parse((await r.get('gp:track:geo')) || '{}') || {}; } catch (e) {}
        const needs = nodes.filter((n) => n.email && (n.uname || n.email) && !(geo[n.email] && geo[n.email].s)).slice(0, 25);
        if (needs.length) {
          const PROXY = 'https://vuefjlszkeijndgvshxv.supabase.co/functions/v1/backend-proxy';
          for (const n of needs) {
            const term = n.uname || n.email; if (!term) continue;
            try {
              const pr = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: '/distributor/search', method: 'GET', queryParams: { search: term }, requiresAdmin: false }) });
              const pj = await pr.json().catch(() => null);
              const arr = (pj && pj.data && Array.isArray(pj.data.data)) ? pj.data.data : [];
              let hit = n.uname ? arr.find((x) => String(x.username || '').toLowerCase() === n.uname.toLowerCase()) : null;
              if (!hit) hit = arr.find((x) => String(x.email || '').toLowerCase() === n.email);
              if (hit) geo[n.email] = { p: String(hit.phone || ''), c: String(hit.city || ''), s: String(hit.state || '') };
            } catch (e) {}
          }
          try { await r.set('gp:track:geo', JSON.stringify(geo)); } catch (e) {}
        }
      } catch (e) {}
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
        for (const n of notifs) { try { await sendPush(r, n.t, n.b, '/track', OKEY); } catch (e) {} }
        await r.set('gp:track:notify:last', JSON.stringify({ activeEmails: activeEmails, lapsed: lapsed, count: active, ts: now }));
      } catch (e) {}
      res.setHeader('Cache-Control', 'no-store');
      const out = { ok: true, source: 'auto-1h', members: members.length, active: active, inactive: inactive, lapsed: lapsed };
      // ?debug=1 — safe diagnostics: which endpoints answered and what earnings-like
      // FIELD NAMES One House returned (never the dollar amounts), plus whether a value
      // was locked in. Lets the earnings pull be verified/tuned without leaking numbers.
      if (String((req.query && req.query.debug) || '') === '1') {
        out.earn = { tried: earnDbg.tried, candidateKeys: Array.from(new Set(earnDbg.candidates.map((c) => c.k))).slice(0, 40), pulled: pulledEarnings != null, deadline: goal.deadline };
        if (earnDbg.detail && earnDbg.detail.length) out.earn.detail = earnDbg.detail; // field names + 5xx error text, no dollar values
        if (isAdmin) out.earn.earnings = goal.earnings;
      }
      return res.status(200).json(out);
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
      for (const n of notifs) { try { sent += await sendPush(r, n.title, n.body, n.url, OKEY); } catch (e) {} }
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
        // Owner subscriptions (the private /track page) land in the owner-only
        // pool and NEVER in the public pool, so business-tracker alerts stay
        // private. Verified against the admin key, track key, or stored passcode.
        if (body.owner) {
          const adminKey = process.env.GP_ADMIN_KEY || '';
          const trackKey = process.env.GP_TRACK_KEY || '';
          const k = clean(body.key, 128);
          let storedPass = '';
          try { storedPass = (await r.get('gp:track:pass')) || ''; } catch (e) {}
          const okKey = (adminKey && k === adminKey) || (trackKey && k === trackKey) || (storedPass && k === storedPass);
          if (!okKey) return res.status(403).json({ error: 'not_owner' });
          // Move the endpoint out of the public pool if it was ever registered there.
          try { await r.hdel(PKEY, sub.endpoint); } catch (e) {}
          try { await r.hset(OKEY, sub.endpoint, JSON.stringify(sub)); } catch (e) {}
          return res.status(200).json({ ok: true, owner: true });
        }
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
