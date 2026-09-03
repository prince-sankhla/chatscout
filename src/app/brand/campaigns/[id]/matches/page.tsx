import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { refreshCampaignMatches, inviteSelectedCampaignCommunities } from '@/features/brand/actions';

export default async function CampaignMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const brand = await requireBrand();
  const id = (await params).id;
  const db = createAdminSupabaseClient() as any;
  const { data: campaign } = await db.from('campaigns').select('id,title,status,brand_user_id').eq('id',id).eq('brand_user_id',brand.user.id).maybeSingle();
  if (!campaign) notFound();
  const { data: matches } = await db.from('campaign_community_matches').select('community_id,match_score,admin_response,invited_at,community:communities(id,name,slug,platform,member_count,language,region,verification_status,health_status,image_path)').eq('campaign_id',id).order('match_score',{ascending:false}).order('created_at',{ascending:true}).limit(100);
  const rows = matches ?? [];
  return <main className="page-content"><header className="owner-header"><div><Link href="/brand/campaigns" className="back-link">← Campaigns</Link><p className="eyebrow">AUDIENCE MATCHING</p><h1>{campaign.title}</h1><p>Ranked only from claimed, payout-ready communities. Review the fit and explicitly invite the communities you want.</p></div><form action={refreshCampaignMatches}><input type="hidden" name="campaignId" value={id}/><button className="primary-button" type="submit">Refresh matches</button></form></header>
  <section className="section"><div className="card"><div className="cardBody"><div className="cardTop"><span className="badge">{rows.length} ranked matches</span><span className="badge">{campaign.status}</span></div><p className="meta">Match score weights platform, category, region, language, member constraints, verification, and community health.</p></div></div></section>
  <form action={inviteSelectedCampaignCommunities}><input type="hidden" name="campaignId" value={id}/><section className="section"><div className="grid">{rows.map((m:any)=>{const c=m.community;return <article className="card" key={m.community_id}><div className="cardBody"><div className="cardTop"><span className="badge">Score {Number(m.match_score).toFixed(0)}</span><span className="badge">{m.admin_response==='pending'?(m.invited_at?'Invited':'Not invited'):m.admin_response}</span></div><label style={{display:'flex',gap:10,alignItems:'flex-start'}}><input type="checkbox" name="communityId" value={m.community_id} disabled={Boolean(m.invited_at)} defaultChecked={false}/><span><h3 style={{margin:0}}>{c?.name??'Community'}</h3><p>{c?.platform} · {c?.member_count==null?'Member count unavailable':`${Number(c.member_count).toLocaleString('en-IN')} members`}{c?.region?` · ${c.region}`:''}</p><div className="meta">{c?.language??'Language unavailable'} · {c?.verification_status??'unverified'} · {c?.health_status??'unknown'}</div></span></label></div></article>})}</div></section>{rows.length?<div className="form-actions"><button className="primary-button" type="submit">Invite selected communities</button><Link className="admin-secondary" href="/brand/campaigns">Back</Link></div>:<div className="empty"><h3>No eligible matches yet.</h3><p>Only claimed communities with enabled payouts and verified provider onboarding appear here.</p><form action={refreshCampaignMatches}><input type="hidden" name="campaignId" value={id}/><button className="admin-secondary" type="submit">Run matching again</button></form></div>}</form>
  </main>;
}
