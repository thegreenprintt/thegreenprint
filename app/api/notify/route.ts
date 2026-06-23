import { NextResponse } from "next/server";

const FB = "https://the-greenprint-53d98-default-rtdb.firebaseio.com";

export async function POST() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not set in environment variables" }, { status: 500 });
    }

    // Fetch email list from Firebase
    const data = await fetch(`${FB}/notification/list.json`, { cache: "no-store" }).then(r => r.json());
    if (!data) {
      return NextResponse.json({ error: "No subscriber emails found." }, { status: 404 });
    }

    const emails: string[] = Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean) as string[];
    if (!emails.length) {
      return NextResponse.json({ error: "Email list is empty." }, { status: 404 });
    }

    // Send in batches of 50 (Resend batch limit)
    const batchSize = 50;
    let sent = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          batch.map((to) => ({
            from: "The Greenprint <noreply@thegreenprint.trade>",
            to,
            subject: "\uD83D\uDFE2 The Greenprint is LIVE — Free Day Trading Class",
            html: `
              <div style="background:#0a0a0a;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;padding:40px 24px;max-width:560px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:32px;">
                  <div style="display:inline-block;padding:8px 20px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:20px;margin-bottom:20px;">
                    <span style="color:#22c55e;font-size:13px;font-weight:700;letter-spacing:2px;">\uD83D\uDFE2 LIVE NOW</span>
                  </div>
                  <h1 style="font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;color:#ffffff;">The Greenprint is Live</h1>
                  <p style="color:rgba(255,255,255,0.5);font-size:15px;margin:0;">Free Day Trading Class — happening right now</p>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;margin-bottom:28px;">
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.8);">
                    Your free day trading class is live right now. Come watch live trades, scanner alerts, and real-time market analysis with The Greenprint.
                  </p>
                  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);">No cost. No catch. Just value.</p>
                </div>
                <div style="text-align:center;margin-bottom:32px;">
                  <a href="https://thegreenprint.trade/stream" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#15803d,#22c55e);border-radius:12px;color:#000000;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:0.5px;">
                    JOIN THE CLASS \u2192
                  </a>
                </div>
                <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);margin:0;line-height:1.8;">
                  The Greenprint \u00B7 <a href="https://thegreenprint.trade" style="color:rgba(255,255,255,0.2);text-decoration:none;">thegreenprint.trade</a><br/>
                  You're receiving this because you signed up for stream notifications.
                </p>
              </div>
            `,
          }))
        ),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Resend error: ${err}`, sentSoFar: sent }, { status: 500 });
      }

      sent += batch.length;
    }

    return NextResponse.json({ success: true, sent, total: emails.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
