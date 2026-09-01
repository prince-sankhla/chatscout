import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/notifications/email";
import { resolveCommunityPreview, storeRemoteCommunityImage } from "@/features/community-monitor/resolver";
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
  if (change.imageChanged) pieces.push("community image changed");
  if (change.becameHealthy) pieces.push("invite link is responding again");
  if (!pieces.length) return;

  const note = `ChatScout detected that ${pieces.join(", ")}.`;
  const link = appUrl() && community.slug ? `${appUrl()}/community/${community.slug}` : null;
  const ownerTo = await ownerEmail(community.owner_user_id);
  if (ownerTo) await sendAdminNotification({ type: "health_alert", to: ownerTo, communityName: community.name, note, link });
  const adminTo = process.env.ADMIN_EMAIL?.trim();
  if (adminTo) await sendAdminNotification({ type: "health_alert", to: adminTo, communityName: community.name, note, link: appUrl() ? `${appUrl()}/admin` : null });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: communities, error } = await admin
    .from("communities")
    .select("id, slug, name, invite_url, image_path, owner_user_id, member_count, verification_status, health_status, health_failure_count, last_remote_name, last_remote_member_count, last_remote_image_hash")
    .eq("status", "published")
    .eq("auto_monitor_enabled", true)
    .order("health_last_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_LIMIT);
  if (error) return NextResponse.json({ error: "Unable to load communities for health check." }, { status: 500 });

  const results = { checked: 0, healthy: 0, changed: 0, recovered: 0, archived: 0, failed: 0 };
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
    let nameChanged = false;
    let memberCountChanged = false;
    let imageChanged = false;
    const update: CommunityUpdate = {
      health_status: "healthy",
      health_last_checked_at: new Date().toISOString(),
      health_failure_count: 0,
      last_health_error: null,
      verification_status: "verified",
      last_remote_name: preview.name ?? community.last_remote_name,
      last_remote_member_count: preview.memberCount ?? community.last_remote_member_count,
    };

    if (preview.name && preview.name !== community.name) {
      update.name = preview.name;
      nameChanged = true;
    }
    if (typeof preview.memberCount === "number" && preview.memberCount !== community.member_count) {
      update.member_count = preview.memberCount;
      memberCountChanged = true;
    }

    if (preview.imageUrl) {
      try {
        const response = await fetch(preview.imageUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ChatScoutBot/1.0)" }, cache: "no-store" });
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length > 0 && bytes.length <= 4 * 1024 * 1024) {
            const hash = crypto.createHash("sha256").update(bytes).digest("hex");
            update.last_remote_image_hash = hash;
            update.last_remote_image_checked_at = new Date().toISOString();
            if (hash !== community.last_remote_image_hash) {
              const storedPath = await storeRemoteCommunityImage(preview.imageUrl, community.owner_user_id ?? process.env.ADMIN_USER_ID ?? "");
              if (storedPath) {
                update.image_path = storedPath;
                imageChanged = true;
              }
            }
          }
        }
      } catch {
        // Preserve successful name/member health when image retrieval is temporarily unavailable.
      }
    }

    const changed = nameChanged || memberCountChanged || imageChanged;
    await admin.from("communities").update(update).eq("id", community.id);
    if (changed || wasUnhealthy) {
      results.changed += changed ? 1 : 0;
      results.recovered += wasUnhealthy ? 1 : 0;
      if (changed) await audit(community.id, "health_updated", "Automatic health check updated public community metadata.");
      await notifyHealthChange(community, { nameChanged, memberCountChanged, imageChanged, becameHealthy: wasUnhealthy }, preview);
    } else {
      results.healthy += 1;
    }
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), ...results });
}
