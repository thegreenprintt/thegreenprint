// Livv IB discovery — runs once in GitHub Actions to map the IB dashboard's data.
// Logs into members.livvglobal.com, opens the IB dashboard, and reports the API
// calls it makes (URL + response key STRUCTURE, not values), where the auth token
// lives, and the dashboard's text LABELS — so the real hourly reader can be built.
//
// Secrets: LIVV_EMAIL, LIVV_PASSWORD.  Logs structure only, not financial values.

import { chromium } from "playwright";

const EMAIL = (process.env.LIVV_EMAIL || "").trim();
const PASSWORD = (process.env.LIVV_PASSWORD || "").trim();
const HOST = "members.livvglobal.com";
const BASE = "https://" + HOST;
const log = (...a) => console.log("[livv]", ...a);

// Describe a value's shape without leaking the value.
function shape(v, depth = 0) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array[" + v.length + "]" + (v.length && depth < 2 ? "<" + shape(v[0], depth + 1) + ">" : "");
  const t = typeof v;
  if (t === "object") { const keys = Object.keys(v).slice(0, 30); return "{" + keys.join(",") + "}"; }
  if (t === "number") return "num";
  if (t === "string") return /^\d[\d,.\s$]*$/.test(v) ? "numstr" : "str";
  return t;
}

async function main() {
  if (!EMAIL || !PASSWORD) { log("missing LIVV_EMAIL / LIVV_PASSWORD secrets — add them and re-run."); return; }

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const apis = [];
  page.on("response", async (resp) => {
    try {
      const url = resp.url();
      const ct = (resp.headers()["content-type"] || "");
      if (ct.indexOf("application/json") < 0) return; // any host, JSON only
      let host = ""; try { host = new URL(url).host; } catch (e) {}
      const path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
      let topKeys = [], dataShape = "";
      try { const j = await resp.json(); topKeys = (j && typeof j === "object" && !Array.isArray(j)) ? Object.keys(j).slice(0, 30) : (Array.isArray(j) ? ["<array[" + j.length + "]>"] : []); if (j && j.data !== undefined) dataShape = shape(j.data); } catch (e) {}
      apis.push({ host, path, status: resp.status(), topKeys, dataShape });
    } catch (e) {}
  });

  try {
    log("opening login…");
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const emailBox = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const passBox = page.locator('input[type="password"], input[name*="pass" i], input[placeholder*="password" i]').first();
    if (await emailBox.count() && await passBox.count()) {
      await emailBox.fill(EMAIL).catch(() => {});
      await passBox.fill(PASSWORD).catch(() => {});
      const submit = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Login"), button:has-text("Sign In"), button:has-text("Sign in")').first();
      if (await submit.count()) await submit.click({ timeout: 8000 }).catch(() => {}); else await passBox.press("Enter").catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      log("submitted login; url now " + page.url());
    } else {
      log("no login form found at " + page.url() + " (maybe already authed or different layout)");
    }

    // token location
    const storage = await page.evaluate(() => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const v = String(localStorage.getItem(k) || ""); o[k] = v.length > 40 ? "<len " + v.length + ">" : (/^\d/.test(v) ? "<numish>" : "<str len " + v.length + ">"); } } catch (e) {} return o; });
    log("localStorage keys: " + JSON.stringify(storage));

    log("opening IB dashboard…");
    await page.goto(BASE + "/client/ib/ibdashboard", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(6000); // let XHRs fire

    // page structure: label lines (text with big numbers blanked so values don't leak)
    const labels = await page.evaluate(() => {
      const t = document.body ? document.body.innerText : "";
      return t.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/[\d][\d,]*\.?\d*/g, "#").slice(0, 60)).slice(0, 80);
    });
    log("dashboard url: " + page.url());
    log("dashboard labels (values masked as #):");
    for (const l of labels) console.log("   " + l);

    log("API calls seen (any host, JSON):");
    const seen = new Set();
    for (const a of apis) { const key = a.host + a.path + ":" + a.status; if (seen.has(key)) continue; seen.add(key); console.log("   " + a.status + " " + a.host + a.path + "  top=" + JSON.stringify(a.topKeys) + (a.dataShape ? "  data=" + a.dataShape : "")); }
    if (!apis.length) log("   (no JSON API calls captured — server-rendered)");

    // Wait for the loading spinner to go away and the cards to actually render.
    await page.waitForSelector("#spinner", { state: "hidden", timeout: 20000 }).catch(() => {});
    await page.waitForSelector("text=Monthly Commission", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Grab the card-grid HTML (anchored on a known label, climb to the container),
    // masked so structure (tags/classes) is visible but values/emails are not.
    const mask = (h) => h.replace(/>\s*\$?\s*[\d][\d,]*\.?\d*\s*</g, ">#<").replace(/[\w.+-]+@[\w.-]+/g, "x@x").replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>").replace(/\s+/g, " ").slice(0, 9000);
    const cards = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("body *"));
      const lbl = all.find((e) => e.children.length === 0 && /Monthly Commission/i.test(e.textContent || ""));
      let node = lbl; for (let i = 0; i < 6 && node && node.parentElement; i++) node = node.parentElement;
      return node ? node.outerHTML : "(anchor not found)";
    }).catch((e) => "(err " + (e && e.message) + ")");
    log("card-grid DOM (masked):");
    console.log(mask(cards));

    // Grab the sub-IB table HTML too.
    const table = await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll("table")).find((x) => /commission earned/i.test(x.textContent || ""));
      return t ? t.outerHTML : "(no table)";
    }).catch(() => "(err)");
    log("sub-IB table DOM (masked):");
    console.log(mask(table));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((e) => { console.error("[livv] ERROR:", String((e && e.message) || e)); process.exit(1); });
