import Link from 'next/link';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

type Props={searchParams:Promise<{campaign?:string}>};
export default async function BrandCommunitiesPage({searchParams}:Props){
  const brand=await requireBrand();const db=createAdminSupabaseClient() as any;const q=await searchParams;
  const {data:campaigns}=await db.from('campaigns').select('id,title,status').eq('brand_user_id',brand.user.id).order('created_at',{ascending:false});
  const selected=q.campaign&&campaigns?.some((c:any)=>c.id===q.campaign)?q.campaign:campaigns?.[0]?.id;const campaign=campaigns?.find((c:any)=>c.id===selected);
  const {data:matches,error}=selected?await db.rpc('find_campaign_matches',{p_campaign_id:selected,p_limit:100}):{data:[],error:null};
  return <main className="page-content"><header className="owner-header"><div><Link href="/brand" className="back-link">← Brand dashboard</Link><p className="eyebrow">DISCOVER COMMUNITIES</p><h1>Recommended communities</h1><p>Real published ChatScout communities ranked by a transparent targeting score.</p></div></header>
    {campaigns?.length?<div className="section-heading"><div><strong>Campaign</strong><div className="meta">{campaign?.title} · {campaign?.status}</div></div><div className="tag-row">{campaigns.map((c:any)=><Link key={c.id} href={`/brand/communities?campaign=${encodeURIComponent(c.id)}`}>{c.title}</Link>)}</div></div>:null}
    {error?<div className="empty"><h3>Unable to calculate matches.</h3><p>{error.message}</p></div>:matches?.length?<section className="section"><div className="grid">{matches.map((c:any)=><article className="card" key={c.community_id}><div className="cardBody"><div className="cardTop"><span className="badge">{c.platform}</span><span className="badge">{Number(c.match_score).toFixed(0)}% match</span></div><h3>{c.name}</h3><div className="meta">{c.member_count?.toLocaleString('en-IN')??'—'} members · {c.language??'Language unavailable'}{c.region?` · ${c.region}`:''}</div><div className="meta">{c.verification_status} · {c.health_status}{c.monetization_eligible?' · Monetization eligible':''}</div><div className="tag-row"><span>{c.category_match?'Category match':'Broader category'}</span><span>Published</span><span>Trust-aware</span></div><div className="cardLinks"><Link className="view" href={`/community/${c.slug}`}>View community →</Link></div></div></article>)}</div></section>:<div className="empty"><h3>{selected?'No communities match this campaign yet.':'Create a campaign first.'}</h3><p>{selected?'Try broader targeting or wait for more eligible communities.':'Community recommendations are calculated against a real campaign.'}</p><Link className="primary-button" href={selected?'/brand/campaigns':'/brand/campaigns/new'}>{selected?'View campaigns':'Create campaign'}</Link></div>}
  </main>;
}
