import Link from 'next/link';
import { requireBrand } from '@/lib/brand/authorization';
import { saveCampaign } from '@/features/brand/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { DeliverablesEditor } from '@/components/brand/deliverables-editor';

export default async function NewCampaignPage(){
 await requireBrand();const db=createAdminSupabaseClient() as any;const {data:categories}=await db.from('categories').select('id,name,parent_id').eq('is_active',true).order('display_order',{ascending:true}).order('name');
 return <main className="page-content"><section className="form-panel"><Link href="/brand/campaigns" className="back-link">← Campaigns</Link><p className="eyebrow">CREATE CAMPAIGN</p><h1>Build an executable community campaign.</h1><p className="form-intro">Campaigns start as drafts. Add concrete instructions and at least one deliverable before requesting review.</p><form action={saveCampaign} className="form-grid">
  <label>Campaign name<input required name="title" placeholder="Gaming App Launch"/></label><label>Objective<input required name="objective" placeholder="Drive awareness in gaming communities"/></label>
  <label>Category<select name="categoryId" defaultValue=""><option value="">Any category</option>{categories?.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Platforms<input name="platforms" placeholder="instagram, whatsapp"/></label><label>Languages<input name="languages" placeholder="English, Hindi"/></label><label>Regions<input name="regions" placeholder="India, Rajasthan"/></label>
  <label>Min members<input name="minMembers" type="number" min="0"/></label><label>Max members<input name="maxMembers" type="number" min="0"/></label><label>Total budget (INR)<input required name="budget" type="number" min="0" step="0.01" defaultValue="0"/></label><label>Reward model<select name="rewardModel"><option value="fixed">Fixed</option><option value="range">Range</option><option value="custom">Custom</option></select></label><label>Reward / community<input name="rewardPerCommunity" type="number" min="0" step="0.01"/></label><label>Reward min<input name="rewardMin" type="number" min="0" step="0.01"/></label><label>Reward max<input name="rewardMax" type="number" min="0" step="0.01"/></label>
  <label>Starts<input name="startsAt" type="datetime-local"/></label><label>Ends<input name="endsAt" type="datetime-local"/></label><label>Application deadline<input name="deadline" type="datetime-local"/></label>
  <label className="full">Description<textarea required name="description" rows={5} /></label><label className="full">Campaign instructions<textarea name="instructions" rows={5} placeholder="Use this brief as the top-level execution instruction."/></label><label className="full">Target requirements<textarea name="requirements" rows={4} placeholder="Audience, trust, brand-safety or eligibility requirements."/></label><label className="full">Deliverable overview<textarea name="deliverables" rows={3} placeholder="Optional summary shown to participants."/></label>
  <DeliverablesEditor />
  <label className="check-row"><input name="requireVerified" type="checkbox"/> Require verified communities</label><label className="check-row"><input name="requireHealthy" type="checkbox"/> Require healthy communities</label>
  <div className="form-actions full"><Link className="admin-secondary" href="/brand/campaigns">Cancel</Link><button className="primary-button" type="submit">Save draft</button></div>
 </form></section></main>;
}
