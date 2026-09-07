import crypto from "crypto";

export const runtime = "nodejs";

// GP FREE GAME channel — where approved people are invited.
const SIGNALS_CHAT_ID = process.env.TELEGRAM_SIGNALS_CHAT_ID || "-1004402136352";

function sign(payloadB64: string) {
  const secret = process.env.TV_WEBHOOK_KEY || "";
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
}

function verify(token: string): { n: string; e: string; exp: number } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(b64);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!p || !p.e || !p.exp || Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

async function tg(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sendEmail(to: string, inviteUrl: string, name: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "The Greenprint <team@thegreenprint.trade>";
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b0b0b;color:#fff;border-radius:16px">' +
    '<h2 style="color:#00FF85;margin:0 0 12px">You\'re confirmed' + (name ? ", " + name : "") + ' 🌿</h2>' +
    '<p style="color:#cfcfcf;line-height:1.6;font-size:15px">Your account checked out. Here\'s your personal one-time invite to the free signals chat. It works once, just for you — tap it now:</p>' +
    '<p style="text-align:center;margin:24px 0"><a href="' + inviteUrl + '" style="background:#00FF85;color:#000;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:12px;display:inline-block">Join the free signals chat →</a></p>' +
    '<p style="color:#888;font-size:12px;line-height:1.6">Turn notifications on so you never miss an entry. Educational only. Not financial advice. Trading involves risk of loss.</p>' +
    "</div>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: "Your Greenprint free signals invite", html }),
  });
  return r.json();
}

function page(msg: string, sub: string) {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greenprint</title></head>' +
    '<body style="margin:0;background:#04060a;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
    '<div style="text-align:center;padding:24px;max-width:420px">' +
    '<div style="font-size:40px;margin-bottom:12px">✅</div>' +
    '<h1 style="color:#00FF85;font-size:22px;margin:0 0 8px">' + msg + '</h1>' +
    '<p style="color:#aaa;font-size:15px;line-height:1.6">' + sub + '</p></div></body></html>',
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t") || "";
  const data = verify(t);
  if (!data) return page("Link expired", "This approval link is invalid or has expired. Have them submit again.");

  const invite = await tg("createChatInviteLink", {
    chat_id: SIGNALS_CHAT_ID,
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    name: "GP " + data.e.slice(0, 20),
  });

  if (!invite.ok || !invite.result?.invite_link) {
    return page("Couldn't create invite", "Telegram didn't return a link. Check the bot is still an admin, then try again.");
  }

  const emailRes = await sendEmail(data.e, invite.result.invite_link, data.n);
  const emailed = emailRes && !emailRes.error;

  return page(
    emailed ? "Approved — invite sent" : "Approved — invite ready",
    emailed
      ? "A one-time invite was emailed to " + data.e + "."
      : "Invite link (email failed, copy it to them): " + invite.result.invite_link
  );
}
