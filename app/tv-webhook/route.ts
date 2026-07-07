import { NextRequest, NextResponse } from "next/server";

// ── TradingView alert webhook → Telegram broadcast (Telegram ONLY) ──
// Calls are posted to the Telegram channel and are NOT displayed on the
// website or stored anywhere.
//
// TradingView setup: ONE alert per chart (Gold, NAS100, US30), condition
// "The Greenprint v12.9" → "Any alert() function call", webhook URL:
//   https://thegreenprint.trade/tv-webhook?key=<TV_WEBHOOK_KEY>
//
// Events sent by the script (v12.9):
//   {"event":"early","side":"buy","symbol":"US100","price":29455.1}
//   {"event":"signal","side":"buy","symbol":"US100","price":29455.1,"sl":...,"tp1":...,...,"score":67}
//   {"event":"tp","level":2,"side":"buy","symbol":"US100","price":29601.3}
//   {"event":"sl","side":"buy","symbol":"US100","price":29431.2}
//
// Env vars required:
//   TV_WEBHOOK_KEY            — shared secret in the URL, rejects anything else
//   TELEGRAM_BOT_TOKEN        — bot token from @BotFather
//   TELEGRAM_SIGNALS_CHAT_ID  — chat ID of the channel the bot posts into

const TP_NAMES: Record<number, string> = {
  1: "Layup", 2: "Free Throw", 3: "3Pointer", 4: "Half Court", 5: "Full Court",
};

async function postToTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SIGNALS_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: "telegram env not set" };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return r.json();
}

export async function POST(req: NextRequest) {
  // 1. Auth — secret key in the URL
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.TV_WEBHOOK_KEY || key !== process.env.TV_WEBHOOK_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse the alert payload
  let j: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    try { j = JSON.parse(raw); } catch { j = { comment: raw.slice(0, 200) }; }
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const event = String(j.event || "");
  const side = String(j.side || "");
  const symbol = String(j.symbol || "");
  const price = String(j.price ?? "");
  const comment = String(j.comment || "");

  // 3. Only broadcast GOLD, NAS100 and US30 — every other symbol is ignored.
  const sym = symbol.toUpperCase();
  const isAllowed =
    sym.includes("XAU") || sym.includes("GOLD") ||                              // Gold
    sym.includes("NAS") || sym.includes("NDX") || sym.includes("US100") ||      // NAS100
    sym.includes("USTEC") || sym.includes("NQ") ||
    sym.includes("US30") || sym.includes("DOW") || sym.includes("DJI");         // US30
  if (!isAllowed) {
    return NextResponse.json({ ok: true, skipped: "symbol not in broadcast list" });
  }

  const isLong = side === "buy" || comment.includes("LONG");
  const dirWord = isLong ? "LONG" : "SHORT";
  const dirIcon = isLong ? "🟢" : "🔴";

  // 4. Build the Telegram message per event type
  let text: string;

  if (event === "early") {
    text =
      `⚡ <b>EARLY HEADS-UP — ${symbol}</b>\n` +
      `Possible <b>${dirWord}</b> forming @ ${price}\n` +
      `Waiting on candle-close confirmation — <i>not a confirmed call yet.</i>\n` +
      `Get to your charts. 👀`;
  } else if (event === "signal") {
    text =
      `${dirIcon} <b>GREENPRINT CALL — ${dirWord} ${symbol}</b>\n\n` +
      `🎯 Entry: <b>${j.price}</b>\n` +
      `🛑 SL: <b>${j.sl}</b>\n` +
      `1️⃣ TP1 Layup: <b>${j.tp1}</b>\n` +
      `2️⃣ TP2 Free Throw: <b>${j.tp2}</b>\n` +
      `3️⃣ TP3 3Pointer: <b>${j.tp3}</b>\n` +
      `4️⃣ TP4 Half Court: <b>${j.tp4}</b>\n` +
      `5️⃣ TP5 Full Court: <b>${j.tp5}</b>\n` +
      `📊 Confluence: <b>${j.score}/100</b>\n\n` +
      `⚠️ Educational only — not financial advice. Manage your risk.`;
  } else if (event === "tp") {
    const lvl = Number(j.level) || 0;
    const name = TP_NAMES[lvl] || "";
    text = lvl >= 5
      ? `🏆 <b>TP5 FULL COURT HIT — ${symbol} ${dirWord}</b> @ ${price}\nFULL SEND COMPLETE. 5R banked. 💰`
      : `✅ <b>TP${lvl} ${name} HIT — ${symbol} ${dirWord}</b> @ ${price}`;
  } else if (event === "sl") {
    text =
      `🛑 <b>STOP HIT — ${symbol} ${dirWord}</b> @ ${price}\n` +
      `Risk managed. On to the next one.`;
  } else {
    // Legacy alertcondition payloads (no "event" field)
    const isEarly = comment.includes("EARLY") || comment.includes("UNCONFIRMED");
    text = isEarly
      ? `⚡ <b>EARLY HEADS-UP — ${symbol}</b>\nPossible <b>${dirWord}</b> forming @ ${price}\n<i>Not a confirmed call yet.</i>`
      : `${dirIcon} <b>GREENPRINT CALL — ${dirWord} ${symbol}</b>\nEntry zone: <b>${price}</b>\nSL + TPs on the chart.\n⚠️ Educational only — not financial advice.`;
  }

  const tg = await postToTelegram(text);
  return NextResponse.json({ ok: true, telegram: tg?.ok ?? false });
}
