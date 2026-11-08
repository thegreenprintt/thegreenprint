# Livv Global IB Book — hourly broker sync for /track

The **Broker Book** tab on `/track` shows your Livv Global IB numbers: every
referred trader's balance + equity, the lots they've traded, and **your rebate at
$25 / lot**. It reads a snapshot from `GET /api/chat?kind=broker`, which is written
by the hourly pull described here.

Same shape as the nightly One House refresh: a browser task signed into your Livv
dashboard reads the numbers and POSTs them to the site. Nothing fake is ever
stored — the API rejects an empty/partial snapshot, so a failed pull just keeps
last hour's good data and the tab keeps showing it.

- **Portal:** `https://members.livvglobal.com/client/ib/ibdashboard` (LivvFX SPA, login-gated)
- **Earnings rule:** rebate = lots traded × `$25` (override per push with `perLot`, or site-wide with env `BROKER_PER_LOT`)
- **Write endpoint:** `POST /api/chat?kind=broker` — gated by `GP_ADMIN_KEY`
- **Read endpoint:** `GET /api/chat?kind=broker&key=<admin|track|passcode>` (the page also gets it inline from `?kind=track`)

---

## Snapshot contract (what the pull POSTs)

```json
{
  "key": "<GP_ADMIN_KEY>",
  "source": "livv-hourly",
  "perLot": 25,
  "broker": {
    "name": "Livv Global",
    "totals": {
      "lots": 0,          "lotsMonth": 0,      "newLots24h": 0,
      "rebate": 0,        "rebateMonth": 0,    "rebatePending": 0, "rebatePaid": 0,
      "traders": 0,       "funded": 0,         "trading": 0,
      "deposits": 0,      "equity": 0
    },
    "traders": [
      { "name": "", "email": "", "account": "", "balance": 0, "equity": 0,
        "lots": 0, "lotsMonth": 0, "rebate": 0, "deposits": 0,
        "status": "trading|funded|new|idle", "lastTradeAt": null }
    ]
  }
}
```

You only have to send what you have. The server fills the rest:
- Any `totals` field you omit is **derived from the `traders` rows** (lots, equity,
  deposits summed; funded/trading counted).
- `rebate` (book and per-trader) is **computed from lots × perLot** when you don't send it.
- Validation: the POST is rejected unless there's at least one trader row **or**
  `totals.lots > 0`. That's what guarantees the tab never goes blank or fake.

So the minimum viable push is just `{ broker: { totals: { lots: N } } }` or a list of
trader rows with their `lots`.

---

## Step 1 — one-time discovery (run with the browser once, send me the output)

Livv's internal API paths aren't public, so we read them off your own dashboard
once. In the Chrome task, open the dashboard and run this. It sniffs the network
calls the SPA makes and dumps where the token lives — paste the result back to me
and I'll lock the pull to the exact endpoints.

```js
// Run on https://members.livvglobal.com/client/ib/ibdashboard AFTER it loads.
const seen = [];
const _f = window.fetch;
window.fetch = function (u, o) { try { seen.push(String((u && u.url) || u)); } catch (e) {} return _f.apply(this, arguments); };
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (m, u) { try { seen.push(m + ' ' + u); } catch (e) {} return _open.apply(this, arguments); };
// token candidates
const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = String(localStorage.getItem(k) || '').slice(0, 40); }
// give the dashboard ~4s to make its calls, then report
await new Promise((r) => setTimeout(r, 4000));
JSON.stringify({ origin: location.origin, localStorageKeys: ls, apiCalls: Array.from(new Set(seen)).slice(0, 60) }, null, 2)
```

What I need from the output: the API **base URL**, the **login/token** key, and the
**IB endpoint(s)** that return referred accounts + their volume/balance.

---

## Step 2 — the hourly pull (template; endpoints filled after Step 1)

Modeled on the nightly One House task. `window.name` carries data across any
navigation; use a hidden-iframe XHR if the page has hooked `fetch`.

```js
// ── LIVV IB HOURLY PULL ──────────────────────────────────────────────
// Browser task, signed into members.livvglobal.com. READ-ONLY on Livv.
// Only write is the snapshot POST to thegreenprint.trade (admin-key gated).
const ADMIN_KEY = '<GP_ADMIN_KEY>'; // paste your GP_ADMIN_KEY at run time — never commit it
const PER_LOT = 25;

// 1) auth — read the token the dashboard stored (key confirmed in Step 1)
const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
if (!token) { throw new Error('LIVV_LOGGED_OUT'); } // STOP — do not post; Jay needs to log in

// 2) pull IB data (BASE + paths confirmed in Step 1)
const BASE = location.origin;                 // e.g. https://members.livvglobal.com
const H = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
// Replace /api/ib/clients with the real endpoint(s) from Step 1. Page every page.
const rows = [];
let page = 1, last = 1;
do {
  const rr = await fetch(BASE + '/api/ib/clients?page=' + page, { headers: H });
  const jj = await rr.json().catch(() => null);
  const d = jj && (jj.data || jj);
  const arr = Array.isArray(d) ? d : (d && Array.isArray(d.data) ? d.data : []);
  last = (d && d.last_page) || 1;
  for (const c of arr) {
    rows.push({
      name: c.name || c.full_name || c.client_name || '',
      email: (c.email || '').toLowerCase(),
      account: String(c.account || c.login || c.account_number || ''),
      balance: Number(c.balance) || 0,
      equity: Number(c.equity != null ? c.equity : c.balance) || 0,
      lots: Number(c.lots != null ? c.lots : (c.volume != null ? c.volume : c.total_lots)) || 0,
      lotsMonth: Number(c.lots_month || c.month_lots || 0) || 0,
      deposits: Number(c.deposits || c.total_deposit || 0) || 0,
      lastTradeAt: c.last_trade_at || c.last_trade || null,
    });
  }
  page++;
} while (page <= last && page <= 50);

// 3) build + POST (server computes rebate = lots × PER_LOT and the totals)
const snapshot = { name: 'Livv Global', perLot: PER_LOT, traders: rows, totals: {} };
const resp = await fetch('https://thegreenprint.trade/api/chat?kind=broker', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: ADMIN_KEY, source: 'livv-hourly', perLot: PER_LOT, broker: snapshot })
}).then((r) => r.json());
JSON.stringify({ posted: rows.length, resp })
```

**Guardrails (same as the nightly task):** read-only on Livv, never change anything
there; the only write is the one snapshot POST; if logged out, STOP and report —
do not post an empty snapshot.

---

## Step 3 — run it hourly

Create a scheduled task **on the computer where Chrome is signed into Livv** (the
scheduler needs that browser), set to hourly, with a prompt that loads the Chrome
tools and runs the Step 2 script, then reports `posted` + `resp.rebate`. Mirror the
nightly One House task's structure. (I can set this up for you once your computer is
connected to a session — turn on "Require this computer" for the task.)

## Optional — move it fully hands-off (server-side, no computer awake)

If Livv exposes an email+password login that returns a bearer token (like One House's
`backend.1houseglobal.dev/api/login`), I can add a `?kind=livv-refresh` endpoint on a
Vercel hourly cron so it runs even when your computer is asleep. To wire that, send me
from Step 1: the login URL, the token field, and the IB endpoint — plus set env
`LIVV_EMAIL` / `LIVV_PASSWORD`.
