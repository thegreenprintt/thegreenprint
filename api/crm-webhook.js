// Forwards a /start lead to the Viato CRM automation webhook.
// Runs server-side so the browser's CORS policy can never block delivery.
// Body in:  { firstName, email, phone }
// Body out: identical JSON, POSTed to the CRM webhook URL below.

const CRM_WEBHOOK_URL =
  'https://viato.ai/api/webhooks/automation/zNoKqErts4Mn-BCl1uRBgtm3KUP4uOfu';

// Always send an E.164-ish number. US numbers typed without a country code get +1.
function withCountryCode(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) return '+' + s.slice(1).replace(/\D/g, '');
  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '+1' + digits;                 // 5551234567
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits; // 15551234567
  return '+' + digits;                                            // already has a country code
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  const payload = {
    firstName: String(b.firstName || '').trim(),
    email: String(b.email || '').trim(),
    phone: withCountryCode(b.phone),
  };

  try {
    const r = await fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.status(200).json({ forwarded: true, crmStatus: r.status });
  } catch (e) {
    // Never surface an error to the visitor — the form has already succeeded.
    return res.status(200).json({ forwarded: false, error: String(e) });
  }
};
