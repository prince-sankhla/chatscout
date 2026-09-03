import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function visitorHash(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

export async function GET(request: Request, { params }: { params: Promise<{ short_code: string }> }) {
  const { short_code } = await params;
  const db = createAdminSupabaseClient() as any;
  const { data: link, error: linkError } = await db
    .from('campaign_links')
    .select('id,campaign_id,community_id,short_code')
    .eq('short_code', short_code)
    .maybeSingle();

  if (linkError || !link) return NextResponse.json({ error: 'Campaign link not found.' }, { status: 404 });

  const { data: clickRow, error: clickError } = await db.rpc('record_campaign_link_click', {
    p_link_id: link.id,
    p_visitor_hash: visitorHash(request),
  });
  if (clickError) return NextResponse.json({ error: 'Unable to record campaign click.' }, { status: 500 });

  const { data: destination } = await db
    .from('campaign_deliverables')
    .select('destination_url')
    .eq('campaign_id', link.campaign_id)
    .not('destination_url', 'is', null)
    .neq('destination_url', '')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  const destinationUrl = String(destination?.destination_url ?? '').trim();
  if (!destinationUrl) {
    return NextResponse.json({
      error: 'Campaign destination is not configured.',
      campaignLinkId: link.id,
      clickCount: clickRow?.click_count ?? null,
    }, { status: 409 });
  }

  try {
    new URL(destinationUrl);
  } catch {
    return NextResponse.json({ error: 'Campaign destination URL is invalid.' }, { status: 409 });
  }

  return NextResponse.redirect(destinationUrl, 302);
}
