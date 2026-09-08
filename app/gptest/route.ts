import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1003849673824";
const SIGNALS_CHAT_ID = process.env.TELEGRAM_SIGNALS_CHAT_ID || "-1004402136352";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thegreenprint.trade";

function sign(b: string) {
  return createHmac("sha256", process.env.TV_WEBHOOK_KEY || "").update(b).digest("hex");
}
function makeToken(n: string, e: string) {
  const b = Buffer.from(JSON.stringify({ n, e, exp: Date.now() + 7 * 864e5 })).toString("base64url");
  return b + "." + sign(b);
}
function verify(tok: string): { n: string; e: string; exp: number } | null {
  const d = tok.lastIndexOf(".");
  if (d < 0) return null;
  const b = tok.slice(0, d), s = tok.slice(d + 1), exp = sign(b);
  if (s.length !== exp.length) return null;
  if (!timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (!p || !p.e || !p.exp || Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
async function sendEmail(to: string, invite: string, name: string) {
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b0b0b;color:#fff;border-radius:16px">' +
    '<h2 style="color:#00FF85;margin:0 0 12px">You’re confirmed' + (name ? ", " + name : "") + ' 🌿</h2>' +
    '<p style="color:#cfcfcf;line-height:1.6;font-size:15px">Your account checked out. Here’s your personal one-time invite to the free signals chat. It works once, just for you — tap it now:</p>' +
    '<p style="text-align:center;margin:24px 0"><a href="' + invite + '" style="background:#00FF85;color:#000;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:12px;display:inline-block">Join the free signals chat →</a></p>' +
    '<p style="color:#888;font-size:12px;line-height:1.6">Turn notifications on so you never miss an entry. Educational only. Not financial advice. Trading involves risk of loss.</p></div>';
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || "The Greenprint <team@thegreenprint.trade>", to, subject: "Your Greenprint free signals invite", html }),
  });
  return r.json();
}
function html(msg: string, sub: string) {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greenprint</title></head>' +
    '<body style="margin:0;background:#04060a;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
    '<div style="text-align:center;padding:24px;max-width:420px"><div style="font-size:40px;margin-bottom:12px">✅</div>' +
    '<h1 style="color:#00FF85;font-size:22px;margin:0 0 8px">' + msg + '</h1>' +
    '<p style="color:#aaa;font-size:15px;line-height:1.6">' + sub + '</p></div></body></html>',
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req: Request) {
  try {
    const { name, email, phone, experience } = await req.json();
    const e = String(email || "").trim().toLowerCase();
    const n = String(name || "").trim().slice(0, 80);
    if (!/.+@.+\..+/.test(e)) return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
    const approveUrl = `${SITE}/gptest?t=${encodeURIComponent(makeToken(n, e))}`;
    const text =
      "🟢 <b>New signals request</b>\n\n👤 " + (n || "—") + "\n📧 " + e + "\n" +
      (phone ? "📱 " + String(phone).trim() + "\n" : "") +
      (experience ? "🎯 " + String(experience).trim() + "\n" : "") +
      "\nCheck this email is a real signup under your LivvFX link, then tap Approve to send them a one-time invite.\n\n" +
      '<a href="' + approveUrl + '">✅ Approve &amp; send invite</a>';
    await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, parse_mode: "HTML", disable_web_page_preview: true, text });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!t) return Response.json({ ok: true, marker: "GPTEST_MARKER_v3" });
  const data = verify(t);
  if (!data) return html("Link expired", "This approval link is invalid or has expired. Have them submit again.");
  const invite = await tg("createChatInviteLink", {
    chat_id: SIGNALS_CHAT_ID, member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 86400, name: "GP " + data.e.slice(0, 20),
  });
  if (!invite.ok || !invite.result?.invite_link)
    return html("Couldn't create invite", "Telegram didn't return a link. Check the bot is still an admin, then try again.");
  const er = await sendEmail(data.e, invite.result.invite_link, data.n);
  const ok = er && !er.error;
  return html(ok ? "Approved — invite sent" : "Approved — invite ready",
    ok ? "A one-time invite was emailed to " + data.e + "." : "Invite link (email failed, copy it to them): " + invite.result.invite_link);
}

