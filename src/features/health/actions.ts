"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveCommunityPreview } from "@/features/community-monitor/resolver";
import type { Database } from "@/types/database";

type CommunityUpdate = Database["public"]["Tables"]["communities"]["Update"];

function uuidValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

async function notifyOwner(ownerUserId: string | null, communityName: string, note: string) {
  if (!ownerUserId) return;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.auth.admin.getUserById(ownerUserId);
  await sendAdminNotification({
    type: "health_alert",
    to: data.user?.email ?? null,
    communityName,
    note,
    link: appUrl("/dashboard"),
  });
}

async function audit(communityId: string, note: string) {
  const adminUserId = process.env.ADMIN_USER_ID?.trim();
  if (!adminUserId || !/^[0-9a-f-]{36}$/i.test(adminUserId)) return;
  await createAdminSupabaseClient().from("admin_audit_log").insert({
    action: "health_updated",
    admin_user_id: adminUserId,
    community_id: communityId,
    note,
  });
}

export async function checkCommunityHealthNow(formData: FormData) {
  const controller = await requireAdminUser();
  const communityId = uuidValue(formData, "communityId");
  if (!communityId) redirect("/admin/health?status=invalid");

  const admin = createAdminSupabaseClient();
  const { data: community, error } = await admin.from("communities").select("*").eq("id", communityId).maybeSingle();
  if (error || !community) redirect("/admin/health?status=failed");

  const preview = await resolveCommunityPreview(community.invite_url);
  const hasSignal = Boolean(preview.name || preview.memberCount !== null || preview.imageUrl);
  const now = new Date().toISOString();

  if (!hasSignal) {
    const failureCount = (community.health_failure_count ?? 0) + 1;
    await admin.from("communities").update({
      health_status: "needs_recheck",
      health_last_checked_at: now,
      health_failure_count: failureCount,
      last_health_error: "Instagram invite could not be verified publicly.",
    } satisfies CommunityUpdate).eq("id", communityId);
    await audit(communityId, `Manual health check failed for ${community.name} (${failureCount} consecutive failure${failureCount === 1 ? "" : "s"}).`);
    await notifyOwner(community.owner_user_id, community.name, "A manual health check could not verify the Instagram invite. The listing has been marked for recheck.");
    redirect("/admin/health?status=failed-check");
  }

  const update: CommunityUpdate = {
    health_status: "healthy",
    health_last_checked_at: now,
    health_failure_count: 0,
    last_health_error: null,
    verification_status: community.verification_status,
    last_remote_name: preview.name ?? community.last_remote_name,
    last_remote_member_count: preview.memberCount ?? community.last_remote_member_count,
  };
  const changes: string[] = [];

  // Treat scraper results as observations. Never replace trusted metadata from
  // one scrape; the same differing value must be observed on the prior check.
  if (preview.name && preview.name !== community.name && preview.name === community.last_remote_name) {
    update.name = preview.name;
    changes.push(`name: ${community.name} → ${preview.name}`);
  }
  if (typeof preview.memberCount === "number" && preview.memberCount !== community.member_count && preview.memberCount === community.last_remote_member_count) {
    update.member_count = preview.memberCount;
    changes.push(`members: ${community.member_count ?? "unknown"} → ${preview.memberCount}`);
  }

  // Intentionally never overwrite image_path from a remote scraper.
  // Community images are trusted listing assets and need an explicit update flow.

  const { error: updateError } = await admin.from("communities").update(update).eq("id", communityId);
  if (updateError) redirect("/admin/health?status=failed");

  await audit(communityId, changes.length ? `Manual health check applied only confirmed metadata changes: ${changes.join(", ")}.` : `Manual health check confirmed ${community.name} is healthy; unconfirmed remote metadata was not applied.`);
  if (changes.length) {
    await notifyOwner(community.owner_user_id, community.name, `ChatScout detected confirmed changes: ${changes.join("; ")}.`);
  }
  redirect(`/admin/health?status=${changes.length ? "changed" : "healthy"}`);
}
