// One House "Lifetime Earnings" reader — runs hourly in GitHub Actions.
//
// The figure lives only on the rendered dashboard (the API doesn't expose it),
// so we load the dashboard in a real headless browser and read it. To avoid the
// brittle login FORM, we log in via the backend API (which works) to get a token,
// inject it into the page's localStorage the way the app stores it, then let the
// SPA hydrate and render. We then POST the number to /track via ?kind=track-goal.
//
// Secrets (GitHub repo → Settings → Secrets and variables → Actions):
//   ONE_HOUSE_EMAIL, ONE_HOUSE_PASSWORD, GP_ADMIN_KEY
// Optional env: EXPECT (verify against a known value, logs only a match boolean),
//   SITE (defaults to https://thegreenprint.trade).
//
// Logs steps + a digit count, never the raw amount.

import { chromium } from "playwright";

const EMAIL = process.env.ONE_HOUSE_EMAIL || "";
const PASSWORD = process.env.ONE_HOUSE_PASSWORD || "";
const ADMIN_KEY = process.env.GP_ADMIN_KEY || "";
const SITE = (process.env.SITE || "https://thegreenprint.trade").replace(/\/$/, "");
const EXPECT = process.env.EXPECT ? Number(process.env.EXPECT) : null;
const BACKEND = "https://backend.1houseglobal.dev";
const FRONTEND = "https://office.1houseglobal.com";

const log = (...a) => console.log("[earnings]", ...a);
const digits = (n) => String(Math.floor(Math.abs(Number(n) || 0))).length;

function parseEarnings(text) {
  if (!text) return null;
  // "Lifetime Earnings" followed (within a short window) by a $ amount.
  const re = /lifetime\s*earnings[\s\S]{0,60}?\$\s*([\d,]+(?:\.\d{1,2})?)/i;
  const m = text.match(re);
  if (m) { const n = Number(m[1].replace(/,/g, "")); if (isFinite(n)) return n; }
  // Fallback: a label and amount on adjacent lines.
  const re2 = /\$\s*([\d,]+(?:\.\d{1,2})?)[\s\S]{0,40}?lifetime\s*earnings/i;
  const m2 = text.match(re2);
  if (m2) { const n = Number(m2[1].replace(/,/g, "")); if (isFinite(n)) return n; }
  return null;
}

async function apiLogin() {
  const r = await fetch(BACKEND + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json().catch(() => null);
  const token = j && (j.access_token || j.accessToken || j.token || (j.data && (j.data.access_token || j.data.accessToken || j.data.token)));
  if (!token) throw new Error("api_login_failed:" + (r.status) + ":" + ((j && j.message) || ""));
  return token;
}

async function main() {
  if (!EMAIL || !PASSWORD || !ADMIN_KEY) {
    log("secrets not set yet (ONE_HOUSE_EMAIL / ONE_HOUSE_PASSWORD / GP_ADMIN_KEY) — skipping cleanly. Add them in repo Settings → Secrets to turn this on.");
    return; // exit 0 so the hourly job doesn't show as failed before setup
  }

  log("logging in via backend API…");
  const token = await apiLogin();
  log("token acquired (len " + String(token).length + ")");

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let earnings = null;
  try {
    // 1) open the app origin so we can write its localStorage
    await page.goto(FRONTEND, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.evaluate((t) => {
      try { for (const k of ["accessToken", "token", "authToken", "access_token"]) localStorage.setItem(k, t); } catch (e) {}
    }, token);
    log("token injected into localStorage");

    // 2) load the dashboard and let the SPA render
    await page.goto(FRONTEND + "/user/dashboard", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    // click a "Go To Dashboard" splash button if present
    try { const btn = page.getByText(/go to dashboard/i); if (await btn.count()) { await btn.first().click({ timeout: 4000 }); } } catch (e) {}
    // wait up to ~25s for the label to appear
    for (let i = 0; i < 25; i++) {
      const text = await page.evaluate(() => document.body ? document.body.innerText : "");
      earnings = parseEarnings(text);
      if (earnings != null) break;
      await page.waitForTimeout(1000);
    }
    if (earnings == null) {
      const text = await page.evaluate(() => document.body ? document.body.innerText : "");
      log("could not find 'Lifetime Earnings' on dashboard. Page had 'earnings' keyword: " + /earnings/i.test(text) + ", chars: " + (text || "").length);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  if (earnings == null) throw new Error("earnings_not_found_on_dashboard");
  log("parsed earnings (" + digits(earnings) + " digits, cents=" + (Math.round(earnings * 100) % 100 !== 0) + ")");
  if (EXPECT != null) log("matches expected: " + (Math.abs(earnings - EXPECT) < 1));

  // 3) post to /track
  const pr = await fetch(SITE + "/api/chat?kind=track-goal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: ADMIN_KEY, earnings }),
  });
  const pj = await pr.json().catch(() => null);
  log("posted to /track: status " + pr.status + ", ok=" + !!(pj && pj.ok));
  if (!pj || !pj.ok) throw new Error("post_failed:" + pr.status);
  log("done — earnings updated on /track");
}

main().catch((e) => { console.error("[earnings] ERROR:", String((e && e.message) || e)); process.exit(1); });
