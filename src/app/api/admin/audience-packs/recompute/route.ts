import { NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAuthorizedAdmin } from "@/lib/supabase/admin-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !isAuthorizedAdmin(user.id)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminSupabaseClient().rpc("recompute_audience_packs");
  if (error) return NextResponse.json({ error: "Unable to recompute audience packs." }, { status: 500 });
  return NextResponse.json({ ok: true, ...((data ?? {}) as Record<string, unknown>), recomputedAt: new Date().toISOString() });
}
