import { NextResponse } from "next/server";
import { recordJoinClick } from "@/features/analytics/data-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = createServerSupabaseClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id, invite_url")
    .eq("slug", (await params).slug)
    .eq("status", "published")
    .maybeSingle();
  if (!community) return NextResponse.redirect(new URL("/", request.url), 302);
  await recordJoinClick(community.id);
  return NextResponse.redirect(community.invite_url, 302);
}
