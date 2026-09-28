// ─── SCREENSHOT OCR ──────────────────────────────────────────────────────────
// Reads a trade screenshot server-side via the free OCR.space API and returns
// the raw text. The client downsizes the image first and we only echo text —
// the picture itself is never stored. Set OCR_API_KEY in Vercel for higher
// limits; falls back to the public demo key for light use.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    let image = String(body.image || '');
    if (!image) return res.status(400).json({ error: 'no_image' });
    // OCR.space wants a full data URL (data:image/...;base64,....)
    if (!/^data:image\//.test(image)) image = 'data:image/png;base64,' + image;

    const key = process.env.OCR_API_KEY || 'helloworld';
    const form = new URLSearchParams();
    form.set('apikey', key);
    form.set('base64Image', image);
    form.set('language', 'eng');
    form.set('OCREngine', '2');
    form.set('scale', 'true');
    form.set('isTable', 'true');

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    let j;
    try {
      const r = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: ctrl.signal,
      });
      j = await r.json();
    } finally {
      clearTimeout(t);
    }

    const text =
      (j && j.ParsedResults && j.ParsedResults[0] && j.ParsedResults[0].ParsedText) || '';
    if (!text && j && j.IsErroredOnProcessing) {
      return res.status(200).json({ text: '', error: (j.ErrorMessage && j.ErrorMessage[0]) || 'ocr_failed' });
    }
    return res.status(200).json({ text: text });
  } catch (e) {
    return res.status(200).json({ text: '', error: 'ocr_unavailable' });
  }
};
