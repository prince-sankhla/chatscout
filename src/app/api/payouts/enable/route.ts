import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { communityId?: string; enabled?: boolean } | null;
  const communityId = body?.communityId?.trim();
  if (!communityId || typeof body?.enabled !== 'boolean') return NextResponse.json({ error: 'communityId and enabled are required.' }, { status: 400 });

  const db = createAdminSupabaseClient() as any;
  const { data, error } = await db.rpc('set_payout_enabled', { p_community_id: communityId, p_enabled: body.enabled });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, monetization: data });
}
