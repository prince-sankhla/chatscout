import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createLinkedAccount, createRouteStakeholder, requestRouteProduct, isRazorpayTestMode } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!isRazorpayTestMode()) return NextResponse.json({ error: 'Payout onboarding is locked to Razorpay Test Mode.' }, { status: 503 });

  const body = await request.json().catch(() => null) as { communityId?: string; name?: string; phone?: string } | null;
  const communityId = body?.communityId?.trim();
  const name = body?.name?.trim();
  const phone = body?.phone?.trim() || null;
  if (!communityId || !name) return NextResponse.json({ error: 'communityId and name are required.' }, { status: 400 });

  const db = createAdminSupabaseClient() as any;
  const { data: community } = await db.from('communities').select('id,owner_user_id,claim_status').eq('id', communityId).maybeSingle();
  if (!community || community.claim_status !== 'claimed') return NextResponse.json({ error: 'Community must be claimed before paid campaigns are enabled.' }, { status: 403 });
  const { data: adminRow } = await db.from('community_admins').select('role').eq('community_id', communityId).eq('user_id', user.id).maybeSingle();
  if (community.owner_user_id !== user.id && !adminRow) return NextResponse.json({ error: 'You are not an admin of this community.' }, { status: 403 });

  const { data: existing } = await db.from('admin_payout_accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (existing?.razorpay_linked_account_id) {
    return NextResponse.json({ ok: true, alreadyOnboarded: true, kycStatus: existing.kyc_status, linkedAccountId: existing.razorpay_linked_account_id });
  }

  const email = user.email?.trim();
  if (!email) return NextResponse.json({ error: 'Your account needs an email address before payout onboarding.' }, { status: 400 });

  try {
    const account = await createLinkedAccount({ email, name, phone });
    const accountId = typeof account.id === 'string' ? account.id : null;
    if (!accountId) throw new Error('Razorpay did not return a linked account id.');

    const stakeholder = await createRouteStakeholder(accountId, { name, email, phone });
    const product = await requestRouteProduct(accountId);
    const productId = typeof product.id === 'string' ? product.id : null;
    const activationStatus = typeof product.activation_status === 'string' ? product.activation_status : 'requested';

    await db.from('admin_payout_accounts').upsert({
      user_id: user.id,
      provider: 'razorpay',
      razorpay_linked_account_id: accountId,
      kyc_status: activationStatus === 'activated' ? 'verified' : 'pending',
      bank_details_verified: false,
      onboarding_started_at: existing?.onboarding_started_at ?? new Date().toISOString(),
      last_provider_sync_at: new Date().toISOString(),
      provider_status: activationStatus,
      metadata: { stakeholder_id: stakeholder.id ?? null, route_product_id: productId },
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, testMode: true, linkedAccountId: accountId, stakeholderId: stakeholder.id ?? null, productId, activationStatus, nextStep: 'Complete the provider KYC/onboarding for the linked account in Razorpay. Vynlo stores only the provider reference and status.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start payout onboarding.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
