"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";
import { removeCommunityImage } from "@/lib/supabase/community-images";

function categorySlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function communitySlug(name: string, submissionId: string) {
  const base = categorySlug(name) || "community";
  return `${base}-${submissionId.slice(0, 8)}`;
}

function notesValue(formData: FormData) {
  const value = formData.get("reviewNotes");
  return typeof value === "string" ? value.trim().slice(0, 2_000) || null : null;
}

function submissionIdValue(formData: FormData) {
  const value = formData.get("submissionId");
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function rejectSubmission(formData: FormData) {
  const user = await requireAdminUser();
  const submissionId = submissionIdValue(formData);
  if (!submissionId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const { data: submission, error } = await supabase
    .from("submissions")
    .update({ status: "rejected", review_notes: notesValue(formData), reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("image_path")
    .maybeSingle();
  if (error || !submission) redirect("/admin?status=failed");
  await removeCommunityImage(submission.image_path);
  revalidatePath("/admin");
  redirect("/admin?status=rejected");
}

export async function approveSubmission(formData: FormData) {
  const user = await requireAdminUser();
  const submissionId = submissionIdValue(formData);
  if (!submissionId) redirect("/admin?status=invalid");
  const supabase = createAdminSupabaseClient();
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("status", "pending")
    .maybeSingle();
  if (submissionError || !submission || !submission.category) redirect("/admin?status=failed");

  const slug = categorySlug(submission.category);
  if (!slug) redirect("/admin?status=failed");
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .upsert({ name: submission.category, slug, is_active: true }, { onConflict: "slug" })
    .select("id")
    .single();
  if (categoryError) redirect("/admin?status=failed");

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
    language: submission.language,
    region: submission.region,
    member_count: submission.approximate_member_count,
    image_path: submission.image_path ?? existingCommunity?.image_path ?? null,
    status: "draft" as const,
  };
  const { data: community, error: communityError } = existingCommunity
    ? await supabase.from("communities").update(communityValues).eq("id", existingCommunity.id).select("id, slug").single()
    : await supabase.from("communities").insert({ ...communityValues, slug: communitySlug(submission.community_name, submission.id) }).select("id, slug").single();
  if (communityError) redirect("/admin?status=failed");

  const { error: linkError } = await supabase
    .from("community_categories")
    .upsert({ community_id: community.id, category_id: category.id }, { onConflict: "community_id,category_id" });
  if (linkError) redirect("/admin?status=failed");

  const { error: publishError } = await supabase
    .from("communities")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", community.id);
  if (publishError) redirect("/admin?status=failed");

  const { error: reviewError } = await supabase
    .from("submissions")
    .update({ status: "approved", review_notes: notesValue(formData), reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", submission.id)
    .eq("status", "pending");
  if (reviewError) {
    await supabase.from("communities").update({ status: "draft", published_at: null }).eq("id", community.id);
    redirect("/admin?status=failed");
  }

  revalidatePath("/");
  revalidatePath(`/community/${community.slug}`);
  revalidatePath("/admin");
  redirect("/admin?status=approved");
}
