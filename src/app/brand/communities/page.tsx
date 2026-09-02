import Link from 'next/link';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export default async function BrandCommunitiesPage() {
  const brand = await requireBrand();
  const db = createAdminSupabaseClient() as any;
  const { data: campaigns } = await db.from('campaigns').select('id,title').eq('brand_user_id', brand.user.id).order('created_at', { ascending: false });
  const campaignId = campaigns?.[0]?.id ?? null;
  let communities:any[] = [];
  if (campaignId) {
    const { data } = await db.from('communities').select('id,name,slug,platform,member_count,language,region,verification_status,health_status,status,image_path,community_categories(category_id)').eq('status','published').order('member_count',{ascending:false}).limit(120);
    communities = await Promise.all((data ?? []).map(async (c:any) => {
      const { data: score } = await db.rpc('campaign_match_score',{p_campaign_id:campaignId,p_community_id:c.id});
      return {...c, score:Number(score ?? 0)};
    }));
    communities.sort((a,b)=>b.score-a.score);
  }
  return <main className="page-content"><header className="owner-header"><div><Link href="/brand" className="back-link">← Brand dashboard</Link><p className="eyebrow">DISCOVER COMMUNITIES</p><h1>Recommended communities</h1><p>Ranked from real published ChatScout communities. Matching is deterministic and uses campaign targeting plus trust signals.</p></div></header>
  {!campaignId ? <div className="empty"><h3>Create a campaign first.</h3><p>Community recommendations are calculated against a real campaign.</p><Link className="primary-button" href="/brand/campaigns/new">Create campaign</Link></div> : <section className="section"><div className="grid">{communities.map((c:any)=><article className="card" key={c.id}><div className="cardBody"><div className="cardTop"><span className="badge">{c.platform}</span><span className="badge">{c.score}% match</span></div><h3>{c.name}</h3><div className="meta">{c.member_count?.toLocaleString('en-IN') ?? '—'} members · {c.language ?? 'Language unavailable'}{c.region ? ` · ${c.region}` : ''}</div><div className="meta">{c.verification_status} · {c.health_status}</div><div className="cardLinks"><Link className="view" href={`/community/${c.slug}`}>View community →</Link></div></div></article>)}{!communities.length&&<div className="empty"><h3>No published communities available.</h3><p>No community recommendations can be shown from the current dataset.</p></div>}</div></section>}
  </main>;
}
