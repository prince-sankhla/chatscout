import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await createAdminSupabaseClient().rpc("recompute_audience_packs");
  if (error) return NextResponse.json({ error: "Unable to recompute audience packs." }, { status: 500 });
  return NextResponse.json({ ok: true, ...((data ?? {}) as Record<string, unknown>), recomputedAt: new Date().toISOString() });
}
