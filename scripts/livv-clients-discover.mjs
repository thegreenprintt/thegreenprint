// Livv clients discovery — map the "My Clients" / team pages so the roster (everyone
// under Jay, with volume) can be pulled. Also GET the stored broker snapshot to debug
// the empty tab. Logs structure only (headers, masked rows, link text), no values.
import { chromium } from "playwright";

const EMAIL = (process.env.LIVV_EMAIL || "").trim();
const PASSWORD = (process.env.LIVV_PASSWORD || "").trim();
const ADMIN_KEY = (process.env.GP_ADMIN_KEY || "").trim();
const SITE = (process.env.SITE || "https://thegreenprint.trade").replace(/\/$/, "");
const BASE = "https://members.livvglobal.com";
const log = (...a) => console.log("[livv-cl]", ...a);
const maskRow = (s) => (s || "").replace(/\s+/g, " ").replace(/[\d][\d,]*\.?\d*/g, "#").replace(/[\w.+-]+@[\w.-]+/g, "x@x").slice(0, 160);

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const e = page.locator('input[type="email"], input[name*="email" i]').first();
  const p = page.locator('input[type="password"], input[name*="pass" i]').first();
  if (await e.count() && await p.count()) {
    await e.fill(EMAIL).catch(() => {});
    await p.fill(PASSWORD).catch(() => {});
    const s = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login")').first();
    if (await s.count()) await s.click({ timeout: 8000 }).catch(() => {}); else await p.press("Enter").catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  }
}

async function dumpTables(page, where) {
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table")).map((t) => ({
      id: t.id || "", cls: (t.className || "").slice(0, 40),
      headers: Array.from(t.querySelectorAll("thead th, thead td")).map((h) => (h.textContent || "").trim()).slice(0, 15),
      rows: t.querySelectorAll("tbody tr").length,
      first: t.querySelector("tbody tr") ? (t.querySelector("tbody tr").textContent || "") : "",
    }));
  }).catch(() => []);
  log(where + " — tables: " + tables.length);
  for (const t of tables) log("   table#" + t.id + " [" + t.cls + "] rows=" + t.rows + " headers=" + JSON.stringify(t.headers) + " firstRow=" + maskRow(t.first));
}

async function main() {
  if (!EMAIL || !PASSWORD) { log("missing creds"); return; }
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newContext().then((c) => c.newPage());
  try {
    await login(page);
    log("logged in; url " + page.url());
    await page.goto(BASE + "/client/ib/ibdashboard", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForSelector("#spinner", { state: "hidden", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // IB-section links (to find My Clients / Tree / Team reports URLs)
    const links = await page.evaluate(() => {
      const seen = {};
      Array.from(document.querySelectorAll("a[href]")).forEach((a) => {
        const txt = (a.textContent || "").replace(/\s+/g, " ").trim();
        const href = a.getAttribute("href") || "";
        if (txt && href && /ib|client|team|commission|tree/i.test(href + " " + txt) && txt.length < 40) seen[href] = txt;
      });
      return Object.entries(seen).map(([h, t]) => t + " -> " + h).slice(0, 40);
    }).catch(() => []);
    log("IB-related links:");
    for (const l of links) log("   " + l);

    await dumpTables(page, "ibdashboard");

    // The real roster pages (from the sidebar links above)
    const candidates = ["/client/ib/myclientslist", "/client/ib/myteamdepositreport", "/client/ib/mycommissionlist", "/client/ib/treechart", "/client/ib/myteamwithdrawreport"];
    for (const c of candidates) {
      await page.goto(BASE + c, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.waitForSelector("#spinner", { state: "hidden", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(4000); // datatables load rows async
      const title = await page.title().catch(() => "");
      log("tried " + c + " -> title='" + title + "'");
      await dumpTables(page, c);
    }

    // Diagnose the stored snapshot the tab reads
    if (ADMIN_KEY) {
      try {
        const r = await fetch(SITE + "/api/chat?kind=broker&key=" + encodeURIComponent(ADMIN_KEY));
        const j = await r.json().catch(() => null);
        const b = j && j.broker;
        log("stored broker snapshot: " + (b ? ("model=" + b.model + " subIBs=" + (b.subIBs ? b.subIBs.length : 0) + " totalsKeys=" + JSON.stringify(Object.keys(b.totals || {})) + " nonNullTotals=" + JSON.stringify(Object.entries(b.totals || {}).filter(([k, v]) => v != null).map(([k]) => k))) : "null"));
      } catch (e) { log("broker GET err " + (e && e.message)); }
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
main().catch((e) => { console.error("[livv-cl] ERROR:", String((e && e.message) || e)); process.exit(1); });
