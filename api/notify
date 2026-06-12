Å// api/notify-live.js  — Vercel serverless function
// Sends a "Jacob is LIVE" email to every address in community-leads.json
//
// Required Vercel env vars:
//   RESEND_API_KEY    — from resend.com (free tier: 3,000 emails/month)
//
// Optional Vercel env vars:
//   FROM_EMAIL        — defaults to "The Greenprint <notifications@thegreenprint.trade>"
//   COMMUNITY_EMAILS  — comma-separated fallback list if community-leads.json is empty
//                       e.g. "a@gmail.com,b@yahoo.com,c@icloud.com"

let leadsFile;
try { leadsFile = require('../community-leads.json'); } catch(e) { leadsFile = {emails:[]}; }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY not set. Add it in Vercel → Settings → Environment Variables.'
    });
  }

  const body = req.body || {};
  const streamUrl = body.url || 'https://thegreenprint.trade/stream.html';
  const from = process.env.FROM_EMAIL || 'The Greenprint <notifications@thegreenprint.trade>';
  const isPreview = body.preview === true;

  // Build email list: JSON file first, then COMMUNITY_EMAILS env var as fallback
  let emails = (leadsFile.emails || []).filter(e => typeof e === 'string' && e.includes('@'));
  if (emails.length === 0 && process.env.COMMUNITY_EMAILS) {
    emails = process.env.COMMUNITY_EMAILS
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));
  }

  if (!emails.length) {
    return res.status(400).json({
      error: 'No emails found. Add COMMUNITY_EMAILS env var in Vercel, or deploy community-leads.json with emails.'
    });
  }

  // Build the email HTML once (shared for preview and send)
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px">
      <p style="color:#00ff87;font-size:22px;font-weight:700;margin:0 0 12px">🔴 The Greenprint is LIVE</p>
      <p style="color:#ccc;margin:0 0 24px">Jay is live now. Join the trading mentorship stream — don't miss it.</p>
      <a href="${streamUrl}"
         style="display:inline-block;background:#00ff87;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
        ▶ Watch Live Now
      </a>
      <p style="color:#555;font-size:11px;margin-top:28px">
        You're receiving this as a member of The Greenprint community.
      </p>
    </div>
  `;

  // Preview mode — return count + HTML without sending
  if (isPreview) {
    return res.status(200).json({ total: emails.length, html: emailHtml });
  }

  // Send mode — batch in chunks of 100 (Resend limit)
  const CHUNK = 100;
  let sent = 0;
  let errors = [];

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const payload = chunk.map(to => ({
      from,
      to: [to],
      subject: '🔴 Jay is LIVE on The Greenprint right now!',
      html: emailHtml
    }));

    try {
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        sent += chunk.length;
      } else {
        const err = await r.json();
        errors.push(err);
      }
    } catch (e) {
      errors.push(e.message);
    }
  }

  res.status(200).json({ sent, total: emails.length, errors });
};
