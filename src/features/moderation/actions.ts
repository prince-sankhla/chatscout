"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendAdminNotification, type AdminNotificationType } from "@/lib/notifications/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";
import { isSubmissionImagePath, removeCommunityImage, storedSubmissionImageExists } from "@/lib/supabase/community-images";
import type { AdminAuditAction, CommunityStatus } from "@/types/database";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function categorySlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function communitySlug(name: string, submissionId: string) {
  const base = categorySlug(name) || "community";
  return `${base}-${submissionId.slice(0, 8)}`;
}

function textValue(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalTextValue(formData: FormData, key: string, max = 500) {
  return textValue(formData, key, max) || null;
}

function notesValue(formData: FormData) {
  return optionalTextValue(formData, "reviewNotes", 2_000);
}

function uuidValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && uuidPattern.test(value) ? value : null;
}

function memberCountValue(formData: FormData) {
  const raw = optionalTextValue(formData, "memberCount", 12);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= 10_000_000 ? value : undefined;
}

async function audit(input: {
  action: AdminAuditAction;
  adminUserId: string;
  communityId?: string | null;
  submissionId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("admin_audit_log").insert({
    action: input.action,
    admin_user_id: input.adminUserId,
    community_id: input.communityId ?? null,
    submission_id: input.submissionId ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    note: input.note ?? null,
  });
}

async function submitterEmail(userId: string | null) {
  if (!userId) return null;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  return error ? null : data.user?.email ?? null;
}

async function notifySubmitter(input: {
  type: AdminNotificationType;
  submitterUserId: string | null;
  communityName: string;
  note?: string | null;
  slug?: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null;
  await sendAdminNotification({
    type: input.type,
    to: await submitterEmail(input.submitterUserId),
    communityName: input.communityName,
    note: input.note,
    link: appUrl && input.slug ? `${appUrl}/community/${input.slug}` : appUrl,
  });
}

function revalidateCommunity(slug: string | null | undefined) {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/categories");
  revalidatePath("/trending");
  revalidatePath("/new");
  if (slug) {
    revalidatePath(`/community/${slug}`);
    revalidatePath(`/join/${slug}`);
  }
  revalidatePath("/admin");
}

async function upsertCategoryLink(communityId: string, categoryName: string) {
  const supabase = createAdminSupabaseClient();
  const slug = categorySlug(categoryName);
  if (!slug) return false;
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .upsert({ name: categoryName, slug, is_active: true }, { onConflict: "slug" })
    .select("id")
    .single();
  if (categoryError) return false;
  await supabase.from("community_categories").delete().eq("community_id", communityId);
  const { error: linkError } = await supabase
    .from("community_categories")
    .upsert({ community_id: communityId, category_id: category.id }, { onConflict: "community_id,category_id" });
  return !linkError;
}

export async function rejectSubmission(formData: FormData) {
  const user = await requireAdminUser();
  const submissionId = uuidValue(formData, "submissionId");
  if (!submissionId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const note = notesValue(formData);
  const { data: submission, error } = await supabase
    .from("submissions")
    .update({ status: "rejected", review_notes: note, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error || !submission) redirect("/admin?status=failed");
  await removeCommunityImage(submission.image_path);
  await audit({ action: "rejected", adminUserId: user.id, submissionId, previousStatus: "pending", newStatus: "rejected", note });
  await notifySubmitter({ type: "rejected", submitterUserId: submission.submitter_user_id, communityName: submission.community_name, note });
  revalidateCommunity(null);
  redirect("/admin?status=rejected");
}

export async function requestChangesSubmission(formData: FormData) {
  const user = await requireAdminUser();
  const submissionId = uuidValue(formData, "submissionId");
  if (!submissionId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const note = notesValue(formData);
  const { data: submission, error } = await supabase
    .from("submissions")
    .update({ status: "needs_changes", review_notes: note, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error || !submission) redirect("/admin?status=failed");
  await audit({ action: "requested_changes", adminUserId: user.id, submissionId, previousStatus: "pending", newStatus: "needs_changes", note });
  await notifySubmitter({ type: "requested_changes", submitterUserId: submission.submitter_user_id, communityName: submission.community_name, note });
  revalidateCommunity(null);
  redirect("/admin?status=changes-requested");
}

export async function approveSubmission(formData: FormData) {
  const user = await requireAdminUser();
  const submissionId = uuidValue(formData, "submissionId");
  if (!submissionId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const note = notesValue(formData);
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("status", "pending")
    .maybeSingle();
  if (submissionError || !submission || !submission.category) redirect("/admin?status=failed");

  const category = submission.category.trim();
  if (!categorySlug(category)) redirect("/admin?status=failed");
  const { data: existingCommunity, error: existingError } = await supabase
    .from("communities")
    .select("id, slug, image_path")
    .eq("invite_url", submission.invite_url)
    .limit(1)
    .maybeSingle();
  if (existingError) redirect("/admin?status=failed");

  const communityValues = {
    name: submission.community_name,
    invite_url: submission.invite_url,
    description: submission.description,
    community_rules: submission.community_rules,
    age_restriction: submission.age_restriction,
    eligibility: submission.eligibility,
    restrictions: submission.restrictions,
    language: submission.language,
    region: submission.region,
    member_count: submission.approximate_member_count,
    image_path: submission.image_path ?? existingCommunity?.image_path ?? null,
    status: "published" as const,
    join_enabled: true,
    owner_user_id: submission.submitter_user_id,
    source_submission_id: submission.id,
    published_at: new Date().toISOString(),
    archived_at: null,
    archived_by: null,
  };
  const { data: community, error: communityError } = existingCommunity
    ? await supabase.from("communities").update(communityValues).eq("id", existingCommunity.id).select("id, slug").single()
    : await supabase.from("communities").insert({ ...communityValues, slug: communitySlug(submission.community_name, submission.id) }).select("id, slug").single();
  if (communityError) redirect("/admin?status=failed");
  if (!await upsertCategoryLink(community.id, category)) redirect("/admin?status=failed");

  const { error: reviewError } = await supabase
    .from("submissions")
    .update({ status: "approved", review_notes: note, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", submission.id)
    .eq("status", "pending");
  if (reviewError) {
    await supabase.from("communities").update({ status: "draft", published_at: null }).eq("id", community.id);
    redirect("/admin?status=failed");
  }

  await audit({ action: "approved", adminUserId: user.id, communityId: community.id, submissionId: submission.id, previousStatus: "pending", newStatus: "published", note });
  await notifySubmitter({ type: "approved", submitterUserId: submission.submitter_user_id, communityName: submission.community_name, note, slug: community.slug });
  revalidateCommunity(community.slug);
  redirect("/admin?status=approved");
}

export async function updateCommunity(formData: FormData) {
  const user = await requireAdminUser();
  const communityId = uuidValue(formData, "communityId");
  if (!communityId) redirect("/admin?status=invalid");
  const memberCount = memberCountValue(formData);
  if (memberCount === undefined) redirect("/admin?status=invalid");
  const name = textValue(formData, "name", 120);
  const description = textValue(formData, "description", 2_000);
  const category = textValue(formData, "category", 80);
  if (!name || description.length < 20 || !category) redirect("/admin?status=invalid");

  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (currentError || !current) redirect("/admin?status=failed");

  const removeImage = formData.get("removeImage") === "on";
  const newImagePath = optionalTextValue(formData, "imagePath", 250);
  let imagePath = current.image_path;
  if (newImagePath) {
    if (!isSubmissionImagePath(newImagePath, user.id) || !await storedSubmissionImageExists(newImagePath)) redirect("/admin?status=invalid-image");
    imagePath = newImagePath;
  } else if (removeImage) {
    imagePath = null;
  }

  const { error } = await supabase.from("communities").update({
    name,
    description,
    community_rules: optionalTextValue(formData, "communityRules", 2_000),
    age_restriction: optionalTextValue(formData, "ageRestriction", 120),
    eligibility: optionalTextValue(formData, "eligibility", 500),
    restrictions: optionalTextValue(formData, "restrictions", 1_000),
    language: optionalTextValue(formData, "language", 80),
    region: optionalTextValue(formData, "region", 120),
    member_count: memberCount,
    image_path: imagePath,
  }).eq("id", communityId);
  if (error) redirect("/admin?status=failed");
  if (!await upsertCategoryLink(communityId, category)) redirect("/admin?status=failed");
  if (current.image_path && current.image_path !== imagePath) await removeCommunityImage(current.image_path);
  await audit({ action: "edited", adminUserId: user.id, communityId, previousStatus: current.status, newStatus: current.status, note: notesValue(formData) });
  revalidateCommunity(current.slug);
  redirect("/admin?status=updated");
}

async function updateCommunityStatus(formData: FormData, status: CommunityStatus, action: AdminAuditAction, notificationType: AdminNotificationType) {
  const user = await requireAdminUser();
  const communityId = uuidValue(formData, "communityId");
  if (!communityId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const note = notesValue(formData);
  const { data: current, error: currentError } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (currentError || !current) redirect("/admin?status=failed");
  const update = status === "archived"
    ? { status, published_at: null, archived_at: new Date().toISOString(), archived_by: user.id }
    : status === "published"
      ? { status, published_at: current.published_at ?? new Date().toISOString(), archived_at: null, archived_by: null }
      : { status, published_at: null, archived_at: null, archived_by: null };
  const { error } = await supabase.from("communities").update(update).eq("id", communityId);
  if (error) redirect("/admin?status=failed");
  await audit({ action, adminUserId: user.id, communityId, previousStatus: current.status, newStatus: status, note });
  await notifySubmitter({ type: notificationType, submitterUserId: current.owner_user_id, communityName: current.name, note, slug: status === "published" ? current.slug : null });
  revalidateCommunity(current.slug);
  redirect(`/admin?status=${action}`);
}

export async function unpublishCommunity(formData: FormData) {
  await updateCommunityStatus(formData, "draft", "unpublished", "unpublished");
}

export async function archiveCommunity(formData: FormData) {
  await updateCommunityStatus(formData, "archived", "archived", "archived");
}

export async function restoreCommunity(formData: FormData) {
  await updateCommunityStatus(formData, "published", "restored", "restored");
}

export async function setCommunityJoinEnabled(formData: FormData) {
  const user = await requireAdminUser();
  const communityId = uuidValue(formData, "communityId");
  const enabled = formData.get("enabled") === "true";
  if (!communityId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (currentError || !current) redirect("/admin?status=failed");
  const { error } = await supabase.from("communities").update({ join_enabled: enabled }).eq("id", communityId);
  if (error) redirect("/admin?status=failed");
  await audit({
    action: enabled ? "join_enabled" : "join_disabled",
    adminUserId: user.id,
    communityId,
    previousStatus: String(current.join_enabled),
    newStatus: String(enabled),
    note: notesValue(formData),
  });
  revalidateCommunity(current.slug);
  redirect(`/admin?status=${enabled ? "join-enabled" : "join-disabled"}`);
}

export async function deleteCommunity(formData: FormData) {
  const user = await requireAdminUser();
  const communityId = uuidValue(formData, "communityId");
  if (!communityId || textValue(formData, "confirmDelete", 20) !== "DELETE") redirect("/admin?status=confirm-delete");
  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (currentError || !current) redirect("/admin?status=failed");
  await audit({ action: "deleted", adminUserId: user.id, communityId, previousStatus: current.status, newStatus: "deleted", note: notesValue(formData) });
  await supabase.from("community_categories").delete().eq("community_id", communityId);
  await supabase.from("reports").delete().eq("community_id", communityId);
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) redirect("/admin?status=failed");
  await removeCommunityImage(current.image_path);
  revalidateCommunity(current.slug);
  redirect("/admin?status=deleted");
}
