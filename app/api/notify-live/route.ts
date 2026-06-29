import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const FB = 'https://the-greenprint-53d98-default-rtdb.firebaseio.com';

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // Fetch all leads from Firebase
    const data = await fetch(`${FB}/live/leads.json`).then(r => r.json());
    if (!data) return NextResponse.json({ sent: 0, message: 'No leads found' });

    // Extract valid emails
    const leads: { email: string; name: string }[] = Object.values(data as Record<string, any>)
      .filter((v: any) => v?.email && v.email.includes('@'))
      .map((v: any) => ({ email: v.email, name: v.name || 'Viewer' }));

    if (leads.length === 0) return NextResponse.json({ sent: 0, message: 'No valid emails' });

    const html = (name: string) => `
<!DOCTYPE html>
<html>
<body style='margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;'>
  <div style='max-width:560px;margin:0 auto;padding:40px 24px;'>
    <div style='background:linear-gradient(135deg,#00ff87,#00c864);padding:3px;border-radius:16px;'>
      <div style='background:#0d0d0d;border-radius:14px;padding:40px 32px;text-align:center;'>
        <div style='font-size:48px;margin-bottom:16px;'>🟢</div>
        <h1 style='color:#fff;font-size:28px;margin:0 0 8px;font-weight:900;letter-spacing:-0.5px;'>
          We're LIVE
        </h1>
        <p style='color:#aaa;font-size:16px;margin:0 0 32px;'>
          Hey ${name}, Jay is streaming right now on The Greenprint.
        </p>
        <a href='https://thegreenprint.trade/stream'
           style='display:inline-block;background:linear-gradient(135deg,#00ff87,#00c864);
                  color:#000;font-weight:900;font-size:18px;padding:16px 48px;
                  border-radius:50px;text-decoration:none;letter-spacing:0.5px;'>
          ▶ Watch Now
        </a>
        <p style='color:#555;font-size:12px;margin:32px 0 0;'>
          The Greenprint · thegreenprint.trade
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Send in batches of 100
    let sent = 0;
    for (let i = 0; i < leads.length; i += 100) {
      const batch = leads.slice(i, i + 100);
      await resend.batch.send(
        batch.map(({ email, name }) => ({
          from: 'Jay @ The Greenprint <noreply@thegreenprint.trade>',
          to: email,
          subject: '🟢 The Greenprint is LIVE — Watch Now',
          html: html(name),
        }))
      );
      sent += batch.length;
    }

    return NextResponse.json({ sent, total: leads.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
