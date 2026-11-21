# /track live refresh — what changed and the one-time setup

## The problem
`/track` only updated once or twice a day. The scrapers themselves work — the cause is
**GitHub Actions silently dropping most scheduled runs.** The broker job is scheduled
every 15 min and the earnings job every 30 min, but GitHub actually fired each only
~3–4 times across a whole day. Pinging more often in the cron line doesn't help; GitHub
just drops more. Scheduled workflows are best-effort and heavily deprioritized.

## The fix
`/track` now pulls fresh data **on demand** instead of waiting on GitHub's schedule:

- **Business / members** (no browser needed) refreshes **instantly, server-side** the
  moment you open `/track`.
- **Earnings + Broker** need a real browser (Playwright), which only runs in GitHub
  Actions — so opening `/track` now **dispatches those two jobs directly** via the GitHub
  API (a dispatch fires immediately; it is not throttled like the schedule).

It fires when you open the page, again when the tab comes back to the foreground, and
every 4 minutes while it's open — plus a manual **Refresh now** button. Every source is
rate-limited server-side (business ≤ once/3 min, each job ≤ once/4 min) so multiple
tabs / rapid opens can't hammer anything. The header shows per-source freshness
(Business / Broker) and a "pulling live…" state.

## One-time setup (required for earnings + broker to refresh on open)

The business refresh works with **no setup**. For the two browser jobs, the server needs
a GitHub token so it can dispatch them.

1. **Create a GitHub token** — github.com/settings/personal-access-tokens → *Fine-grained
   token* → Repository access: only `thegreenprintt/thegreenprint` → Permissions:
   **Actions: Read and write**. Copy the token (`github_pat_…`).
2. **Add it to Vercel** — Vercel project → Settings → Environment Variables → add
   `GH_DISPATCH_TOKEN` = the token (Production). Redeploy.

Until the token is added, earnings + broker simply fall back to the existing GitHub
schedule — **never worse than today** — while business already refreshes live.

## Optional: background freshness when you're not looking
On-open refresh keeps `/track` current whenever you're on it. To also keep it fresh in
the background, point a reliable scheduler at the kick endpoint (no token needed in the
scheduler — the server holds it):

- **cron-job.org** (free): new cron job → URL
  `https://thegreenprint.trade/api/chat?kind=track-kick&key=YOUR_TRACK_PASSCODE`
  → method POST → every 10 minutes.
- Or, if the project is on **Vercel Pro**, add to `vercel.json` crons:
  `{ "path": "/api/chat?kind=track-kick&key=YOUR_TRACK_PASSCODE", "schedule": "*/10 * * * *" }`
  (Vercel Hobby only allows daily crons, so use cron-job.org on Hobby.)

## Note on the old nightly browser task
The separate nightly Claude-in-Chrome task that scraped 1House/Viato can't run in the
cloud (no browser there) and is now redundant — this server-side path replaces it. Viato
phone enrichment already runs inside the hourly `1h-refresh` (the `gp:track:geo` step).
