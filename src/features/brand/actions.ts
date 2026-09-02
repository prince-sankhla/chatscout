"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerAuthClient, requireAdminUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function text(form: FormData, key: string, fallback = "") { return String(form.get(key) ?? fallback).trim(); }
function list(form: FormData, key: string) { return text(form, key).split(",").map(v => v.trim()).filter(Boolean); }
function num(v: string) { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null; }
function money(v: string) { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? Math.max(0, n) : null; }

async function currentUser() { const auth = await createServerAuthClient(); const { data: { user } } = await auth.auth.getUser(); return user; }

export async function saveBrandProfile(form: FormData) {
  const user = await currentUser(); if (!user) redirect('/brand/login');
  const companyName=text(form,'companyName'), description=text(form,'description');
  if (companyName.length<2 || description.length<10) throw new Error('Please provide a valid company name and description.');
  const db=createAdminSupabaseClient() as any;
  const {error}=await db.from('brand_profiles').upsert({user_id:user.id,company_name:companyName,slug:text(form,'slug')||null,logo_url:text(form,'logoUrl')||null,website:text(form,'website')||null,description,industry:text(form,'industry')||null,contact_email:text(form,'contactEmail')||user.email||null,contact_name:text(form,'contactName')||null,verification_status:'pending'},{onConflict:'user_id'});
  if(error) throw new Error(error.message); revalidatePath('/brand');revalidatePath('/brand/settings');redirect('/brand');
}

export async function saveCampaign(form: FormData) {
  const user=await currentUser();if(!user)redirect('/brand/onboarding');
  const title=text(form,'title'),description=text(form,'description'),objective=text(form,'objective');
  if(title.length<3||description.length<10||objective.length<3)throw new Error('Complete the campaign basics before saving.');
  const budget=money(text(form,'budget'))??0,reward=money(text(form,'rewardPerCommunity'));const model=text(form,'rewardModel','fixed');
  if(reward!=null&&reward>budget&&model==='fixed')throw new Error('Reward per community cannot exceed the total budget for a fixed-reward campaign.');
  const db=createAdminSupabaseClient() as any;
  const payload={brand_user_id:user.id,title,description,objective,category_id:text(form,'categoryId')||null,target_platforms:list(form,'platforms'),target_languages:list(form,'languages'),target_regions:list(form,'regions'),min_member_count:num(text(form,'minMembers')),max_member_count:num(text(form,'maxMembers')),require_verified:form.get('requireVerified')==='on',require_healthy:form.get('requireHealthy')==='on',total_budget:budget,reward_per_community:reward,reward_min:money(text(form,'rewardMin')),reward_max:money(text(form,'rewardMax')),reward_model:model,starts_at:text(form,'startsAt')||null,ends_at:text(form,'endsAt')||null,application_deadline:text(form,'deadline')||null,requirements:text(form,'requirements')||null,deliverables_description:text(form,'deliverables')||null};
  const id=text(form,'id');const {error}=id?await db.from('campaigns').update(payload).eq('id',id).eq('brand_user_id',user.id):await db.from('campaigns').insert(payload);if(error)throw new Error(error.message);
  revalidatePath('/brand');revalidatePath('/brand/campaigns');revalidatePath('/brand/communities');redirect('/brand/campaigns');
}

export async function submitCampaign(form: FormData){const user=await currentUser();if(!user)redirect('/brand/login');const db=createAdminSupabaseClient() as any;const {error}=await db.rpc('change_campaign_status',{p_campaign_id:text(form,'campaignId'),p_status:'pending_review'});if(error)throw new Error(error.message);revalidatePath('/brand/campaigns');revalidatePath('/admin/campaigns');}

export async function applyToCampaign(form: FormData){const user=await currentUser();if(!user)redirect('/submit/login?error=auth');const db=createAdminSupabaseClient() as any;const campaignId=text(form,'campaignId'),communityId=text(form,'communityId');const {data:adminRow}=await db.from('community_admins').select('community_id').eq('community_id',communityId).eq('user_id',user.id).maybeSingle();if(!adminRow)throw new Error('You do not manage this community.');const {data:campaign}=await db.from('campaigns').select('id,status,application_deadline').eq('id',campaignId).maybeSingle();if(!campaign||campaign.status!=='active'||(campaign.application_deadline&&new Date(campaign.application_deadline)<new Date()))throw new Error('This campaign is not accepting applications.');const {error}=await db.from('campaign_applications').insert({campaign_id:campaignId,community_id:communityId,admin_user_id:user.id,application_note:text(form,'note')||null,status:'pending'});if(error&&error.code!=='23505')throw new Error(error.message);revalidatePath('/dashboard/rewards');revalidatePath('/dashboard/notifications');}

export async function reviewApplication(form: FormData){const user=await currentUser();if(!user)redirect('/brand/login');const status=text(form,'status');if(!['approved','rejected','shortlisted'].includes(status))throw new Error('Invalid application status.');const db=createAdminSupabaseClient() as any;const {error}=await db.rpc('review_campaign_application',{p_application_id:text(form,'applicationId'),p_status:status});if(error)throw new Error(error.message);revalidatePath('/brand/applications');revalidatePath('/dashboard/rewards');}

export async function controllerCampaignAction(form: FormData){await requireAdminUser();const id=text(form,'campaignId'),status=text(form,'status');if(!['active','paused','completed','cancelled'].includes(status))throw new Error('Invalid campaign action.');const db=createAdminSupabaseClient() as any;const {data:c}=await db.from('campaigns').select('status').eq('id',id).maybeSingle();if(!c)throw new Error('Campaign not found.');const allowed=(c.status==='pending_review'&&['active','cancelled'].includes(status))||(c.status==='active'&&['paused','completed','cancelled'].includes(status))||(c.status==='paused'&&['active','completed','cancelled'].includes(status));if(!allowed)throw new Error('Invalid controller state transition.');const {error}=await db.from('campaigns').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw new Error(error.message);revalidatePath('/admin/campaigns');revalidatePath('/brand/campaigns');}
