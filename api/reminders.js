// The Greenprint — live reminders (Vercel serverless function)
// Path in repo: api/reminders.js  ->  https://thegreenprint.trade/api/reminders
// Pinged every 5 min by a cron-job.org job. Windows are exactly 5 min wide so
// a reliable 5-min ping fires each reminder once (no misses, no duplicates).
// Each call checks today's
// One House lineup and posts a "1 HOUR OUT" heads-up and a "LIVE NOW" shout
// for the trading calls + featured calls (The Heist, Bryce's Exec Call,
// Jay's Wednesday LIVE). Posts to The Greenprint Chat (not pinned).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = "-1003849673824";

async function tg(method, body) {
  const r = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

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
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// e = [ET time, category, title, host, featured?, emphasize?]
const SCHED = {
  Sun: [
    ["3:00 PM","Exec Call","Exec Call — Bryce Thompson (CEO)","Bryce Thompson",true,true],
    ["11:00 AM","E-Commerce","Patty Perches Live","Patty Perches"],
    ["5:30 PM","Finance","From Side Hustle to Real Business","Jamiu Oladimeji"],
    ["6:00 PM","Education","Carl Wesley Live","Carl Wesley"],
    ["7:00 PM","Cryptocurrency","Stephanie Jeudy Live","Steph Rozay"],
    ["10:00 PM","Finance","Naomi Brown Live","Naomi Brown"],
  ],
  Mon: [
    ["9:00 AM","Business Mastery","The Heist","Koliah Licon & Joshua Stewart"],
    ["11:00 AM","E-Commerce","Christianna Hurt Live","Christianna Hurt"],
    ["1:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
    ["5:00 PM","Health & Fitness","Champ Glory","Champ Glory"],
    ["6:00 PM","Finance","Angie Toney Live","Angie Toney"],
    ["6:45 PM","Daytrading","Hoop Session","De'el Woods",false,true],
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
    ["7:00 PM","Daytrading","Day Trading Basics","Arin Long",false,true],
    ["8:00 PM","Daytrading","Bryan McElderry","Bryan McElderry"],
    ["8:00 PM","Social Media","Kimberly Christy Live","Kimberly Christy"],
    ["9:00 PM","Daytrading","Leo Diaz Live","Leo Diaz"],
    ["9:00 PM","Business Mastery","Nathan Samuel Live","Nathan Samuel"],
    ["9:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Daytrading","Market Bully Strategy","Richard Hall aka Pops",false,true],
  ],
  Wed: [
    ["9:00 AM","Daytrading","The Greenprint LIVE","Jay",true],
    ["8:00 AM","Daytrading","Luc Longmire Live","Luc Longmire"],
    ["9:00 AM","Daytrading","GOLDMINED LIVE","Khai Lashley"],
    ["11:00 AM","Daytrading","Mario Portilla","Mario Portilla"],
    ["1:00 PM","Daytrading","Market Bully Strategy","Richard Hall aka Pops",false,true],
    ["3:00 PM","Sports Education","Ken Smith Live","Ken Smith"],
    ["6:00 PM","Business","CEO ME","JC Morales"],
    ["6:45 PM","Daytrading","Hoop Session","De'el Woods",false,true],
    ["7:00 PM","Futures","Katherin Tufano Live","Katherin Tufano"],
    ["8:00 PM","Daytrading","Day Trading Basics","Arin Long",false,true],
    ["8:00 PM","Cryptocurrency","Corey Williams Live","Corey Williams"],
    ["8:30 PM","Credit","Nainoa Shin","Nainoa Shin"],
    ["9:00 PM","Daytrading","Leo Diaz Live","Leo Diaz"],
    ["10:00 PM","Finance","Naomi Brown Live","Naomi Brown"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Daytrading","Get the Bag","Richard Hall aka Pops",false,true],
    ["11:00 PM","Sales & Marketing","Marquis Jenkins","Marquis Jenkins"],
  ],
  Thu: [
    ["2:00 AM","Daytrading","Jimmy El Andre","Jimmy El Andre"],
    ["7:00 AM","Daytrading","GOLDMINED LIVE","Khai Lashley"],
    ["8:00 AM","Daytrading","Luc Longmire Live","Luc Longmire"],
    ["9:00 AM","Business Mastery","The Heist","Koliah Licon & Joshua Stewart"],
    ["1:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
    ["1:30 PM","Daytrading","TRU Live Trading Session","Table Runna Univ."],
    ["4:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
    ["7:00 PM","Education","Mike Wash","Mike Wash"],
    ["7:00 PM","Brand & Content","Demetrius Lewis","Demetrius Lewis"],
    ["8:00 PM","Business Mastery","Koliah Licon Live","Koliah Licon"],
    ["8:30 PM","Daytrading","Dr Bryan","Bryan McElderry"],
    ["9:00 PM","Business Mastery","Nathan Samuel Live","Nathan Samuel"],
    ["10:00 PM","Daytrading","Edwins Vargas","Edwins Vargas"],
    ["11:00 PM","Daytrading","Market Bully Strategy","Richard Hall aka Pops",false,true],
    ["11:00 PM","Daytrading","Table Runna Univ.","Table Runna Univ."],
  ],
  Fri: [
    ["12:00 AM","Daytrading","TRU Live Streamathon","Table Runna Univ."],
    ["9:00 AM","Business Mastery","The Heist","Koliah Licon & Joshua Stewart"],
    ["5:00 PM","Health & Fitness","Champ Glory","Champ Glory"],
    ["7:00 PM","Finance","Jamiu Oladimeji Live","Jamiu Oladimeji"],
  ],
  Sat: [
    ["9:00 PM","Education","Khaki Donoso Live","Khaki Donoso"],
  ],
};

const TRADING = ["Daytrading", "Futures"];
function qualifies(x) { return x.feat || TRADING.indexOf(x.c) > -1 || x.title === "The Heist"; }

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.key !== "gpsched") { res.status(401).send("nope"); return; }
  try {
    const now = new Date();
    let dayKey = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Chicago" }).format(now);
    if (q.day) dayKey = q.day;

    let items = (SCHED[dayKey] || []).map(a => ({ t: a[0], c: a[1], title: a[2], host: a[3], feat: a[4] || false, e: a[5] || false })).filter(qualifies);
    const seen = new Set();
    items = items.filter(x => { const k = x.t + "|" + x.title; if (seen.has(k)) return false; seen.add(k); return true; });

    const out = [];
    for (const x of items) {
      const inst = etInstant(x.t); if (!inst) continue;
      let mins = (inst.getTime() - now.getTime()) / 60000;
      if (q.force !== undefined) mins = Number(q.force);

      const isExec = x.title.indexOf("Exec Call") > -1;
      const nameLine = isExec ? "<b>" + esc(x.title) + "</b>" : "<b>" + esc(x.title) + "</b> with <i>" + esc(x.host) + "</i>";
      const banner = isExec ? "⭐ <b>FEATURED — EXEC CALL</b>\n" : "⭐ <b>FEATURED CALL</b>\n";
      const closeHour = isExec ? "Biggest call of the week — live on 1house.tv" : "Don't miss this one — live on 1house.tv";

      let msg = null;
      if (mins >= 55 && mins < 60) {
        if (x.e) {
          msg = banner + "⏰ <b>1 HOUR OUT</b>\n" + nameLine + "\n🕒 " + zones(x.t) + "\n\n" + closeHour;
        } else {
          msg = "⏰ <b>1 HOUR OUT</b>\n" + nameLine + "\n🕒 " + zones(x.t) + "\n\nGet ready — live on 1house.tv";
        }
      } else if (mins >= 0 && mins < 5) {
        if (x.e) {
          msg = banner + "🔴 <b>LIVE NOW</b>\n" + nameLine + " is streaming!\n\nTap in now — live on 1house.tv";
        } else {
          msg = "🔴 <b>LIVE NOW</b>\n" + nameLine + " is streaming!\n\nTap in — live on 1house.tv";
        }
      }
      if (!msg) continue;
      if (q.dry) { out.push(msg); continue; }
      const r = await tg("sendMessage", { chat_id: CHAT, text: msg, parse_mode: "HTML", disable_web_page_preview: true });
      if (r && r.ok) out.push(x.title);
    }
    res.status(200).json({ ok: true, day: dayKey, dry: !!q.dry, count: out.length, out: out });
  } catch (e) {
    res.status(200).json({ ok: false, err: String(e) });
  }
};
