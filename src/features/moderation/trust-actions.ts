"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";
import type { AdminAuditAction, ReportStatus, VerificationStatus } from "@/types/database";

function idValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function textValue(formData: FormData, key: string, max = 1000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function audit(action: AdminAuditAction, adminUserId: string, communityId: string, note: string | null) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("admin_audit_log").insert({ action, admin_user_id: adminUserId, community_id: communityId, note, previous_status: null, new_status: null });
}

export async function updateCommunityVerification(formData: FormData) {
  const user = await requireAdminUser();
  const communityId = idValue(formData, "communityId");
  const status = textValue(formData, "verificationStatus", 30) as VerificationStatus;
  if (!communityId || !["unverified", "needs_review", "verified", "broken"].includes(status)) redirect("/admin/verification?status=invalid");
  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (currentError || !current) redirect("/admin/verification?status=failed");
  const nextVerifiedAt = status === "verified" ? new Date().toISOString() : current.last_verified_at;
  const { error } = await supabase.from("communities").update({ verification_status: status, last_verified_at: nextVerifiedAt }).eq("id", communityId);
  if (error) redirect("/admin/verification?status=failed");
  await audit("verification_updated", user.id, communityId, textValue(formData, "note", 2000) || `Verification changed from ${current.verification_status} to ${status}.`);
  revalidatePath("/admin");
  revalidatePath("/admin/verification");
  revalidatePath(`/community/${current.slug}`);
  redirect("/admin/verification?status=updated");
}

export async function updateReportStatus(formData: FormData) {
  const user = await requireAdminUser();
  const reportId = idValue(formData, "reportId");
  const status = textValue(formData, "status", 20) as ReportStatus;
  if (!reportId || !["open", "resolved", "dismissed"].includes(status)) redirect("/admin/reports?status=invalid");
  const supabase = createAdminSupabaseClient();
  const { data: current, error: currentError } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
  if (currentError || !current) redirect("/admin/reports?status=failed");
  const { error } = await supabase.from("reports").update({ status, resolved_at: status === "open" ? null : new Date().toISOString(), resolved_by: status === "open" ? null : user.id }).eq("id", reportId);
  if (error) redirect("/admin/reports?status=failed");
  await audit(status === "open" ? "edited" : "verification_updated", user.id, current.community_id, textValue(formData, "note", 2000) || `Report ${status}.`);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/reports?status=updated");
}

export async function createCommunityReport(formData: FormData) {
  const communityId = idValue(formData, "communityId");
  const reportType = textValue(formData, "reportType", 30);
  const description = textValue(formData, "description", 2000) || null;
  if (!communityId || !["broken_link", "spam", "scam", "misleading", "other"].includes(reportType)) redirect("/");
  const supabase = createAdminSupabaseClient();
  const { data: community } = await supabase.from("communities").select("id, slug").eq("id", communityId).eq("status", "published").maybeSingle();
  if (!community) redirect("/");
  const { error } = await supabase.from("reports").insert({ community_id: communityId, report_type: reportType, description, status: "open" });
  if (error) redirect(`/community/${community.slug}?report=failed`);
  redirect(`/community/${community.slug}?report=submitted`);
}
