"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";

function text(form: FormData, key: string, fallback = "") { return String(form.get(key) ?? fallback).trim(); }
function list(form: FormData, key: string) { return text(form, key).split(",").map(v => v.trim()).filter(Boolean); }
function num(v: string) { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null; }
function money(v: string) { if (!v) return null; const n = Number(v); return Number.isFinite(n) ? Math.max(0, n) : null; }

export async function saveBrandProfile(form: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/submit/login?error=auth');
  const db = createAdminSupabaseClient() as any;
  await db.from('brand_profiles').upsert({
    user_id: user.id,
    company_name: text(form, 'companyName'),
    slug: text(form, 'slug') || null,
    logo_url: text(form, 'logoUrl') || null,
    website: text(form, 'website') || null,
    description: text(form, 'description') || null,
    industry: text(form, 'industry') || null,
    contact_email: text(form, 'contactEmail') || user.email || null,
    contact_name: text(form, 'contactName') || null,
    verification_status: 'pending',
  }, { onConflict: 'user_id' });
  revalidatePath('/brand'); revalidatePath('/brand/settings');
  redirect('/brand');
}

export async function saveCampaign(form: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/brand/onboarding');
  const db = createAdminSupabaseClient() as any;
  const id = text(form, 'id');
  const payload = {
    brand_user_id: user.id,
    title: text(form, 'title'),
    description: text(form, 'description'),
    objective: text(form, 'objective'),
    category_id: text(form, 'categoryId') || null,
    target_platforms: list(form, 'platforms'),
    target_languages: list(form, 'languages'),
    target_regions: list(form, 'regions'),
    min_member_count: num(text(form, 'minMembers')),
    max_member_count: num(text(form, 'maxMembers')),
    require_verified: form.get('requireVerified') === 'on',
    require_healthy: form.get('requireHealthy') === 'on',
    total_budget: money(text(form, 'budget')) ?? 0,
    reward_per_community: money(text(form, 'rewardPerCommunity')),
    reward_min: money(text(form, 'rewardMin')),
    reward_max: money(text(form, 'rewardMax')),
    reward_model: text(form, 'rewardModel', 'fixed'),
    starts_at: text(form, 'startsAt') || null,
    ends_at: text(form, 'endsAt') || null,
    application_deadline: text(form, 'deadline') || null,
    requirements: text(form, 'requirements') || null,
    deliverables_description: text(form, 'deliverables') || null,
  };
  if (id) await db.from('campaigns').update(payload).eq('id', id).eq('brand_user_id', user.id);
  else await db.from('campaigns').insert(payload);
  revalidatePath('/brand'); revalidatePath('/brand/campaigns'); revalidatePath('/brand/communities');
  redirect('/brand/campaigns');
}

export async function submitCampaign(form: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/brand/onboarding');
  const db = createAdminSupabaseClient() as any;
  const { error } = await db.rpc('change_campaign_status', { p_campaign_id: text(form, 'campaignId'), p_status: 'pending_review' });
  if (error) throw new Error(error.message);
  revalidatePath('/brand/campaigns');
  redirect('/brand/campaigns');
}

export async function applyToCampaign(form: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/submit/login?error=auth');
  const db = createAdminSupabaseClient() as any;
  const communityId = text(form, 'communityId');
  const campaignId = text(form, 'campaignId');
  const note = text(form, 'note') || null;
  const { data: adminRow } = await db.from('community_admins').select('community_id').eq('community_id', communityId).eq('user_id', user.id).maybeSingle();
  if (!adminRow) throw new Error('You do not manage this community.');
  const { data: campaign } = await db.from('campaigns').select('id,status,application_deadline').eq('id', campaignId).maybeSingle();
  if (!campaign || campaign.status !== 'active' || (campaign.application_deadline && new Date(campaign.application_deadline) < new Date())) throw new Error('This campaign is not accepting applications.');
  const { error } = await db.from('campaign_applications').upsert({ campaign_id: campaignId, community_id: communityId, admin_user_id: user.id, application_note: note, status: 'pending' }, { onConflict: 'campaign_id,community_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/rewards'); revalidatePath('/dashboard'); revalidatePath(`/campaign/${campaignId}`);
}

export async function reviewApplication(form: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/brand/onboarding');
  const db = createAdminSupabaseClient() as any;
  const applicationId = text(form, 'applicationId');
  const status = text(form, 'status');
  if (!['approved','rejected','shortlisted'].includes(status)) throw new Error('Invalid application status.');
  const { error } = status === 'approved'
    ? await db.rpc('approve_campaign_application', { p_application_id: applicationId })
    : await db.from('campaign_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', applicationId).in('campaign_id', (await db.from('campaigns').select('id').eq('brand_user_id', user.id)).data?.map((r:any)=>r.id) ?? []);
  if (error) throw new Error(error.message);
  revalidatePath('/brand/applications'); revalidatePath('/dashboard/rewards');
}

export async function controllerCampaignAction(form: FormData) {
  const user = await requireAdminUser();
  const db = createAdminSupabaseClient() as any;
  const id = text(form, 'campaignId'); const status = text(form, 'status');
  if (!['active','paused','completed','cancelled'].includes(status)) throw new Error('Invalid campaign action.');
  await db.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  void user;
  revalidatePath('/admin/campaigns'); revalidatePath('/brand/campaigns');
}
