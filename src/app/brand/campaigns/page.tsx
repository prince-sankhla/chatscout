import Link from 'next/link';
import { requireBrand } from '@/lib/brand/authorization';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { submitCampaign } from '@/features/brand/actions';

const labels: Record<string,string> = { draft:'Draft', pending_review:'Pending review', active:'Active', paused:'Paused', completed:'Completed', cancelled:'Cancelled' };

export default async function BrandCampaignsPage() {
  const brand = await requireBrand();
  const db = createAdminSupabaseClient() as any;
  const { data: campaigns } = await db.from('campaigns').select('*').eq('brand_user_id', brand.user.id).order('created_at', { ascending: false });
  return <main className="page-content"><header className="owner-header"><div><Link href="/brand" className="back-link">← Brand dashboard</Link><p className="eyebrow">CAMPAIGNS</p><h1>Your campaigns</h1><p>Keep drafts internal, submit complete campaigns for review, and manage live campaign states.</p></div><Link className="primary-button" href="/brand/campaigns/new">Create campaign</Link></header>
    <section className="section"><div className="grid">{campaigns?.map((c:any)=><article className="card" key={c.id}><div className="cardBody"><div className="cardTop"><span className="badge">{labels[c.status] ?? c.status}</span><span className="badge">₹{Number(c.total_budget ?? 0).toLocaleString('en-IN')}</span></div><h3>{c.title}</h3><p>{c.objective}</p><div className="meta">Created {new Date(c.created_at).toLocaleDateString('en-IN')}</div><div className="cardLinks"><Link className="view" href={`/brand/campaigns/${c.id}/edit`}>Edit →</Link>{c.status === 'draft' && <form action={submitCampaign}><input type="hidden" name="campaignId" value={c.id}/><button className="admin-secondary" type="submit">Submit for review</button></form>}<Link className="view" href={`/brand/applications?campaign=${encodeURIComponent(c.id)}`}>Applications →</Link></div></div></article>)}{!campaigns?.length && <div className="empty"><h3>Create your first campaign.</h3><p>There are no campaigns yet. No demo campaigns are inserted.</p><Link className="primary-button" href="/brand/campaigns/new">Create campaign</Link></div>}</div></section>
  </main>;
}
