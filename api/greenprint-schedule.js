// The Greenprint — daily schedule poster (Vercel serverless function)
// Path in repo: api/greenprint-schedule.js  ->  https://thegreenprint.trade/api/greenprint-schedule
// Fired once a day by the Vercel cron in vercel.json (6:00 AM Central).
// Posts today's One House lineup to The Greenprint Chat and pins it,
// replacing the previous day's schedule pin. Day-trading streams up top.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = "-1003849673824"; // The Greenprint Chat (supergroup)

async function tg(method, body) {
  const r = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// times below are stored in Eastern (as listed on 1house.tv); shown in CT/ET/PT/HT
function parseET(t) {
  const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12; if (/PM/i.test(m[3])) h += 12;
  return { h: h, mi: Number(m[2]) };
}
function tzOffMin(instant, tz) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(instant).reduce((a, x) => (a[x.type] = x.value, a), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - instant.getTime()) / 60000;
}
function etInstant(t) {
  const p = parseET(t); if (!p) return null;
  const ny = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).reduce((a, x) => (a[x.type] = x.value, a), {});
  const y = +ny.year, mo = +ny.month - 1, d = +ny.day;
  let ts = Date.UTC(y, mo, d, p.h, p.mi);
  let off = tzOffMin(new Date(ts), "America/New_York");
  ts = Date.UTC(y, mo, d, p.h, p.mi) - off * 60000;
  const off2 = tzOffMin(new Date(ts), "America/New_York");
  if (off2 !== off) ts = Date.UTC(y, mo, d, p.h, p.mi) - off2 * 60000;
  return new Date(ts);
}
function fmtTz(inst, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(inst);
}
function zones(t) {
  const inst = etInstant(t); if (!inst) return t;
  return fmtTz(inst, "America/Chicago") + " CT · " + fmtTz(inst, "America/New_York") + " ET · " +
         fmtTz(inst, "America/Los_Angeles") + " PT · " + fmtTz(inst, "Pacific/Honolulu") + " HT";
}
function etMin(t) {
  const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12; if (/PM/i.test(m[3])) h += 12;
  return h * 60 + Number(m[2]);
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// e = [ET time, category, title, host, featured?]
const SCHED = {
  Sun: [
    ["11:00 AM","E-Commerce","Patty Perches Live","Patty Perches"],
    ["5:30 PM","Finance","From Side Hustle to Real Business","Jamiu Oladimeji"],
    ["6:00 PM","Education","Carl Wesley Live","Carl Wesley"],
    ["7:00 PM","Cryptocurrency","Stephanie Jeudy Live","Steph Rozay"],
    ["10:00 PM","Finance","Naomi Brown Live","Naomi Brown"],
  ],
  Mon: [
    ["9:00 AM","Business Mastery","The Heist","Joshua Stewart"],
    ["11:00 AM","E-Commerce","Christianna Hurt Live","Christianna Hurt"],
    ["1:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
    ["5:00 PM","Health & Fitness","Champ Glory","Champ Glory"],
    ["6:00 PM","Finance","Angie Toney Live","Angie Toney"],
    ["6:45 PM","Daytrading","De'el Woods Live","De'el Woods"],
    ["8:00 PM","Cryptocurrency","Corey Williams Live","Corey Williams"],
    ["8:30 PM","Credit","Nainoa Shin","Nainoa Shin"],
    ["9:00 PM","Daytrading","Dante Robinson","Dante Robinson"],
    ["9:00 PM","Daytrading","Leo Diaz Live","Leo Diaz"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["10:00 PM","Finance","Naomi Brown Live","Naomi Brown"],
  ],
  Tue: [
    ["7:00 AM","Daytrading","GOLDMINED LIVE","Khai Lashley"],
    ["8:00 AM","Daytrading","Luc Longmire Live","Luc Longmire"],
    ["1:30 PM","Daytrading","TRU Live Trading Session","Table Runna Univ."],
    ["2:00 PM","Daytrading","Jimmy El Andre","Jimmy El Andre"],
    ["2:00 PM","Finance","Raquel Sanchez","Raquel Sanchez"],
    ["5:30 PM","Culinary","Anthony Miller","Anthony Miller"],
    ["7:00 PM","Futures","Katherin Tufano Live","Katherin Tufano"],
    ["7:00 PM","Daytrading","Arin Long Live","Arin Long"],
    ["8:00 PM","Daytrading","Bryan McElderry","Bryan McElderry"],
    ["8:00 PM","Social Media","Kimberly Christy Live","Kimberly Christy"],
    ["9:00 PM","Daytrading","Leo Diaz Live","Leo Diaz"],
    ["9:00 PM","Business Mastery","Nathan Samuel Live","Nathan Samuel"],
    ["9:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Daytrading","Richard Hall Live","Richard Hall"],
  ],
  Wed: [
    ["9:00 AM","Daytrading","The Greenprint LIVE","Jay",true],
    ["8:00 AM","Daytrading","Luc Longmire Live","Luc Longmire"],
    ["9:00 AM","Daytrading","GOLDMINED LIVE","Khai Lashley"],
    ["11:00 AM","Daytrading","Mario Portilla","Mario Portilla"],
    ["1:00 PM","Daytrading","Richard Hall Live","Richard Hall"],
    ["3:00 PM","Sports Education","Ken Smith Live","Ken Smith"],
    ["6:00 PM","Business","CEO ME","JC Morales"],
    ["6:45 PM","Daytrading","De'el Woods Live","De'el Woods"],
    ["7:00 PM","Futures","Katherin Tufano Live","Katherin Tufano"],
    ["8:00 PM","Daytrading","Arin Long Live","Arin Long"],
    ["8:00 PM","Cryptocurrency","Corey Williams Live","Corey Williams"],
    ["8:30 PM","Credit","Nainoa Shin","Nainoa Shin"],
    ["9:00 PM","Daytrading","Leo Diaz Live","Leo Diaz"],
    ["10:00 PM","Finance","Naomi Brown Live","Naomi Brown"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Sales & Marketing","Marquis Jenkins","Marquis Jenkins"],
  ],
  Thu: [
    ["2:00 AM","Daytrading","Jimmy El Andre","Jimmy El Andre"],
    ["7:00 AM","Daytrading","GOLDMINED LIVE","Khai Lashley"],
    ["8:00 AM","Daytrading","Luc Longmire Live","Luc Longmire"],
    ["9:00 AM","Business Mastery","The Heist","Joshua Stewart"],
    ["1:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
    ["1:30 PM","Daytrading","TRU Live Trading Session","Table Runna Univ."],
    ["4:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
    ["7:00 PM","Education","Mike Wash","Mike Wash"],
    ["7:00 PM","Brand & Content","Demetrius Lewis","Demetrius Lewis"],
    ["8:00 PM","Business Mastery","Koliah Licon Live","Koliah Licon"],
    ["8:30 PM","Daytrading","Dr Bryan","Bryan McElderry"],
    ["9:00 PM","Business Mastery","Nathan Samuel Live","Nathan Samuel"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Daytrading","Richard Hall Live","Richard Hall"],
    ["11:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
  ],
  Fri: [
    ["12:00 AM","Daytrading","TRU Live Streamathon","Table Runna Univ."],
    ["9:00 AM","Business Mastery","The Heist","Joshua Stewart"],
    ["5:00 PM","Health & Fitness","Champ Glory","Champ Glory"],
    ["7:00 PM","Finance","Jamiu Oladimeji Live","Jamiu Oladimeji"],
  ],
  Sat: [
    ["9:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
  ],
};

const TRADING = ["Daytrading", "Futures"];

function build(dayKey, dateLabel) {
  let items = (SCHED[dayKey] || []).map(a => ({ t: a[0], c: a[1], title: a[2], host: a[3], feat: a[4] || false }));
  const seen = new Set();
  items = items.filter(x => { const k = x.t + "|" + x.title; if (seen.has(k)) return false; seen.add(k); return true; });

  const trading = items.filter(x => TRADING.includes(x.c)).sort((a, b) => (b.feat ? 1 : 0) - (a.feat ? 1 : 0) || etMin(a.t) - etMin(b.t));
  const other = items.filter(x => !TRADING.includes(x.c)).sort((a, b) => etMin(a.t) - etMin(b.t));

  const line = x => (x.feat ? "🟢 " : "🔸 ") + "<b>" + esc(x.title) + "</b>" + (x.host ? " — <i>" + esc(x.host) + "</i>" : "") + "\n" + zones(x.t) + "";

  let msg = "📅 <b>THE GREENPRINT SCHEDULE</b>\n" + esc(dateLabel) + "\n";
  msg += "————————————————\n";
  if (trading.length) msg += "\n🔥 <b>DAY TRADING — MAIN CARD</b>\n" + trading.map(line).join("\n") + "\n";
  if (other.length) msg += "\n📺 <b>ALSO STREAMING TODAY</b>\n" + other.map(line).join("\n") + "\n";
  if (!trading.length && !other.length) msg += "\nNo streams on the board today — rest up. 💤\n";
  msg += "\n————————————————\n▶️ Watch it all free at 1house.tv\n<i>Times shown in CT · ET · PT · HT</i>";
  return msg;
}

module.exports = async function handler(req, res) {
  const ua = String((req.headers && req.headers["user-agent"]) || "").toLowerCase();
  const key = req.query && req.query.key;
  if (!ua.includes("vercel-cron") && key !== "gpsched") { res.status(401).send("nope"); return; }

  try {
    const now = new Date();
    const dayKey = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Chicago" }).format(now);
    const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Chicago" }).format(now);
    const text = build(dayKey, dateLabel);

    try {
      const chat = await tg("getChat", { chat_id: CHAT });
      const pin = chat && chat.result && chat.result.pinned_message;
      if (pin && typeof pin.text === "string" && pin.text.indexOf("THE GREENPRINT SCHEDULE") > -1) {
        await tg("unpinChatMessage", { chat_id: CHAT, message_id: pin.message_id });
      }
    } catch (e) {}

    const sent = await tg("sendMessage", { chat_id: CHAT, text: text, parse_mode: "HTML", disable_web_page_preview: true });
    const mid = sent && sent.result && sent.result.message_id;
    let pinned = false;
    if (mid) { const p = await tg("pinChatMessage", { chat_id: CHAT, message_id: mid, disable_notification: true }); pinned = !!(p && p.ok); }

    res.status(200).json({ ok: !!(sent && sent.ok), day: dayKey, message_id: mid || null, pinned: pinned, tg: sent && sent.ok ? "sent" : (sent && sent.description) });
  } catch (e) {
    res.status(200).json({ ok: false, err: String(e) });
  }
};
