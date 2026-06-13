import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check tier
  const { data: profile } = await supabase
    .from("users").select("tier,scanner_access").eq("id", user.id).single();

  if (!profile?.scanner_access && profile?.tier === "member") {
    return NextResponse.json({ error: "Upgrade required", tier: "trader" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const signal = searchParams.get("signal");

  let query = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (signal && signal !== "all") {
    query = query.eq("signal_type", signal.toUpperCase());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
