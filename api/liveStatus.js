// ─── Live Status — polls /api/livestatus on the website ─────────────────────
// No Firebase auth required. The website's Vercel API endpoint handles state.

const STATUS_URL = 'https://thegreenprint.trade/api/livestatus';

export async function fetchLiveStatus() {
  try {
    const res = await fetch(STATUS_URL, { cache: 'no-store' });
    if (!res.ok) return { isLive: false, title: '' };
    const data = await res.json();
    return {
      isLive: data.isLive || false,
      title:  data.title  || 'Live Now',
    };
  } catch (_) {
    return { isLive: false, title: '' };
  }
}

// Polls every 10 seconds; returns unsubscribe fn
export function subscribeLiveStatus(cb) {
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    const status = await fetchLiveStatus();
    if (!cancelled) cb(status);
  }

  poll(); // immediate first call
  const id = setInterval(poll, 10_000);
  return () => { cancelled = true; clearInterval(id); };
}

// Vercel compiles every file under /api into a serverless function, so this
// helper module must also expose a request handler or the deploy step fails
// after the build. Returning the current live status keeps it useful.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const status = await fetchLiveStatus();
    return res.status(200).json(status);
  } catch (_) {
    return res.status(200).json({ isLive: false, title: '' });
  }
}
