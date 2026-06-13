import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { to, subject, html, template, data } = await req.json();

  // Basic auth check — internal use only
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resend.emails.send({
      from: "Jay @ The Greenprint <noreply@thegreenprint.trade>",
      to,
      subject,
      html,
    });
    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
