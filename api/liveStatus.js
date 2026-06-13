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
