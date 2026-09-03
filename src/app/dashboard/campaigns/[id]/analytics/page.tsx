import { notFound, redirect } from 'next/navigation';
import { createServerAuthClient } from '@/lib/supabase/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { AnalyticsView } from '@/features/campaigns/AnalyticsView';

export default async function AdminCampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/submit/login?error=auth');
  const id = (await params).id;
  const db = createAdminSupabaseClient() as any;
  const { data: links } = await db.from('campaign_links').select('id,short_code,click_count,unique_click_count,community_id,community:communities(id,name,member_count)').eq('campaign_id',id);
  const linkRows = await Promise.all((links ?? []).map(async (l:any) => {
    const { data: admin } = await db.from('community_admins').select('id').eq('community_id',l.community_id).eq('user_id',user.id).in('role',['owner','manager']).maybeSingle();
    if (!admin) return null;
    const { data: match } = await db.from('campaign_community_matches').select('allocated_budget,admin_response').eq('campaign_id',id).eq('community_id',l.community_id).eq('admin_response','accepted').maybeSingle();
    const { count } = await db.from('campaign_conversions').select('id',{count:'exact',head:true}).eq('campaign_link_id',l.id);
    return {...l, allocated_budget:match?.allocated_budget ?? 0, conversion_count:count ?? 0};
  }));
  const visible = linkRows.filter(Boolean) as any[];
  if (!visible.length) notFound();
  const { data: campaign } = await db.from('campaigns').select('id,title,status').eq('id',id).maybeSingle();
  if (!campaign) notFound();
  return <AnalyticsView campaign={campaign} links={visible} backHref="/dashboard/rewards" />;
}
