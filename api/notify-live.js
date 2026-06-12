// api/notify-live.js
const https = require('https');
const fs = require('fs');
const path = require('path');

function postJson(url, apiKey, data) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify(data);
    var opts = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    var req = https.request(url, opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try { resolve({ ok: res.statusCode < 300, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch(e) { resolve({ ok: false, body: {} }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set in Vercel env vars.' });

  var body = req.body || {};
  var streamUrl = body.url || 'https://thegreenprint.trade/stream.html';
  var from = process.env.FROM_EMAIL || 'The Greenprint <notifications@thegreenprint.trade>';
  var isPreview = body.preview === true;

  // Use emails passed from frontend (leads tab) if provided
  var emails = [];
  if (Array.isArray(body.emails) && body.emails.length > 0) {
    emails = body.emails.filter(function(e) { return typeof e === 'string' && e.includes('@'); });
  }

  // Fallback: JSON file
  if (emails.length === 0) {
    try {
      var filePath = path.join(__dirname, '..', 'community-leads.json');
      var fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      emails = (fileData.emails || []).filter(function(e) { return typeof e === 'string' && e.includes('@'); });
    } catch(e) {}
  }

  // Fallback: COMMUNITY_EMAILS env var
  if (emails.length === 0 && process.env.COMMUNITY_EMAILS) {
    emails = process.env.COMMUNITY_EMAILS.split(',')
      .map(function(e) { return e.trim().toLowerCase(); })
      .filter(function(e) { return e.includes('@'); });
  }

  if (!emails.length) {
    return res.status(400).json({ error: 'No emails found in leads tab or community-leads.json.' });
  }

  var emailHtml = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px">'
    + '<p style="color:#00ff87;font-size:22px;font-weight:700;margin:0 0 12px">&#128308; The Greenprint is LIVE</p>'
    + '<p style="color:#ccc;margin:0 0 24px">Jay is live now. Join the trading mentorship stream — don\'t miss it.</p>'
    + '<a href="' + streamUrl + '" style="display:inline-block;background:#00ff87;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">&#9654; Watch Live Now</a>'
    + '<p style="color:#555;font-size:11px;margin-top:28px">You\'re receiving this as a member of The Greenprint community.</p>'
    + '</div>';

  if (isPreview) {
    return res.status(200).json({ total: emails.length, html: emailHtml });
  }

  var CHUNK = 100;
  var sent = 0;
  var errors = [];

  for (var i = 0; i < emails.length; i += CHUNK) {
    var chunk = emails.slice(i, i + CHUNK);
    var payload = chunk.map(function(to) {
      return { from: from, to: [to], subject: '🔴 Jay is LIVE on The Greenprint right now!', html: emailHtml };
    });
    try {
      var result = await postJson('https://api.resend.com/emails/batch', apiKey, payload);
      if (result.ok) { sent += chunk.length; }
      else { errors.push(result.body); }
    } catch(e) {
      errors.push(e.message);
    }
  }

  res.status(200).json({ sent: sent, total: emails.length, errors: errors });
};
