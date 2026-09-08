// The Greenprint — /join confirm handler (Vercel serverless function).
// POST { name, email, phone, experience } -> sends an approval request to the admin Telegram chat.
const crypto = require("crypto");

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1003849673824";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thegreenprint.trade";

function sign(b) {
  return crypto.createHmac("sha256", process.env.TV_WEBHOOK_KEY || "").update(b).digest("hex");
}
function makeToken(n, e) {
  const b = Buffer.from(JSON.stringify({ n, e, exp: Date.now() + 7 * 864e5 })).toString("base64url");
  return b + "." + sign(b);
}
async function tg(method, body) {
  const r = await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "method" }); return; }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const e = String(body.email || "").trim().toLowerCase();
    const n = String(body.name || "").trim().slice(0, 80);
    const phone = body.phone ? String(body.phone).trim() : "";
    const experience = body.experience ? String(body.experience).trim() : "";
    if (!/.+@.+\..+/.test(e)) { res.status(400).json({ ok: false, error: "invalid_email" }); return; }

    const approveUrl = SITE + "/api/gp-approve?t=" + encodeURIComponent(makeToken(n, e));
    const text =
      "🟢 <b>New signals request</b>\n\n" +
      "👤 " + (n || "—") + "\n" +
      "📧 " + e + "\n" +
      (phone ? "📱 " + phone + "\n" : "") +
      (experience ? "🎯 " + experience + "\n" : "") +
      "\nCheck this is a real signup under your LivvFX link, then tap Approve to mint a one-time invite.\n\n" +
      '<a href="' + approveUrl + '">✅ Approve &amp; get invite link</a>';

    await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, parse_mode: "HTML", disable_web_page_preview: true, text });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
};


