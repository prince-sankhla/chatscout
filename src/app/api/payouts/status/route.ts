import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { fetchLinkedAccount, isRazorpayTestMode } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const db = createAdminSupabaseClient() as any;
  const { data: account } = await db.from('admin_payout_accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (!account) return NextResponse.json({ configured: false, testMode: isRazorpayTestMode() });
  if (!account.razorpay_linked_account_id) return NextResponse.json({ configured: true, account });

  if (!isRazorpayTestMode()) return NextResponse.json({ configured: true, testMode: false, account });
  try {
    const provider = await fetchLinkedAccount(account.razorpay_linked_account_id);
    const status = typeof provider.status === 'string' ? provider.status : account.provider_status;
    const kycStatus = typeof provider.status === 'string' && provider.status.toLowerCase().includes('suspend') ? 'suspended' : account.kyc_status;
    await db.from('admin_payout_accounts').update({ provider_status: status, kyc_status: kycStatus, last_provider_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id);
    return NextResponse.json({ configured: true, testMode: true, account: { ...account, provider_status: status, kyc_status: kycStatus } });
  } catch {
    return NextResponse.json({ configured: true, testMode: true, account, syncError: true });
  }
}
