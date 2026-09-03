import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/notifications/email";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import type { AdminAuditAction, Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILURE_THRESHOLD = 3;
const BATCH_LIMIT = 100;
const CONCURRENCY = 8;
type CommunityUpdate = Database["public"]["Tables"]["communities"]["Update"];
type HealthAuditAction = Extract<AdminAuditAction, "health_updated" | "auto_archived">;

function authorized(request: Request) { const secret = process.env.CRON_SECRET?.trim(); return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`); }
function appUrl() { return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null; }
async function ownerEmail(userId: string | null) { if (!userId) return null; const { data } = await createAdminSupabaseClient().auth.admin.getUserById(userId); return data.user?.email ?? null; }
async function audit(communityId: string, action: HealthAuditAction, note: string) { const adminUserId = process.env.ADMIN_USER_ID?.trim(); if (!adminUserId || !/^\S{36}$/i.test(adminUserId)) return; await createAdminSupabaseClient().from("admin_audit_log").insert({ action, admin_user_id: adminUserId, community_id: communityId, note }); }
async function notifyHealthChange(community: { slug: string; name: string; owner_user_id: string | null }, pieces: string[]) { if (!pieces.length) return; const note = `ChatScout detected that ${pieces.join(", ")}.`; const link = appUrl() && community.slug ? `${appUrl()}/community/${community.slug}` : null; const ownerTo = await ownerEmail(community.owner_user_id); if (ownerTo) await sendAdminNotification({ type: "health_alert", to: ownerTo, communityName: community.name, note, link }); const adminTo = process.env.ADMIN_EMAIL?.trim(); if (adminTo) await sendAdminNotification({ type: "health_alert", to: adminTo, communityName: community.name, note, link: appUrl() ? `${appUrl()}/admin` : null }); }
async function checkOne(community: any) { try { return { community, preview: await resolveRenderedCommunityPreview(community.invite_url), error: null as string | null }; } catch (error) { return { community, preview: { name: null, memberCount: null, imageUrl: null, finalUrl: null }, error: error instanceof Error ? error.message : "Preview resolution failed." }; } }

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: communities, error } = await admin.from("communities")
    .select("id,slug,name,invite_url,platform,owner_user_id,member_count,health_status,health_failure_count,last_remote_name,last_remote_member_count,external_image_url,last_remote_image_checked_at,tags")
    .eq("status", "published").eq("auto_monitor_enabled", true)
    .order("health_last_checked_at", { ascending: true, nullsFirst: true }).limit(BATCH_LIMIT);
  if (error) return NextResponse.json({ error: "Unable to load communities for health check." }, { status: 500 });

  const ordered = [...(communities ?? [])].sort((a, b) => {
    const aPhase1 = a.platform === "whatsapp" && Array.isArray(a.tags) && a.tags.includes("phase1");
    const bPhase1 = b.platform === "whatsapp" && Array.isArray(b.tags) && b.tags.includes("phase1");
    return Number(bPhase1) - Number(aPhase1);
  });
  const results = { checked: 0, healthy: 0, changed: 0, recovered: 0, archived: 0, failed: 0, images: 0, memberCounts: 0, phase1Checked: 0 };

  for (let i = 0; i < ordered.length; i += CONCURRENCY) {
    const checked = await Promise.all(ordered.slice(i, i + CONCURRENCY).map(checkOne));
    for (const { community, preview, error: previewError } of checked) {
      results.checked += 1;
      if (community.platform === "whatsapp" && Array.isArray(community.tags) && community.tags.includes("phase1")) results.phase1Checked += 1;
      const hasSignal = Boolean(preview.name || preview.memberCount !== null || preview.imageUrl);
      if (!hasSignal) {
        results.failed += 1;
        const failures = (community.health_failure_count ?? 0) + 1;
        const now = new Date().toISOString();
        const shouldArchive = failures >= FAILURE_THRESHOLD;
        await admin.from("communities").update({ health_status: shouldArchive ? "inactive" : "needs_recheck", health_last_checked_at: now, health_failure_count: failures, last_health_error: previewError ?? "Community invite could not be verified publicly.", ...(shouldArchive ? { status: "archived", archived_at: now, archived_by: process.env.ADMIN_USER_ID ?? null, published_at: null } : {}) }).eq("id", community.id);
        await audit(community.id, shouldArchive ? "auto_archived" : "health_updated", shouldArchive ? "Archived after three consecutive failed public invite checks." : `Health check failed (${failures}/${FAILURE_THRESHOLD}).`);
        if (shouldArchive) results.archived += 1;
        continue;
      }

      const now = new Date().toISOString();
      const update: CommunityUpdate = { health_status: "healthy", health_last_checked_at: now, health_failure_count: 0, last_health_error: null, last_remote_name: preview.name ?? community.last_remote_name, last_remote_member_count: preview.memberCount ?? community.last_remote_member_count, last_remote_image_checked_at: preview.imageUrl ? now : community.last_remote_image_checked_at, ...(preview.imageUrl ? { external_image_url: preview.imageUrl } : {}) };
      const pieces: string[] = [];
      let changed = false;
      if (preview.name && preview.name !== community.name && preview.name === community.last_remote_name) { update.name = preview.name; changed = true; pieces.push(`name changed to “${preview.name}”`); }
      if (community.member_count === null && typeof preview.memberCount === "number") { update.member_count = preview.memberCount; changed = true; results.memberCounts += 1; pieces.push(`member count set to ${preview.memberCount.toLocaleString("en-IN")}`); }
      else if (typeof preview.memberCount === "number" && preview.memberCount !== community.member_count && preview.memberCount === community.last_remote_member_count) { update.member_count = preview.memberCount; changed = true; results.memberCounts += 1; pieces.push(`member count updated to ${preview.memberCount.toLocaleString("en-IN")}`); }
      if (preview.imageUrl && preview.imageUrl !== community.external_image_url) { changed = true; results.images += 1; pieces.push("group image metadata refreshed"); }
      const wasUnhealthy = community.health_status !== "healthy";
      await admin.from("communities").update(update).eq("id", community.id);
      if (changed) results.changed += 1;
      if (wasUnhealthy) results.recovered += 1;
      if (changed || wasUnhealthy) { await audit(community.id, "health_updated", "Automatic public-preview metadata/health check applied."); await notifyHealthChange(community, pieces.concat(wasUnhealthy ? ["invite link is responding again"] : [])); }
      else results.healthy += 1;
    }
  }
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), ...results });
}
