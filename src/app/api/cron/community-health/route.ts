import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/notifications/email";
import { resolveCommunityPreview, storeRemoteCommunityImage } from "@/features/community-monitor/resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILURE_THRESHOLD = 3;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function ownerEmail(userId: string | null) {
  if (!userId) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function audit(communityId: string, action: "health_updated" | "auto_archived", note: string) {
  const adminUserId = process.env.ADMIN_USER_ID?.trim();
  if (!adminUserId || !/^[0-9a-f-]{36}$/i.test(adminUserId)) return;
  await createAdminSupabaseClient().from("admin_audit_log").insert({
    action,
    admin_user_id: adminUserId,
    community_id: communityId,
    note,
  });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: communities, error } = await admin
    .from("communities")
    .select("id, slug, name, invite_url, image_path, owner_user_id, member_count, verification_status, health_status, health_failure_count, last_remote_name, last_remote_member_count, last_remote_image_hash")
    .eq("status", "published")
    .eq("auto_monitor_enabled", true)
    .limit(500);
  if (error) return NextResponse.json({ error: "Unable to load communities for health check." }, { status: 500 });

  const results = { checked: 0, healthy: 0, changed: 0, archived: 0, failed: 0 };
  for (const community of communities ?? []) {
    results.checked += 1;
    const preview = await resolveCommunityPreview(community.invite_url);
    const hasSignal = Boolean(preview.name || preview.memberCount !== null || preview.imageUrl);
    if (!hasSignal) {
      results.failed += 1;
      const failures = (community.health_failure_count ?? 0) + 1;
      const shouldArchive = failures >= FAILURE_THRESHOLD;
      const update = {
        health_status: shouldArchive ? "inactive" : "needs_recheck",
        health_last_checked_at: new Date().toISOString(),
        health_failure_count: failures,
        last_health_error: "Instagram invite could not be verified publicly.",
        verification_status: shouldArchive ? "broken" : community.verification_status,
        ...(shouldArchive ? { status: "archived", archived_at: new Date().toISOString(), archived_by: process.env.ADMIN_USER_ID ?? null, published_at: null } : {}),
      };
      await admin.from("communities").update(update).eq("id", community.id);
      await audit(community.id, shouldArchive ? "auto_archived" : "health_updated", shouldArchive ? "Archived after three consecutive failed public invite checks." : `Health check failed (${failures}/${FAILURE_THRESHOLD}).`);
      if (shouldArchive) {
        results.archived += 1;
        await sendAdminNotification({ type: "health_alert", to: await ownerEmail(community.owner_user_id), communityName: community.name, note: "The Instagram invite could not be verified after three consecutive checks, so the listing was archived automatically." });
      }
      continue;
    }

    let changed = false;
    const update: Record<string, unknown> = {
      health_status: "healthy",
      health_last_checked_at: new Date().toISOString(),
      health_failure_count: 0,
      last_health_error: null,
      verification_status: "verified",
      last_remote_name: preview.name ?? community.last_remote_name,
      last_remote_member_count: preview.memberCount ?? community.last_remote_member_count,
    };
    if (preview.name && preview.name !== community.name) { update.name = preview.name; changed = true; }
    if (typeof preview.memberCount === "number" && preview.memberCount !== community.member_count) { update.member_count = preview.memberCount; changed = true; }

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
              if (storedPath) { update.image_path = storedPath; changed = true; }
            }
          }
        }
      } catch { /* keep the successful text/member health result */ }
    }

    await admin.from("communities").update(update).eq("id", community.id);
    if (changed) {
      results.changed += 1;
      await audit(community.id, "health_updated", "Automatic health check updated public community metadata.");
    } else results.healthy += 1;
  }

  return NextResponse.json({ ok: true, ...results });
}
