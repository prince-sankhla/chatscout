import { notFound } from 'next/navigation';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { AnalyticsView } from '@/features/campaigns/AnalyticsView';

export default async function BrandCampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const brand = await requireBrand();
  const id = (await params).id;
  const db = createAdminSupabaseClient() as any;
  const { data: campaign } = await db.from('campaigns').select('id,title,status,brand_user_id').eq('id',id).eq('brand_user_id',brand.user.id).maybeSingle();
  if (!campaign) notFound();
  const { data: links } = await db.from('campaign_links').select('id,short_code,click_count,unique_click_count,community_id,community:communities(name,member_count)').eq('campaign_id',id).order('created_at',{ascending:false});
  const linkRows = await Promise.all((links ?? []).map(async (l:any) => {
    const { data: match } = await db.from('campaign_community_matches').select('allocated_budget').eq('campaign_id',id).eq('community_id',l.community_id).maybeSingle();
    const { count } = await db.from('campaign_conversions').select('id',{count:'exact',head:true}).eq('campaign_link_id',l.id);
    return {...l, allocated_budget:match?.allocated_budget ?? 0, conversion_count:count ?? 0};
  }));
  return <AnalyticsView campaign={campaign} links={linkRows} backHref={`/brand/campaigns/${encodeURIComponent(id)}/matches`} />;
}
