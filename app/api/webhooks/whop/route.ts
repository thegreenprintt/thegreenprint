import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";


function tierFromWhop(productName: string): "member" | "trader" | "elite" {
  const name = productName.toLowerCase();
  if (name.includes("elite")) return "elite";
  if (name.includes("trader")) return "trader";
  return "member";
}

async function sendTelegramInvite(chatIds: string[], botToken: string) {
  for (const chatId of chatIds) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, member_limit: 1 }),
      });
      const data = await r.json();
      if (data.result?.invite_link) return data.result.invite_link;
    } catch {}
  }
  return null;
}

async function addToBeehiiv(email: string, name: string) {
  if (!process.env.BEEHIIV_API_KEY || !process.env.BEEHIIV_PUBLICATION_ID) return;
  try {
    await fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify({ email, name, reactivate_existing: true }),
    });
  } catch {}
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  // Verify webhook signature
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const sig = req.headers.get("whop-signature");
  if (secret && sig) {
    const body = await req.text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(Buffer.from(sig.replace("sha256=",""), "hex"));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    var payload = JSON.parse(body);
  } else {
    payload = await req.json();
  }

  const supabase = createAdminClient();
  const { action, data } = payload;

  if (action === "membership.went_active") {
    const email = data.user?.email;
    const name = data.user?.name || "";
    const tier = tierFromWhop(data.product?.name || "");
    const whopMemberId = data.id;

    // Upsert user in Supabase
    const { error } = await supabase.from("users").upsert({
      email,
      name,
      tier,
      app_access: true,
      scanner_access: tier === "trader" || tier === "elite",
      whop_member_id: whopMemberId,
      telegram_invited: false,
    }, { onConflict: "email" });

    if (error) console.error("Supabase upsert error:", error);

    // Send Telegram invite
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    const chatIds: string[] = [process.env.TELEGRAM_MEMBER_CHAT_ID!].filter(Boolean);
    if (tier === "trader") chatIds.push(process.env.TELEGRAM_TRADER_CHAT_ID!);
    if (tier === "elite") {
      chatIds.push(process.env.TELEGRAM_TRADER_CHAT_ID!);
      chatIds.push(process.env.TELEGRAM_ELITE_CHAT_ID!);
    }
    await sendTelegramInvite(chatIds.filter(Boolean), botToken);
    await supabase.from("users").update({ telegram_invited: true }).eq("email", email);

    // Beehiiv
    await addToBeehiiv(email, name);

    // Welcome email
    try {
      await resend.emails.send({
        from: "Jay @ The Greenprint <noreply@thegreenprint.trade>",
        to: email,
        subject: "You're in. Welcome to The Greenprint.",
        html: welcomeEmail(name, tier),
      });
    } catch (e) { console.error("Email error:", e); }

    return NextResponse.json({ ok: true });
  }

  if (action === "membership.went_inactive") {
    const email = data.user?.email;
    await supabase.from("users").update({
      app_access: false,
      scanner_access: false,
      cancelled_at: new Date().toISOString(),
    }).eq("email", email);

    // Churn email
    try {
      await resend.emails.send({
        from: "The Greenprint <noreply@thegreenprint.trade>",
        to: email,
        subject: "Your Greenprint membership has ended",
        html: `<p style="font-family:sans-serif;color:#888">Your membership has been cancelled. You can rejoin anytime at <a href="https://thegreenprint.trade/join">thegreenprint.trade/join</a>.</p>`,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

function welcomeEmail(name: string, tier: string): string {
  const firstName = name.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #1E1E1E;border-radius:8px;overflow:hidden">
  <tr><td style="padding:40px;text-align:center">
    <div style="width:48px;height:48px;background:#00FF85;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px">
      <span style="color:#080808;font-weight:900;font-size:16px;letter-spacing:-0.05em">GP</span>
    </div>
    <h1 style="color:#F5F5F5;font-size:36px;font-weight:900;margin:0 0 8px;letter-spacing:-0.03em">You're in.</h1>
    <p style="color:#666;font-size:16px;margin:0 0 32px">Welcome to The Greenprint, ${firstName}.</p>
    <p style="color:#888;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.1em;font-family:monospace">Your Plan</p>
    <p style="color:#00FF85;font-size:20px;font-weight:700;margin:0 0 32px;text-transform:capitalize">${tier}</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display:inline-block;background:#00FF85;color:#080808;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;margin-bottom:16px">Enter The Platform →</a>
    <br>
    <a href="https://t.me/+Hz_sp0s32jVjNDQx" style="display:inline-block;background:#1A1A1A;color:#F5F5F5;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;margin:6px">Join Telegram</a>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/scanner" style="display:inline-block;background:#1A1A1A;color:#F5F5F5;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;margin:6px">Launch Scanner</a>
    <hr style="border:none;border-top:1px solid #1E1E1E;margin:32px 0">
    <p style="color:#444;font-size:12px;margin:0">— Jay</p>
    <p style="color:#333;font-size:11px;margin:8px 0 0">The Greenprint &bull; <a href="${process.env.NEXT_PUBLIC_SITE_URL}/risk-disclosure" style="color:#444">Risk Disclosure</a></p>
  </td></tr>
</table>
<p style="color:#333;font-size:11px;margin-top:20px;text-align:center">
  Educational purposes only. Not financial advice.<br>
  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/risk-disclosure" style="color:#444">Risk Disclosure</a>
</p>
</td></tr></table>
</body></html>`;
}
