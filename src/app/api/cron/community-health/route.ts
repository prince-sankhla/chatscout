import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/notifications/email";
import { resolveCommunityPreview } from "@/features/community-monitor/resolver";
import type { AdminAuditAction, Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILURE_THRESHOLD = 3;
const BATCH_LIMIT = 500;
type CommunityUpdate = Database["public"]["Tables"]["communities"]["Update"];
type HealthAuditAction = Extract<AdminAuditAction, "health_updated" | "auto_archived">;

type HealthChange = {
  nameChanged: boolean;
  memberCountChanged: boolean;
  imageChanged: boolean;
  becameHealthy: boolean;
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null;
}

async function ownerEmail(userId: string | null) {
  if (!userId) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function audit(communityId: string, action: HealthAuditAction, note: string) {
  const adminUserId = process.env.ADMIN_USER_ID?.trim();
  if (!adminUserId || !/^[0-9a-f-]{36}$/i.test(adminUserId)) return;
  await createAdminSupabaseClient().from("admin_audit_log").insert({
    action,
    admin_user_id: adminUserId,
    community_id: communityId,
    note,
  });
}

async function notifyHealthChange(community: { id: string; slug: string; name: string; owner_user_id: string | null }, change: HealthChange, preview: { name: string | null; memberCount: number | null }) {
  const pieces: string[] = [];
  if (change.nameChanged) pieces.push(`name changed to “${preview.name}”`);
  if (change.memberCountChanged) pieces.push(`member count changed to ${preview.memberCount?.toLocaleString("en-IN") ?? "unavailable"}`);
  if (change.becameHealthy) pieces.push("invite link is responding again");
  if (!pieces.length) return;

  const note = `ChatScout detected that ${pieces.join(", ")}.`;
  const link = appUrl() && community.slug ? `${appUrl()}/community/${community.slug}` : null;
  const ownerTo = await ownerEmail(community.owner_user_id);
  if (ownerTo) await sendAdminNotification({ type: "health_alert", to: ownerTo, communityName: community.name, note, link });
  const adminTo = process.env.ADMIN_EMAIL?.trim();
  if (adminTo) await sendAdminNotification({ type: "health_alert", to: adminTo, communityName: community.name, note, link: appUrl() ? `${appUrl()}/admin` : null });
}

function hasStableNameObservation(community: { name: string; last_remote_name: string | null }, detectedName: string | null) {
  return Boolean(detectedName && detectedName !== community.name && detectedName === community.last_remote_name);
}

function hasStableMemberObservation(community: { member_count: number | null; last_remote_member_count: number | null }, detectedMemberCount: number | null) {
  return typeof detectedMemberCount === "number"
    && detectedMemberCount !== community.member_count
    && detectedMemberCount === community.last_remote_member_count;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: communities, error } = await admin
    .from("communities")
    .select("id, slug, name, invite_url, owner_user_id, member_count, verification_status, health_status, health_failure_count, last_remote_name, last_remote_member_count, last_remote_image_hash")
    .eq("status", "published")
    .eq("auto_monitor_enabled", true)
    .order("health_last_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_LIMIT);
  if (error) return NextResponse.json({ error: "Unable to load communities for health check." }, { status: 500 });

  const results = { checked: 0, healthy: 0, changed: 0, recovered: 0, archived: 0, failed: 0, pending: 0 };
  for (const community of communities ?? []) {
    results.checked += 1;
    const preview = await resolveCommunityPreview(community.invite_url);
    const hasSignal = Boolean(preview.name || preview.memberCount !== null || preview.imageUrl);
    if (!hasSignal) {
      results.failed += 1;
      const failures = (community.health_failure_count ?? 0) + 1;
      const shouldArchive = failures >= FAILURE_THRESHOLD;
      const now = new Date().toISOString();
      const update: CommunityUpdate = {
        health_status: shouldArchive ? "inactive" : "needs_recheck",
        health_last_checked_at: now,
        health_failure_count: failures,
        last_health_error: "Instagram invite could not be verified publicly.",
        verification_status: shouldArchive ? "broken" : community.verification_status,
        ...(shouldArchive ? { status: "archived", archived_at: now, archived_by: process.env.ADMIN_USER_ID ?? null, published_at: null } : {}),
      };
      await admin.from("communities").update(update).eq("id", community.id);
      await audit(community.id, shouldArchive ? "auto_archived" : "health_updated", shouldArchive ? "Archived after three consecutive failed public invite checks." : `Health check failed (${failures}/${FAILURE_THRESHOLD}).`);
      if (shouldArchive) {
        results.archived += 1;
        const note = "The Instagram invite could not be verified after three consecutive checks, so the listing was archived automatically.";
        await sendAdminNotification({ type: "health_alert", to: await ownerEmail(community.owner_user_id), communityName: community.name, note, link: appUrl() ? `${appUrl()}/admin` : null });
        const adminEmail = process.env.ADMIN_EMAIL?.trim();
        if (adminEmail) await sendAdminNotification({ type: "health_alert", to: adminEmail, communityName: community.name, note, link: appUrl() ? `${appUrl()}/admin` : null });
      }
      continue;
    }

    const wasUnhealthy = community.health_status !== "healthy";
    const update: CommunityUpdate = {
      health_status: "healthy",
      health_last_checked_at: new Date().toISOString(),
      health_failure_count: 0,
      last_health_error: null,
      verification_status: community.verification_status,
      last_remote_name: preview.name ?? community.last_remote_name,
      last_remote_member_count: preview.memberCount ?? community.last_remote_member_count,
    };
    let nameChanged = false;
    let memberCountChanged = false;

    // Never overwrite trusted listing metadata on a single scrape.
    // The resolver's output is treated as an observation only. A name/member
    // change must be identical on two consecutive observations before it can
    // replace the stored value.
    if (hasStableNameObservation(community, preview.name)) {
      update.name = preview.name!;
      nameChanged = true;
    }
    if (hasStableMemberObservation(community, preview.memberCount)) {
      update.member_count = preview.memberCount!;
      memberCountChanged = true;
    }

    // Intentionally do NOT auto-replace image_path from scraped Instagram data.
    // A remote image can be a generic Instagram/Meta asset or otherwise unrelated
    // to the submitted community. We only retain the observation hash when one is
    // already available from the resolver/previous implementation.

    const changed = nameChanged || memberCountChanged;
    if (!changed && preview.name && preview.name !== community.name && preview.name !== community.last_remote_name) results.pending += 1;
    if (!changed && typeof preview.memberCount === "number" && preview.memberCount !== community.member_count && preview.memberCount !== community.last_remote_member_count) results.pending += 1;

    await admin.from("communities").update(update).eq("id", community.id);
    if (changed || wasUnhealthy) {
      results.changed += changed ? 1 : 0;
      results.recovered += wasUnhealthy ? 1 : 0;
      if (changed) await audit(community.id, "health_updated", "Automatic health check applied a metadata change only after two consecutive matching observations.");
      await notifyHealthChange(community, { nameChanged, memberCountChanged, imageChanged: false, becameHealthy: wasUnhealthy }, { name: preview.name, memberCount: preview.memberCount });
    } else {
      results.healthy += 1;
    }
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), ...results });
}
