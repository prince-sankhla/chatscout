import { NextResponse } from "next/server";
import { recordJoinClick } from "@/features/analytics/data-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = createServerSupabaseClient();
  const { slug } = await params;
  const { data: community } = await supabase
    .from("communities")
    .select("id, invite_url, join_enabled")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!community || community.join_enabled === false) return NextResponse.redirect(new URL(`/community/${slug}`, request.url), 302);
  await recordJoinClick(community.id);
  return NextResponse.redirect(community.invite_url, 302);
}
