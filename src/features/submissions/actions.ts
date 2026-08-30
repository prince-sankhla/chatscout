"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { isSubmissionImagePath, removeCommunityImage, storedSubmissionImageExists } from "@/lib/supabase/community-images";

function textValue(formData: FormData, field: string, maxLength: number, required = false) {
  const value = formData.get(field);
  const text = typeof value === "string" ? value.trim() : "";
  if ((required && !text) || text.length > maxLength) return null;
  return text || null;
}

function isInstagramInviteUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "instagram.com" || hostname.endsWith(".instagram.com") || hostname === "ig.me");
  } catch {
    return false;
  }
}

export async function submitCommunity(formData: FormData) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/submit/login?error=auth");

  const communityName = textValue(formData, "communityName", 120, true);
  const inviteUrl = textValue(formData, "inviteUrl", 1_000, true);
  const description = textValue(formData, "description", 2_000, true);
  const categoryName = textValue(formData, "categoryName", 80, true);
  const language = textValue(formData, "language", 80);
  const region = textValue(formData, "region", 120);
  const contact = textValue(formData, "contact", 200);
  const memberCountValue = textValue(formData, "memberCount", 12);
  const memberCount = memberCountValue ? Number(memberCountValue) : null;
  const imagePath = textValue(formData, "imagePath", 200);

  if (!communityName || !inviteUrl || !description || !categoryName) redirect("/submit?error=required");
  if (!isInstagramInviteUrl(inviteUrl)) redirect("/submit?error=url");
  if (memberCount !== null && (!Number.isInteger(memberCount) || memberCount < 0)) redirect("/submit?error=members");
  if (imagePath && (!isSubmissionImagePath(imagePath, user.id) || !(await storedSubmissionImageExists(imagePath)))) {
    redirect("/submit?error=image");
  }

  const submission = {
    community_name: communityName,
    invite_url: inviteUrl,
    description,
    category: categoryName,
    language,
    region,
    approximate_member_count: memberCount,
    submitter_contact: contact,
    submitter_user_id: user.id,
    ...(imagePath ? { image_path: imagePath } : {}),
  };
  const { error } = await supabase.from("submissions").insert(submission);
  if (error) {
    await removeCommunityImage(imagePath);
    redirect("/submit?error=database");
  }
  redirect("/submit?success=1");
}
