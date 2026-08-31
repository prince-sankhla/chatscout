"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function textValue(formData: FormData, name: string, max: number, required = false) {
  const raw = formData.get(name);
  const value = typeof raw === "string" ? raw.trim() : "";
  if ((required && !value) || value.length > max) return null;
  return value || null;
}

export async function requestCommunityUpdate(formData: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/submit/login?error=auth");

  const communityId = textValue(formData, "communityId", 80, true);
  if (!communityId) redirect("/dashboard?update=invalid");

  const supabase = createAdminSupabaseClient() as any;
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!community) redirect("/dashboard?update=not-found");

  const memberCountRaw = textValue(formData, "memberCount", 12);
  const memberCount = memberCountRaw === null ? null : Number(memberCountRaw);
  if (memberCountRaw !== null && (!Number.isInteger(memberCount) || memberCount < 0)) redirect(`/dashboard/request-update?id=${encodeURIComponent(communityId)}&error=members`);

  const payload = {
    name: textValue(formData, "name", 120, true),
    description: textValue(formData, "description", 2000, true),
    invite_url: textValue(formData, "inviteUrl", 1000, true),
    category: textValue(formData, "category", 120),
    language: textValue(formData, "language", 80),
    region: textValue(formData, "region", 120),
    member_count: memberCount,
    community_rules: textValue(formData, "communityRules", 2000),
    age_restriction: textValue(formData, "ageRestriction", 120),
    eligibility: textValue(formData, "eligibility", 500),
    restrictions: textValue(formData, "restrictions", 1000),
  };

  if (!payload.name || !payload.description || !payload.invite_url) redirect(`/dashboard/request-update?id=${encodeURIComponent(communityId)}&error=required`);

  const { error } = await supabase.from("owner_update_requests").insert({
    community_id: communityId,
    owner_user_id: user.id,
    payload,
  });
  if (error) redirect(`/dashboard/request-update?id=${encodeURIComponent(communityId)}&error=database`);

  redirect("/dashboard?update=requested");
}

export async function markOwnerNotificationRead(formData: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return;
  const id = textValue(formData, "id", 80, true);
  if (!id) return;
  const supabase = createAdminSupabaseClient() as any;
  await supabase.from("owner_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
}
