// ─── Live Status via Firestore REST API ─────────────────────────────────────
// The app uses custom REST auth so the Firestore SDK has no auth token.
// We get an anonymous Firebase ID token via REST and poll the Firestore REST
// API directly — satisfies request.auth != null rules without the user
// needing to be fully logged in.

const API_KEY    = 'AIzaSyDhs-M7cWhKwvMGJAdgsee7Sf7kn34BCrA';
const PROJECT    = 'the-greenprint-53d98';
const STREAM_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/stream/status`;

let _anonToken   = null;
let _tokenExpiry = 0;

async function getAnonToken() {
  if (_anonToken && Date.now() < _tokenExpiry) return _anonToken;
  try {
    const res  = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ returnSecureToken: true }),
      },
    );
    const data = await res.json();
    if (data.idToken) {
      _anonToken   = data.idToken;
      _tokenExpiry = Date.now() + 55 * 60 * 1000;
    }
  } catch (_) {}
  return _anonToken;
}

export async function fetchLiveStatus() {
  try {
    const token   = await getAnonToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res     = await fetch(STREAM_URL, { headers });
    if (!res.ok) return { isLive: false, title: '' };
    const doc = await res.json();
    return {
      isLive: doc.fields?.isLive?.booleanValue || false,
      title:  doc.fields?.title?.stringValue   || 'Live Now',
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

  poll();
  const id = setInterval(poll, 10_000);
  return () => { cancelled = true; clearInterval(id); };
}
