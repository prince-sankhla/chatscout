import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get('x-razorpay-signature'))) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  const event = typeof payload?.event === 'string' ? payload.event : '';
  const transferEntity = payload?.payload?.transfer?.entity;
  const paymentEntity = payload?.payload?.payment?.entity;
  const transferId = typeof transferEntity?.id === 'string' ? transferEntity.id : null;
  const paymentId = typeof paymentEntity?.id === 'string' ? paymentEntity.id : null;
  if (!transferId && !paymentId) return NextResponse.json({ ok: true, ignored: true });

  const db = createAdminSupabaseClient() as any;
  let query = db.from('transactions').select('id,status').limit(1);
  if (transferId) query = query.eq('razorpay_transfer_id', transferId);
  else query = query.eq('razorpay_payment_id', paymentId);
  const { data: transaction } = await query.maybeSingle();
  if (!transaction) return NextResponse.json({ ok: true, unmatched: true });

  let status: 'pending'|'completed'|'failed'|'refunded'|null = null;
  if (event === 'transfer.processed' || event === 'settlement.processed') status = 'completed';
  else if (event === 'transfer.failed') status = 'failed';
  else if (event === 'transfer.reversed') status = 'refunded';
  if (!status) return NextResponse.json({ ok: true, ignored: true, event });

  await db.from('transactions').update({ status, razorpay_transfer_id: transferId ?? undefined, failure_reason: status === 'failed' ? 'Razorpay transfer.failed webhook' : null, completed_at: status === 'completed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', transaction.id);
  return NextResponse.json({ ok: true, transactionId: transaction.id, status });
}
