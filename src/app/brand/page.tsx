import Link from 'next/link';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export default async function BrandDashboard() {
  const brand = await requireBrand();
  const db = createAdminSupabaseClient() as any;
  const { data: campaigns } = await db.from('campaigns').select('id,title,status,total_budget,created_at').eq('brand_user_id', brand.user.id).order('created_at', { ascending: false });
  const ids = (campaigns ?? []).map((c:any) => c.id);
  const { data: applications } = ids.length ? await db.from('campaign_applications').select('id,status').in('campaign_id', ids) : { data: [] };
  const selected = applications?.filter((a:any) => a.status === 'approved').length ?? 0;
  return <main className="page-content">
    <header className="owner-header"><div><p className="eyebrow">BRAND WORKSPACE</p><h1>Reach the communities that matter.</h1><p>Create campaigns, discover relevant communities and review applications from one workspace.</p></div><Link className="primary-button" href="/brand/campaigns/new">Create campaign</Link></header>
    <section className="metrics" aria-label="Brand overview"><div><span>Campaigns</span><b>{campaigns?.length ?? 0}</b><small>All campaigns</small></div><div><span>Active</span><b>{campaigns?.filter((c:any)=>c.status==='active').length ?? 0}</b><small>Currently live</small></div><div><span>Applications</span><b>{applications?.length ?? 0}</b><small>Received</small></div><div><span>Selected</span><b>{selected}</b><small>Approved communities</small></div></section>
    <section className="section"><div className="sectionHeading"><div><p className="eyebrow">WORKSPACE</p><h2>Manage your marketplace</h2></div></div><div className="grid">
      <Link className="card" href="/brand/campaigns"><div className="cardBody"><span className="eyebrow">CAMPAIGNS</span><h3>Your campaigns</h3><p>Create, submit, pause and complete campaigns without leaving the brand workspace.</p></div></Link>
      <Link className="card" href="/brand/communities"><div className="cardBody"><span className="eyebrow">DISCOVERY</span><h3>Discover communities</h3><p>Rank real ChatScout communities using platform, audience and trust signals.</p></div></Link>
      <Link className="card" href="/brand/applications"><div className="cardBody"><span className="eyebrow">SELECTION</span><h3>Applications</h3><p>Review applicants and approve the communities that fit your campaign.</p></div></Link>
      <Link className="card" href="/brand/settings"><div className="cardBody"><span className="eyebrow">BRAND</span><h3>Company profile</h3><p>Keep your company details and verification state current.</p></div></Link>
    </div></section>
  </main>;
}
