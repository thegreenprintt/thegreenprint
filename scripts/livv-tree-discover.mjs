// Probe Livv Tree Chart for the COMPLETE downline with commission (incl. sub-IBs
// who aren't trading clients, like Devin). Logs structure only. Optional CHECK=
// "devin=2200" reports which quantity matches (booleans only).
import { chromium } from "playwright";

const EMAIL = (process.env.LIVV_EMAIL || "").trim();
const PASSWORD = (process.env.LIVV_PASSWORD || "").trim();
const BASE = "https://members.livvglobal.com";
const log = (...a) => console.log("[tree]", ...a);
const mask = (s) => (s || "").replace(/\s+/g, " ").replace(/[\d][\d,]*\.?\d*/g, "#").replace(/[\w.+-]+@[\w.-]+/g, "x@x").slice(0, 200);

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const e = page.locator('input[type="email"], input[name*="email" i]').first();
  const p = page.locator('input[type="password"], input[name*="pass" i]').first();
  if (await e.count() && await p.count()) {
    await e.fill(EMAIL).catch(() => {}); await p.fill(PASSWORD).catch(() => {});
    const s = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login")').first();
    if (await s.count()) await s.click({ timeout: 8000 }).catch(() => {}); else await p.press("Enter").catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) { log("missing creds"); return; }
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newContext().then((c) => c.newPage());
  const apis = [];
  page.on("response", async (resp) => {
    try {
      const ct = resp.headers()["content-type"] || ""; if (ct.indexOf("json") < 0) return;
      const u = resp.url(); let host = ""; try { host = new URL(u).host; } catch (e) {}
      const path = u.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
      let keys = [], len = null; try { const j = await resp.json(); if (Array.isArray(j)) { len = j.length; keys = j[0] ? Object.keys(j[0]) : []; } else if (j && typeof j === "object") { keys = Object.keys(j); if (Array.isArray(j.data)) { len = j.data.length; if (j.data[0]) keys = keys.concat("data[]:" + Object.keys(j.data[0]).join(",")); } } } catch (e) {}
      apis.push({ host, path, status: resp.status(), len, keys: keys.slice(0, 20) });
    } catch (e) {}
  });
  try {
    await login(page);
    await page.goto(BASE + "/client/ib/treechart", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForSelector("#spinner", { state: "hidden", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(6000);
    log("url " + page.url());

    // tables
    const tables = await page.evaluate(() => Array.from(document.querySelectorAll("table")).map((t) => ({ id: t.id, headers: Array.from(t.querySelectorAll("thead th")).map((h) => (h.textContent || "").trim()), rows: t.querySelectorAll("tbody tr").length, first: (t.querySelector("tbody tr") || {}).textContent || "" })));
    for (const t of tables) log("table#" + t.id + " rows=" + t.rows + " headers=" + JSON.stringify(t.headers) + " first=" + mask(t.first));

    // JSON APIs seen
    log("JSON APIs:");
    const seen = new Set();
    for (const a of apis) { const k = a.host + a.path; if (seen.has(k)) continue; seen.add(k); log("  " + a.status + " " + a.host + a.path + " len=" + a.len + " keys=" + JSON.stringify(a.keys)); }

    // global JS data that looks like a tree (name/commission/parent)
    const globals = await page.evaluate(() => {
      const out = [];
      for (const k of Object.keys(window)) {
        try { const v = window[k]; if (Array.isArray(v) && v.length > 2 && v[0] && typeof v[0] === "object") { const ks = Object.keys(v[0]).join(","); if (/name|commission|parent|lot|email/i.test(ks)) out.push(k + ": array[" + v.length + "] keys=" + ks); } } catch (e) {}
      }
      return out.slice(0, 20);
    });
    log("tree-like globals: " + JSON.stringify(globals));

    // CHECK against a known person
    if (process.env.CHECK && process.env.CHECK.indexOf("=") > 0) {
      const [nm, amt] = process.env.CHECK.split("=");
      const found = await page.evaluate((needle) => {
        const t = (document.body ? document.body.innerText : "").toLowerCase();
        return t.indexOf(needle.toLowerCase()) >= 0;
      }, (nm || "").trim());
      log("CHECK: '" + nm.trim() + "' appears on tree page text = " + found);
    }
  } finally { await browser.close().catch(() => {}); }
}
main().catch((e) => { console.error("[tree] ERROR:", String((e && e.message) || e)); process.exit(1); });
