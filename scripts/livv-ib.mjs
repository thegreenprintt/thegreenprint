// Livv IB reader — runs hourly in GitHub Actions. Logs into members.livvglobal.com
// (cookie session, server-rendered — no API), reads the IB dashboard, and posts a
// commission-based broker snapshot to /track (?kind=broker).
//
// Secrets: LIVV_EMAIL, LIVV_PASSWORD, GP_ADMIN_KEY.  Optional env: SITE, DEBUG=1.
// Logs field names + digit counts only (DEBUG also logs whether each field parsed),
// never the dollar amounts.

import { chromium } from "playwright";

const EMAIL = (process.env.LIVV_EMAIL || "").trim();
const PASSWORD = (process.env.LIVV_PASSWORD || "").trim();
const ADMIN_KEY = (process.env.GP_ADMIN_KEY || "").trim();
const SITE = (process.env.SITE || "https://thegreenprint.trade").replace(/\/$/, "");
const DEBUG = String(process.env.DEBUG || "") === "1";
const BASE = "https://members.livvglobal.com";
const log = (...a) => console.log("[livv-ib]", ...a);
const digits = (n) => (n == null ? "null" : String(Math.floor(Math.abs(Number(n) || 0))).length + "d");

async function main() {
  if (!EMAIL || !PASSWORD || !ADMIN_KEY) { log("secrets not set yet (LIVV_EMAIL / LIVV_PASSWORD / GP_ADMIN_KEY) — skipping."); return; }

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newContext().then((c) => c.newPage());
  let snap = null;
  let clients = [];
  try {
    // 1) login
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const emailBox = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const passBox = page.locator('input[type="password"], input[name*="pass" i], input[placeholder*="password" i]').first();
    if (await emailBox.count() && await passBox.count()) {
      await emailBox.fill(EMAIL).catch(() => {});
      await passBox.fill(PASSWORD).catch(() => {});
      const submit = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login"), button:has-text("Sign In")').first();
      if (await submit.count()) await submit.click({ timeout: 8000 }).catch(() => {}); else await passBox.press("Enter").catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    }
    log("logged in; url " + page.url());

    // 2) IB dashboard
    await page.goto(BASE + "/client/ib/ibdashboard", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForSelector("#spinner", { state: "hidden", timeout: 20000 }).catch(() => {});
    await page.waitForSelector("text=Monthly Commission", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 3) extract
    snap = await page.evaluate(() => {
      const num = (s) => { if (s == null) return null; const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
      const norm = (t) => (t || "").replace(/\s+/g, " ").trim().toLowerCase();
      const numIn = (s, label) => { if (!s) return null; const m = String(s).replace(new RegExp(label, "i"), " ").replace(/,/g, "").match(/-?\$?\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
      // DOM read: leaf element matching the label, then its siblings/ancestors for a number.
      const readDom = (label) => {
        const els = Array.from(document.querySelectorAll("div,span,p,h1,h2,h3,h4,h5,h6,td,strong,b,small,label,a"));
        const leaf = els.find((e) => e.children.length === 0 && (norm(e.textContent) === label.toLowerCase() || norm(e.textContent).startsWith(label.toLowerCase() + " ")));
        if (!leaf) return null;
        for (const sib of [leaf.nextElementSibling, leaf.previousElementSibling]) { const v = numIn(sib && sib.textContent, label); if (v != null) return v; }
        let node = leaf;
        for (let i = 0; i < 4 && node.parentElement; i++) { node = node.parentElement; const v = numIn(node.textContent, label); if (v != null) return v; }
        return null;
      };
      // Text fallback: find the label line, take a number from the next couple of lines.
      const lines = (document.body ? document.body.innerText : "").split("\n").map((s) => s.trim()).filter(Boolean);
      const readLine = (label) => {
        const i = lines.findIndex((l) => norm(l) === label.toLowerCase());
        if (i < 0) return null;
        for (let j = i + 1; j <= i + 2 && j < lines.length; j++) { const m = lines[j].replace(/,/g, "").match(/^-?\$?\s*(\d+(?:\.\d+)?)$/); if (m) return Number(m[1]); }
        return null;
      };
      const read = (label) => { const a = readDom(label); return a != null ? a : readLine(label); };
      const subIBs = [];
      const table = document.querySelector("#topsubibearn");
      if (table) {
        table.querySelectorAll("tbody tr").forEach((tr) => {
          const td = tr.querySelectorAll("td");
          if (td.length >= 4) subIBs.push({ name: (td[1].textContent || "").trim(), email: (td[2].textContent || "").trim().toLowerCase(), commission: num(td[3].textContent) || 0 });
        });
      }
      return {
        monthlyCommission: read("Monthly Commission"),
        withdrawnCommission: read("Withdraw Commission"),
        availableCommission: read("Available Commission"),
        clientTransaction: read("My Client Transaction"),
        totalClients: read("Total Clients"),
        payPerLot: read("My Pay per Lot"),
        activeTraders: read("Active Traders & Sub IB"),
        ftd: read("FTD"),
        subIBs,
      };
    });

    // 3b) client roster — everyone under Jay, with balance (funding) + volume.
    await page.goto(BASE + "/client/ib/myclientslist", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForSelector("#spinner", { state: "hidden", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(4000); // datatables load async
    clients = await page.evaluate(() => {
      const parseNum = (s) => { if (s == null) return null; const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
      const out = [];
      for (let lvl = 1; lvl <= 7; lvl++) {
        const table = document.querySelector("#level" + lvl + "listing");
        if (!table) continue;
        const heads = Array.from(table.querySelectorAll("thead th")).map((h) => (h.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
        const col = (want) => heads.findIndex((h) => h === want);
        const colInc = (want) => heads.findIndex((h) => h.includes(want));
        const iName = colInc("name"), iEmail = colInc("email"), iPhone = colInc("phone"), iTid = colInc("trading"),
          iBal = col("balance"), iVol = colInc("volume"), iComm = colInc("commission"), iIb = colInc("ib name");
        // Prefer the DataTables API so we get ALL pages, not just the visible 10.
        let rows = [];
        try {
          const w = window;
          if (w.jQuery && w.jQuery.fn && w.jQuery.fn.dataTable && w.jQuery.fn.dataTable.isDataTable(table)) {
            w.jQuery(table).DataTable().rows().every(function () { rows.push(this.node()); });
          }
        } catch (e) {}
        if (!rows.length) rows = Array.from(table.querySelectorAll("tbody tr"));
        for (const tr of rows) {
          const td = tr.querySelectorAll("td");
          if (td.length < 5) continue;
          const cell = (i) => (i >= 0 && td[i] ? (td[i].textContent || "").replace(/\s+/g, " ").trim() : "");
          const name = cell(iName);
          if (!name || /no data/i.test(name)) continue;
          out.push({
            name, email: cell(iEmail).toLowerCase(), phone: cell(iPhone), tradingId: cell(iTid),
            balance: parseNum(cell(iBal)), volume: parseNum(cell(iVol)), commission: parseNum(cell(iComm)),
            ibName: cell(iIb), level: lvl,
          });
        }
      }
      return out;
    }).catch(() => []);
  } finally {
    await browser.close().catch(() => {});
  }

  const fundedCount = clients.filter((c) => (c.balance || 0) > 0).length;
  const tradingCount = clients.filter((c) => (c.volume || 0) > 0).length;
  log("extracted: available=" + digits(snap && snap.availableCommission) + " monthly=" + digits(snap && snap.monthlyCommission) +
    " withdrawn=" + digits(snap && snap.withdrawnCommission) + " totalClients=" + (snap && snap.totalClients) +
    " payPerLot=" + digits(snap && snap.payPerLot) + " subIBs=" + (snap && snap.subIBs ? snap.subIBs.length : 0) +
    " | roster=" + clients.length + " funded=" + fundedCount + " trading=" + tradingCount);

  if (!snap || (snap.availableCommission == null && snap.monthlyCommission == null && !clients.length)) {
    throw new Error("livv_parse_empty");
  }

  // 4) post the broker snapshot (commission summary + full client roster)
  const sum = (f) => clients.reduce((a, c) => a + (Number(c[f]) || 0), 0);
  const broker = {
    name: "Livv Global",
    model: "commission",
    totals: {
      monthlyCommission: snap.monthlyCommission, availableCommission: snap.availableCommission,
      withdrawnCommission: snap.withdrawnCommission, clientTransaction: snap.clientTransaction,
      totalClients: snap.totalClients != null ? snap.totalClients : (clients.length || null),
      activeTraders: snap.activeTraders, ftd: snap.ftd, payPerLot: snap.payPerLot,
      roster: clients.length, funded: fundedCount, unfunded: clients.length - fundedCount,
      trading: tradingCount, totalBalance: Math.round(sum("balance") * 100) / 100, totalVolume: Math.round(sum("volume") * 100) / 100,
    },
    subIBs: snap.subIBs || [],
    clients: clients,
  };
  const pr = await fetch(SITE + "/api/chat?kind=broker", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: ADMIN_KEY, source: "livv-hourly", broker }),
  });
  const pj = await pr.json().catch(() => null);
  log("posted to /track: status " + pr.status + " ok=" + !!(pj && pj.ok));
  if (!pj || !pj.ok) throw new Error("post_failed:" + pr.status + ":" + (pj && pj.error));
  log("done — Livv broker snapshot updated on /track");
}

main().catch((e) => { console.error("[livv-ib] ERROR:", String((e && e.message) || e)); process.exit(1); });
