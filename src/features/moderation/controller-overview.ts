import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ControllerOverview = {
  totalCommunities: number;
  published: number;
  pending: number;
  rejectedOrChanges: number;
  archived: number;
  totalOwners: number;
  openReports: number;
  communitiesNeedingReview: number;
  brokenOrUnhealthy: number;
  verificationNeedsReview: number;
  verificationUnverified: number;
  healthy: number;
  healthNeedsRecheck: number;
  healthInactive: number;
  healthUnknown: number;
  recentViews: number;
  recentJoinClicks: number;
  recentCtr: number;
};

export async function getControllerOverview(): Promise<ControllerOverview | null> {
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [communities, published, pending, rejectedOrChanges, archived, owners, openReports, verificationNeedsReview, verificationUnverified, healthy, healthNeedsRecheck, healthInactive, healthUnknown, recentViews, recentJoinClicks] = await Promise.all([
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["rejected", "needs_changes"]),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("communities").select("owner_user_id").not("owner_user_id", "is", null).limit(5000),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("verification_status", "needs_review"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("verification_status", "unverified"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("health_status", "healthy"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("health_status", "needs_recheck"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("health_status", "inactive"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published").eq("health_status", "unknown"),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "community_view").gte("occurred_at", since),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "join_click").gte("occurred_at", since),
  ]);
  if (communities.error || published.error || pending.error || rejectedOrChanges.error || archived.error || owners.error || openReports.error || verificationNeedsReview.error || verificationUnverified.error || healthy.error || healthNeedsRecheck.error || healthInactive.error || healthUnknown.error || recentViews.error || recentJoinClicks.error) return null;
  const ownerIds = new Set((owners.data ?? []).map((row) => row.owner_user_id).filter((id): id is string => Boolean(id)));
  const recentViewCount = recentViews.count ?? 0;
  const recentJoinCount = recentJoinClicks.count ?? 0;
  const needsReview = (pending.count ?? 0) + (verificationNeedsReview.count ?? 0) + (healthNeedsRecheck.count ?? 0) + (healthInactive.count ?? 0);
  return {
    totalCommunities: communities.count ?? 0,
    published: published.count ?? 0,
    pending: pending.count ?? 0,
    rejectedOrChanges: rejectedOrChanges.count ?? 0,
    archived: archived.count ?? 0,
    totalOwners: ownerIds.size,
    openReports: openReports.count ?? 0,
    communitiesNeedingReview: needsReview,
    brokenOrUnhealthy: (healthNeedsRecheck.count ?? 0) + (healthInactive.count ?? 0),
    verificationNeedsReview: verificationNeedsReview.count ?? 0,
    verificationUnverified: verificationUnverified.count ?? 0,
    healthy: healthy.count ?? 0,
    healthNeedsRecheck: healthNeedsRecheck.count ?? 0,
    healthInactive: healthInactive.count ?? 0,
    healthUnknown: healthUnknown.count ?? 0,
    recentViews: recentViewCount,
    recentJoinClicks: recentJoinCount,
    recentCtr: recentViewCount ? Math.round((recentJoinCount / recentViewCount) * 1000) / 10 : 0,
  };
}
