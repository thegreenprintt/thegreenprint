// Sends Jay a Telegram DM the moment someone finishes the /start quiz.
// Env vars used (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN     — already set
//   TELEGRAM_ALERT_CHAT_ID — your personal chat id (get it from @userinfobot on Telegram)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Dedicated alerts bot if set, otherwise fall back to the main bot
  const token = process.env.TELEGRAM_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) return res.status(200).json({ skipped: 'alerts not configured' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  const EXP = { never: 'Never traded', tried: "Tried it, didn't stick", active: 'Trades now' };
  const WHY = { income: 'Extra income', freedom: 'Financial freedom', skill: 'Learn a skill', fulltime: 'Full-time goal' };
  const IDEAS = { yes: 'Wants the trades', learn: 'Wants to learn first', looking: 'Just looking' };

  const hot = b.budget === 'yes';
  const lines = [
    hot ? '🔥 *READY LEAD — CALL NOW*' : '🌱 *New free lead*',
    '',
    `*${b.name || 'No name'}*`,
    b.phone ? `📞 ${b.phone}` : '📞 _no phone given_',
    b.email ? `✉️ ${b.email}` : '',
    '',
    `Experience: ${EXP[b.experience] || '—'}`,
    `Wants: ${WHY[b.why] || '—'}`,
    `Has $100–200: ${hot ? 'YES ✅' : 'Not right now'}`,
    !hot && b.wantsIdeas ? `Interest: ${IDEAS[b.wantsIdeas] || '—'}` : '',
    '',
    hot ? '👉 Call within 5 minutes — that\'s when they close.' : '👉 Send them a text and make sure they got set up.',
    '',
    '📋 thegreenprint.trade/leads',
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
    const out = await r.json();
    return res.status(200).json({ sent: !!out.ok });
  } catch (e) {
    return res.status(200).json({ sent: false, error: String(e) });
  }
};
