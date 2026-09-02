"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { isAuthorizedAdmin } from "@/lib/supabase/admin-authorization";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

function text(formData: FormData, key: string, max: number, required = false) { const raw = formData.get(key); const value = typeof raw === "string" ? raw.trim() : ""; if ((required && !value) || value.length > max) return null; return value || null; }

export async function updateClaimedCommunity(formData: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/submit/login?error=auth");
  const slug = text(formData, "slug", 160, true), communityId = text(formData, "communityId", 80, true);
  if (!slug || !communityId) redirect("/");
  const supabase = createAdminSupabaseClient();
  const { data: community } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (!community || (community.owner_user_id !== user.id && !isAuthorizedAdmin(user.id))) redirect(`/community/${encodeURIComponent(slug)}`);
  const name = text(formData, "name", 120, true), description = text(formData, "description", 2000, true), inviteUrl = text(formData, "inviteUrl", 1000, true);
  if (!name || !description || !inviteUrl) redirect(`/community/${encodeURIComponent(slug)}/edit?error=required`);
  const payload = { name, description, invite_url: inviteUrl, community_rules: text(formData, "communityRules", 2000), eligibility: text(formData, "eligibility", 500), restrictions: text(formData, "restrictions", 1000), age_restriction: text(formData, "ageRestriction", 120), language: text(formData, "language", 80), region: text(formData, "region", 120), updated_at: new Date().toISOString() };
  let imagePath = community.image_path;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) redirect(`/community/${encodeURIComponent(slug)}/edit?error=image`);
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[file.type];
    const path = `submissions/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) redirect(`/community/${encodeURIComponent(slug)}/edit?error=image`);
    imagePath = path;
  }
  const { error } = await supabase.from("communities").update({ ...payload, image_path: imagePath }).eq("id", communityId);
  if (error) redirect(`/community/${encodeURIComponent(slug)}/edit?error=database`);
  const categoryId = text(formData, "categoryId", 80);
  await supabase.from("community_categories").delete().eq("community_id", communityId);
  if (categoryId) await supabase.from("community_categories").insert({ community_id: communityId, category_id: categoryId });
  await supabase.from("admin_audit_log").insert({ action: "edited", admin_user_id: user.id, community_id: communityId, note: `Community listing edited by authenticated owner/admin ${user.id}` });
  redirect(`/community/${encodeURIComponent(slug)}/edit?saved=1`);
}
