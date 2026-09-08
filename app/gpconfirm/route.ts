import { createHmac } from "node:crypto";

export const runtime = "nodejs";

// Chat that receives the "new signals request" messages (The Greenprint Chat).
// Chat IDs are not secrets (they grant no access on their own).
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1003849673824";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thegreenprint.trade";

function sign(payloadB64: string) {
  const secret = process.env.TV_WEBHOOK_KEY || "";
  return createHmac("sha256", secret).update(payloadB64).digest("hex");
}

function makeToken(name: string, email: string) {
  const payload = { n: name, e: email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return b64 + "." + sign(b64);
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

export async function POST(req: Request) {
  try {
    const { name, email, phone, experience } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim().slice(0, 80);
    if (!/.+@.+\..+/.test(cleanEmail)) {
      return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const token = makeToken(cleanName, cleanEmail);
    const approveUrl = `${SITE}/gpapprove?t=${encodeURIComponent(token)}`;

    const text =
      "🟢 <b>New signals request</b>\n\n" +
      "👤 " + (cleanName || "—") + "\n" +
      "📧 " + cleanEmail + "\n" +
      (phone ? "📱 " + String(phone).trim() + "\n" : "") +
      (experience ? "🎯 " + String(experience).trim() + "\n" : "") +
      "\nCheck this email is a real signup under your LivvFX link, then tap Approve to send them a one-time invite.\n\n" +
      '<a href="' + approveUrl + '">✅ Approve &amp; send invite</a>';

    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      text,
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
import { createHmac } from "node:crypto";

export const runtime = "nodejs";

// Chat that receives the "new signals request" messages (The Greenprint Chat).
// Chat IDs are not secrets (they grant no access on their own).
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1003849673824";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://thegreenprint.trade";

function sign(payloadB64: string) {
  const secret = process.env.TV_WEBHOOK_KEY || "";
  return createHmac("sha256", secret).update(payloadB64).digest("hex");
}

function makeToken(name: string, email: string) {
  const payload = { n: name, e: email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return b64 + "." + sign(b64);
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

export async function POST(req: Request) {
  try {
    const { name, email, phone, experience } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim().slice(0, 80);
    if (!/.+@.+\..+/.test(cleanEmail)) {
      return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const token = makeToken(cleanName, cleanEmail);
    const approveUrl = `${SITE}/gpapprove?t=${encodeURIComponent(token)}`;

    const text =
      "🟢 <b>New signals request</b>\n\n" +
      "👤 " + (cleanName || "—") + "\n" +
      "📧 " + cleanEmail + "\n" +
      (phone ? "📱 " + String(phone).trim() + "\n" : "") +
      (experience ? "🎯 " + String(experience).trim() + "\n" : "") +
      "\nCheck this email is a real signup under your LivvFX link, then tap Approve to send them a one-time invite.\n\n" +
      '<a href="' + approveUrl + '">✅ Approve &amp; send invite</a>';

    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      text,
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
