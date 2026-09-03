import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { isAuthorizedAdmin } from '@/lib/supabase/admin-authorization';
import { createTransfer, fetchPayment, isRazorpayTestMode } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function feeBps() {
  const raw = process.env.VYNLO_PLATFORM_FEE_BPS?.trim();
  if (!raw || !/^\d+$/.test(raw)) throw new Error('VYNLO_PLATFORM_FEE_BPS is not configured. Platform fee is a business decision and must be set before transfers.');
  const bps = Number(raw);
  if (bps < 0 || bps > 10000) throw new Error('VYNLO_PLATFORM_FEE_BPS must be between 0 and 10000.');
  return bps;
}

export async function POST(request: Request) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !isAuthorizedAdmin(user.id)) return NextResponse.json({ error: 'Platform authorization required.' }, { status: 403 });
  if (!isRazorpayTestMode()) return NextResponse.json({ error: 'Transfers are locked to Razorpay Test Mode until production approval.' }, { status: 503 });

  const body = await request.json().catch(() => null) as { campaignId?: string; communityId?: string; paymentId?: string } | null;
  const campaignId = body?.campaignId?.trim();
  const communityId = body?.communityId?.trim();
  const paymentId = body?.paymentId?.trim();
  if (!campaignId || !communityId || !paymentId) return NextResponse.json({ error: 'campaignId, communityId and paymentId are required.' }, { status: 400 });

  try {
    const db = createAdminSupabaseClient() as any;
    const [{ data: campaign }, { data: community }, { data: payout }] = await Promise.all([
      db.from('campaigns').select('id,brand_user_id,status').eq('id',campaignId).maybeSingle(),
      db.from('communities').select('id,status,claim_status,owner_user_id').eq('id',communityId).maybeSingle(),
      db.from('admin_payout_accounts').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    if (!campaign || campaign.status !== 'completed') throw new Error('Campaign must be completed before payout settlement.');
    if (!community || community.status !== 'published' || community.claim_status !== 'claimed') throw new Error('Community must be published and claimed.');
    if (!payout?.razorpay_linked_account_id || payout.kyc_status !== 'verified') throw new Error('Recipient payout account is not verified in Razorpay.');
    if (!(await db.rpc('payment_eligibility',{p_community_id:communityId,p_user_id:payout.user_id})).data) throw new Error('Community is not enabled for payouts.');

    const payment = await fetchPayment(paymentId);
    if (payment.status !== 'captured') throw new Error(`Payment ${paymentId} is not captured.`);
    const gross = Number(payment.amount ?? 0) / 100;
    if (!Number.isFinite(gross) || gross <= 0) throw new Error('Razorpay payment amount is invalid.');

    const bps = feeBps();
    const platformFee = Math.round(gross * bps) / 10000;
    const payoutAmount = Math.round((gross - platformFee) * 100) / 100;
    if (payoutAmount <= 0) throw new Error('Admin payout amount must be greater than zero.');

    const { data: existing } = await db.from('transactions').select('id,status,razorpay_transfer_id').eq('campaign_id',campaignId).eq('community_id',communityId).eq('razorpay_payment_id',paymentId).maybeSingle();
    if (existing?.status === 'completed') return NextResponse.json({ ok: true, idempotent: true, transactionId: existing.id, transferId: existing.razorpay_transfer_id });

    const { data: transaction, error: insertError } = await db.from('transactions').insert({ campaign_id:campaignId,brand_user_id:campaign.brand_user_id,community_id:communityId,gross_amount:gross,platform_fee_amount:platformFee,admin_payout_amount:payoutAmount,status:'pending',provider:'razorpay',razorpay_payment_id:paymentId }).select('*').single();
    if (insertError) throw new Error(insertError.message);

    try {
      const transfer = await createTransfer(paymentId,payout.razorpay_linked_account_id,payoutAmount,{campaign_id:campaignId,community_id:communityId,transaction_id:transaction.id});
      const transferRows = Array.isArray(transfer.transfers) ? transfer.transfers : [];
      const transferId = typeof transferRows[0]?.id === 'string' ? transferRows[0].id : null;
      await db.from('transactions').update({ status:'completed', razorpay_transfer_id:transferId, completed_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',transaction.id);
      return NextResponse.json({ ok:true,testMode:true,transactionId:transaction.id,transferId,grossAmount:gross,platformFeeAmount:platformFee,adminPayoutAmount:payoutAmount });
    } catch (transferError) {
      const reason = transferError instanceof Error ? transferError.message : 'Transfer failed.';
      await db.from('transactions').update({ status:'failed', failure_reason:reason, updated_at:new Date().toISOString() }).eq('id',transaction.id);
      throw new Error(reason);
    }
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error?error.message:'Unable to create payout transfer.' }, { status:502 });
  }
}
