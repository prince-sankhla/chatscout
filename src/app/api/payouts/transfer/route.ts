import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { isAuthorizedAdmin } from '@/lib/supabase/admin-authorization';
import { createTransfer, fetchPayment, isRazorpayTestMode } from '@/lib/payments/razorpay';
import { calculateTransferAmounts } from '@/lib/payments/fees';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function feeBps() {
  const raw = process.env.VYNLO_PLATFORM_FEE_BPS?.trim();
  if (!raw || !/^\d+$/.test(raw)) throw new Error('VYNLO_PLATFORM_FEE_BPS is not configured. Platform fee is a business decision and must be set before transfers.');
  return Number(raw);
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
    const [{ data: campaign }, { data: community }] = await Promise.all([
      db.from('campaigns').select('id,brand_user_id,status').eq('id',campaignId).maybeSingle(),
      db.from('communities').select('id,status,claim_status,owner_user_id').eq('id',communityId).maybeSingle(),
    ]);
    if (!campaign || campaign.status !== 'completed') throw new Error('Campaign must be completed before payout settlement.');
    if (!community || community.status !== 'published' || community.claim_status !== 'claimed') throw new Error('Community must be published and claimed.');

    const recipientUserId = community.owner_user_id ?? (await db.from('community_admins').select('user_id').eq('community_id',communityId).eq('role','owner').maybeSingle()).data?.user_id ?? null;
    if (!recipientUserId) throw new Error('No community owner payout recipient is configured.');
    const { data: payout } = await db.from('admin_payout_accounts').select('*').eq('user_id', recipientUserId).maybeSingle();
    if (!payout?.razorpay_linked_account_id || payout.kyc_status !== 'verified') throw new Error('Recipient payout account is not verified in Razorpay.');
    if (!(await db.rpc('payment_eligibility',{p_community_id:communityId,p_user_id:recipientUserId})).data) throw new Error('Community is not enabled for payouts.');

    const payment = await fetchPayment(paymentId);
    if (payment.status !== 'captured') throw new Error(`Payment ${paymentId} is not captured.`);
    const gross = Number(payment.amount ?? 0) / 100;
    const amounts = calculateTransferAmounts(gross, feeBps());

    const { data: existing } = await db.from('transactions').select('id,status,razorpay_transfer_id').eq('campaign_id',campaignId).eq('community_id',communityId).eq('razorpay_payment_id',paymentId).maybeSingle();
    if (existing?.status === 'completed') return NextResponse.json({ ok: true, idempotent: true, transactionId: existing.id, transferId: existing.razorpay_transfer_id });

    const { data: transaction, error: insertError } = await db.from('transactions').insert({ campaign_id:campaignId,brand_user_id:campaign.brand_user_id,community_id:communityId,gross_amount:amounts.grossAmount,platform_fee_amount:amounts.platformFeeAmount,admin_payout_amount:amounts.adminPayoutAmount,status:'pending',provider:'razorpay',razorpay_payment_id:paymentId }).select('*').single();
    if (insertError) throw new Error(insertError.message);

    try {
      const transfer = await createTransfer(paymentId,payout.razorpay_linked_account_id,amounts.adminPayoutAmount,{campaign_id:campaignId,community_id:communityId,transaction_id:transaction.id});
      const transferRows = Array.isArray(transfer.transfers) ? transfer.transfers : [];
      const transferId = typeof transferRows[0]?.id === 'string' ? transferRows[0].id : null;
      await db.from('transactions').update({ status:'completed', razorpay_transfer_id:transferId, completed_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',transaction.id);
      return NextResponse.json({ ok:true,testMode:true,transactionId:transaction.id,transferId,grossAmount:amounts.grossAmount,platformFeeAmount:amounts.platformFeeAmount,adminPayoutAmount:amounts.adminPayoutAmount });
    } catch (transferError) {
      const reason = transferError instanceof Error ? transferError.message : 'Transfer failed.';
      await db.from('transactions').update({ status:'failed', failure_reason:reason, updated_at:new Date().toISOString() }).eq('id',transaction.id);
      throw new Error(reason);
    }
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error?error.message:'Unable to create payout transfer.' }, { status:502 });
  }
}
