// Live status via Firebase Realtime Database REST API
const STATUS_URL = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com/livestatus.json';

export async function fetchLiveStatus() {
  try {
    const res = await fetch(STATUS_URL);
    if (!res.ok) return { isLive: false, title: '' };
    const data = await res.json();
    if (!data) return { isLive: false, title: '' };
    return { isLive: data.isLive || false, title: data.title || 'Live Now' };
  } catch (_) {
    return { isLive: false, title: '' };
  }
}

export function subscribeLiveStatus(cb) {
  let cancelled = false;
  async function poll() {
    if (cancelled) return;
    const status = await fetchLiveStatus();
    if (!cancelled) cb(status);
  }
  poll();
  const id = setInterval(poll, 10_000);
  return () => { cancelled = true; clearInterval(id); };
}
