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
      // read a labeled card: find the leaf element whose text is the label, climb up
      // to the container that also holds a number, return that number.
      const read = (label) => {
        const els = Array.from(document.querySelectorAll("div,span,p,h1,h2,h3,h4,h5,h6,td,strong,b,small,label"));
        const norm = (t) => (t || "").replace(/\s+/g, " ").trim().toLowerCase();
        const leaf = els.find((e) => e.children.length === 0 && norm(e.textContent) === label.toLowerCase());
        if (!leaf) return null;
        let node = leaf;
        for (let i = 0; i < 4 && node.parentElement; i++) {
          node = node.parentElement;
          const txt = (node.textContent || "").replace(new RegExp(label, "i"), " ");
          const m = txt.replace(/,/g, "").match(/-?\$?\s*(\d+(?:\.\d+)?)/);
          if (m) return Number(m[1]);
        }
        return null;
      };
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
  } finally {
    await browser.close().catch(() => {});
  }

  log("extracted: monthlyComm=" + digits(snap && snap.monthlyCommission) + " available=" + digits(snap && snap.availableCommission) +
    " withdrawn=" + digits(snap && snap.withdrawnCommission) + " clientTxn=" + digits(snap && snap.clientTransaction) +
    " totalClients=" + (snap && snap.totalClients) + " payPerLot=" + digits(snap && snap.payPerLot) +
    " activeTraders=" + (snap && snap.activeTraders) + " ftd=" + (snap && snap.ftd) + " subIBs=" + (snap && snap.subIBs ? snap.subIBs.length : 0));

  if (!snap || (snap.availableCommission == null && snap.monthlyCommission == null && (!snap.subIBs || !snap.subIBs.length))) {
    throw new Error("livv_dashboard_parse_empty");
  }

  // 4) post the broker snapshot
  const broker = {
    name: "Livv Global",
    model: "commission",
    totals: {
      monthlyCommission: snap.monthlyCommission, availableCommission: snap.availableCommission,
      withdrawnCommission: snap.withdrawnCommission, clientTransaction: snap.clientTransaction,
      totalClients: snap.totalClients, activeTraders: snap.activeTraders, ftd: snap.ftd, payPerLot: snap.payPerLot,
    },
    subIBs: snap.subIBs || [],
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
