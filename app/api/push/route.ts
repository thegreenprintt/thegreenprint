import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import webpush from "web-push";

export const runtime = "nodejs";

// ── Web Push notifications ──────────────────────────────────────────────────
//   GET  /api/push                      -> { key } (VAPID public key for the client)
//   POST /api/push {action:"subscribe", subscription}  -> store a device subscription
//   POST /api/push {action:"send", key, title, body, url}  -> admin: push to everyone
//
// Env required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, REDIS_URL, GP_ADMIN_KEY

const SUBS_KEY = "gp:push:subs:v1";

let _redis: Redis | null = null;
function redis() {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || "", { maxRetriesPerRequest: 2, connectTimeout: 4000, lazyConnect: false });
    _redis.on("error", () => {});
  }
  return _redis;
}

function vapidReady(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try { webpush.setVapidDetails("mailto:support@thegreenprint.trade", pub, priv); return true; }
  catch { return false; }
}

// Internal; the scanner webhook fires a push by POSTing to this route instead.
async function sendPush(title: string, body: string, url: string): Promise<number> {
  if (!vapidReady()) return 0;
  const r = redis();
  let all: Record<string, string> = {};
  try { all = (await r.hgetall(SUBS_KEY)) || {}; } catch { return 0; }
  const payload = JSON.stringify({ title, body, url: url || "/app" });
  let sent = 0;
  await Promise.all(Object.keys(all).map(async (endpoint) => {
    let sub: unknown;
    try { sub = JSON.parse(all[endpoint]); } catch { return; }
    try { await webpush.sendNotification(sub as webpush.PushSubscription, payload); sent++; }
    catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) { try { await r.hdel(SUBS_KEY, endpoint); } catch {} }
    }
  }));
  return sent;
}

export async function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || "" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body.action || "");

  if (action === "subscribe") {
    const sub = body.subscription as { endpoint?: string } | undefined;
    if (!sub || !sub.endpoint) return NextResponse.json({ error: "bad_sub" }, { status: 400 });
    try { await redis().hset(SUBS_KEY, sub.endpoint, JSON.stringify(sub)); } catch {}
    return NextResponse.json({ ok: true });
  }

  if (action === "send") {
    if (!process.env.GP_ADMIN_KEY || String(body.key || "") !== process.env.GP_ADMIN_KEY) {
      return NextResponse.json({ error: "not_admin" }, { status: 403 });
    }
    const sent = await sendPush(String(body.title || "The Greenprint"), String(body.body || ""), String(body.url || "/app"));
    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
