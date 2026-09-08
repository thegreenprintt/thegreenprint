// The Greenprint — /join confirm + live approve/deny (one Vercel function, backed by Redis).
//   POST { name,email,phone,experience } -> stores "pending", posts a clean Approve/Deny to the admin chat, returns a poll token.
//   GET  ?poll=TOKEN  -> { status: pending | approved (+invite) | denied | invalid }
//   GET  ?a=TOKEN     -> approve: mint one-time invite, mark approved (shown live on the visitor's screen). Admin sees a plain confirmation, no link.
//   GET  ?d=TOKEN     -> deny.
const crypto = require("crypto");
const Redis = require("ioredis");

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1004342057901";
const SIGNALS_CHAT_ID = process.env.TELEGRAM_SIGNALS_CHAT_ID || "-1004402136352";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thegreenprint.trade";

function rc() { return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, connectTimeout: 8000, lazyConnect: false }); }
async function kvSet(k, v, ex) { const r = rc(); try { await r.set(k, v, "EX", ex); } finally { r.disconnect(); } }
async function kvGet(k) { const r = rc(); try { return await r.get(k); } finally { r.disconnect(); } }

function sign(b) { return crypto.createHmac("sha256", process.env.TV_WEBHOOK_KEY || "").update(b).digest("hex"); }
function makeToken(n, e) {
  const b = Buffer.from(JSON.stringify({ n, e, exp: Date.now() + 7 * 864e5 })).toString("base64url");
  return b + "." + sign(b);
}
function verify(tok) {
  const d = String(tok || "").lastIndexOf(".");
  if (d < 0) return null;
  const b = tok.slice(0, d), s = tok.slice(d + 1), exp = sign(b);
  if (s.length !== exp.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (!p || !p.e || !p.exp || Date.now() > p.exp) return null;
    return p;
  } catch (e) { return null; }
}
async function tg(method, body) {
  const r = await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
function adminPage(res, msg, sub) {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greenprint</title></head>' +
    '<body style="margin:0;background:#04060a;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
    '<div style="text-align:center;padding:24px;max-width:420px"><div style="font-size:44px;margin-bottom:12px">✅</div>' +
    '<h1 style="color:#00FF85;font-size:22px;margin:0 0 10px">' + msg + '</h1>' +
    '<div style="color:#cfcfcf;font-size:15px;line-height:1.6">' + sub + '</div></div></body></html>'
  );
}

module.exports = async function handler(req, res) {
  const q = req.query || {};

  // ---- APPROVE ----
  if (req.method === "GET" && q.a) {
    const data = verify(q.a);
    if (!data) { adminPage(res, "Link expired", "This request is invalid or expired."); return; }
    try {
      const existing = await kvGet("gp:" + q.a);
      let link;
      if (existing && existing.indexOf("approved:") === 0) {
        link = existing.slice("approved:".length);
      } else {
        const invite = await tg("createChatInviteLink", {
          chat_id: SIGNALS_CHAT_ID, member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 86400, name: "GP " + String(data.e).slice(0, 20),
        });
        if (!invite.ok || !invite.result || !invite.result.invite_link) {
          adminPage(res, "Couldn't create invite", "Telegram didn't return a link. Check the bot is still an admin of the signals chat, then try again.");
          return;
        }
        link = invite.result.invite_link;
        await kvSet("gp:" + q.a, "approved:" + link, 86400);
      }
      adminPage(res, "Approved ✅", "<b>" + data.e + "</b> is being let in now — their screen just unlocked the chat. You can close this.");
    } catch (err) { adminPage(res, "Something went wrong", String(err)); }
    return;
  }

  // ---- DENY ----
  if (req.method === "GET" && q.d) {
    const data = verify(q.d);
    if (!data) { adminPage(res, "Link expired", "This request is invalid or expired."); return; }
    try { await kvSet("gp:" + q.d, "denied", 86400); } catch (e) {}
    adminPage(res, "Denied", "Okay — <b>" + data.e + "</b> won't be let in.");
    return;
  }

  // ---- POLL (visitor's screen) ----
  if (req.method === "GET" && q.poll) {
    const data = verify(q.poll);
    if (!data) { res.status(200).json({ status: "invalid" }); return; }
    let v = null;
    try { v = await kvGet("gp:" + q.poll); } catch (e) { res.status(200).json({ status: "pending" }); return; }
    if (v && v.indexOf("approved:") === 0) { res.status(200).json({ status: "approved", invite: v.slice("approved:".length) }); return; }
    if (v === "denied") { res.status(200).json({ status: "denied" }); return; }
    res.status(200).json({ status: "pending" });
    return;
  }

  if (req.method === "GET") { res.status(200).json({ ok: true }); return; }

  // ---- CONFIRM (POST) ----
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "method" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const e = String(body.email || "").trim().toLowerCase();
    const n = String(body.name || "").trim().slice(0, 80);
    const phone = body.phone ? String(body.phone).trim() : "";
    const experience = body.experience ? String(body.experience).trim() : "";
    if (!/.+@.+\..+/.test(e)) { res.status(400).json({ ok: false, error: "invalid_email" }); return; }

    const tok = makeToken(n, e);
    await kvSet("gp:" + tok, "pending", 604800);

    const approveUrl = SITE + "/api/gp-confirm?a=" + encodeURIComponent(tok);
    const denyUrl = SITE + "/api/gp-confirm?d=" + encodeURIComponent(tok);
    const text =
      "🟢 <b>New signals request</b>\n\n" +
      "👤 " + (n || "—") + "\n" +
      "📧 " + e + "\n" +
      (phone ? "📱 " + phone + "\n" : "") +
      (experience ? "🎯 " + experience + "\n" : "") +
      "\nCheck this is a real signup under your LivvFX link, then decide:\n\n" +
      '<a href="' + approveUrl + '">✅ Approve</a>     <a href="' + denyUrl + '">🚫 Deny</a>';

    await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, parse_mode: "HTML", disable_web_page_preview: true, text });
    res.status(200).json({ ok: true, token: tok });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
};

