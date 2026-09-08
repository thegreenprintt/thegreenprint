// The Greenprint — approve handler (Vercel serverless function).
// GET /api/gp-approve?t=TOKEN -> verifies, mints a one-time invite to the free signals chat,
// shows it on the page and drops it into the admin chat (no email configured).
const crypto = require("crypto");

const SIGNALS_CHAT_ID = process.env.TELEGRAM_SIGNALS_CHAT_ID || "-1004402136352";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1003849673824";

function sign(b) {
  return crypto.createHmac("sha256", process.env.TV_WEBHOOK_KEY || "").update(b).digest("hex");
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
function page(res, msg, sub) {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greenprint</title></head>' +
    '<body style="margin:0;background:#04060a;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
    '<div style="text-align:center;padding:24px;max-width:440px"><div style="font-size:40px;margin-bottom:12px">✅</div>' +
    '<h1 style="color:#00FF85;font-size:22px;margin:0 0 10px">' + msg + '</h1>' +
    '<div style="color:#cfcfcf;font-size:15px;line-height:1.6">' + sub + '</div></div></body></html>'
  );
}

module.exports = async function handler(req, res) {
  const data = verify(req.query && req.query.t);
  if (!data) { page(res, "Link expired", "This approval link is invalid or has expired. Have them submit again."); return; }
  try {
    const invite = await tg("createChatInviteLink", {
      chat_id: SIGNALS_CHAT_ID,
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 86400,
      name: "GP " + String(data.e).slice(0, 20),
    });
    if (!invite.ok || !invite.result || !invite.result.invite_link) {
      page(res, "Couldn't create invite", "Telegram didn't return a link. Check the bot is still an admin of the signals chat, then try again.");
      return;
    }
    const link = invite.result.invite_link;
    // drop the link into the admin chat so it's saved for you to send
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      text: "✅ Approved <b>" + data.e + "</b>\nOne-time invite (works once, 24h):\n" + link,
    });
    page(res, "Approved ✅",
      "One-time invite for <b>" + data.e + "</b> (works once, expires in 24h):" +
      '<div style="margin:16px 0"><a href="' + link + '" style="color:#00FF85;word-break:break-all">' + link + '</a></div>' +
      "It's also been sent to your Greenprint admin chat. Send it to them to let them in.");
  } catch (err) {
    page(res, "Something went wrong", String(err));
  }
};

