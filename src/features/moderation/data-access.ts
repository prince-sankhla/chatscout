import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";
import type { CommunityRow, Database } from "@/types/database";

export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["admin_audit_log"]["Row"];

export type AdminSubmissionItem = SubmissionRow & { imageUrl: string | null; submitterEmail: string | null };
export type AdminCommunityItem = CommunityRow & {
  category: string | null;
  imageUrl: string | null;
  ownerEmail: string | null;
  sourceSubmissionCreatedAt: string | null;
  viewsRecent: number;
  joinClicksRecent: number;
  ctrRecent: number;
};
export type AdminOwnerSummary = {
  userId: string;
  email: string | null;
  listedCommunities: number;
  pendingSubmissions: number;
  totalViewsRecent: number;
  totalJoinClicksRecent: number;
  ctrRecent: number;
  lastListedAt: string | null;
};

export type AdminDashboardData = {
  overview: { publishedCommunities: number; pendingSubmissions: number; archivedCommunities: number; rejectedSubmissions: number; totalCommunities: number; recentViews: number; recentJoinClicks: number };
  pending: AdminSubmissionItem[];
  published: AdminCommunityItem[];
  archived: AdminCommunityItem[];
  unpublished: AdminCommunityItem[];
  rejected: AdminSubmissionItem[];
  owners: AdminOwnerSummary[];
  auditLog: AuditLogRow[];
};

const RECENT_ACTIVITY_DAYS = 7;
const LIST_LIMIT = 80;
const OWNER_LIMIT = 30;

function includesQuery(values: Array<string | number | null | undefined>, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
}

async function userEmailById(userId: string | null) {
  if (!userId) return null;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

async function withSubmissionAdminFields(submissions: SubmissionRow[], query: string) {
  const filtered = submissions.filter((submission) => includesQuery([submission.community_name, submission.category, submission.description, submission.region, submission.language, submission.invite_url], query));
  return Promise.all(filtered.map(async (submission) => ({ ...submission, imageUrl: await getPublishedCommunityImageUrl(submission.image_path), submitterEmail: await userEmailById(submission.submitter_user_id) })));
}

async function categoryMapForCommunities(communityIds: string[]) {
  if (!communityIds.length) return new Map<string, string>();
  const supabase = createAdminSupabaseClient();
  const { data: links } = await supabase.from("community_categories").select("community_id, category_id").in("community_id", communityIds);
  const categoryIds = [...new Set((links ?? []).map((link) => link.category_id))];
  if (!categoryIds.length) return new Map<string, string>();
  const { data: categories } = await supabase.from("categories").select("id, name").in("id", categoryIds);
  const names = new Map((categories ?? []).map((category) => [category.id, category.name]));
  return new Map((links ?? []).map((link) => [link.community_id, names.get(link.category_id) ?? null]).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

async function sourceSubmissionMeta(communities: CommunityRow[]) {
  const sourceIds = [...new Set(communities.map((community) => community.source_submission_id).filter((id): id is string => Boolean(id)))];
  if (!sourceIds.length) return new Map<string, { createdAt: string | null; email: string | null }>();
  const supabase = createAdminSupabaseClient();
  const { data: submissions } = await supabase.from("submissions").select("id, created_at, submitter_user_id").in("id", sourceIds);
  const entries = await Promise.all((submissions ?? []).map(async (submission) => [submission.id, { createdAt: submission.created_at, email: await userEmailById(submission.submitter_user_id) }] as const));
  return new Map(entries);
}

async function analyticsCounts(communityIds: string[]) {
  if (!communityIds.length) return new Map<string, { views: number; joins: number }>();
  const since = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase.from("analytics_events").select("community_id, event_name").gte("occurred_at", since).in("community_id", communityIds).in("event_name", ["community_view", "join_click"]).limit(20_000);
  const counts = new Map<string, { views: number; joins: number }>();
  for (const event of data ?? []) {
    if (!event.community_id) continue;
    const current = counts.get(event.community_id) ?? { views: 0, joins: 0 };
    if (event.event_name === "community_view") current.views += 1;
    if (event.event_name === "join_click") current.joins += 1;
    counts.set(event.community_id, current);
  }
  return counts;
}

async function withCommunityAdminFields(communities: CommunityRow[], query: string) {
  const filtered = communities.filter((community) => includesQuery([community.name, community.description, community.region, community.language, community.platform, community.verification_status], query));
  const ids = filtered.map((community) => community.id);
  const [categories, sources, analytics] = await Promise.all([categoryMapForCommunities(ids), sourceSubmissionMeta(filtered), analyticsCounts(ids)]);
  return Promise.all(filtered.map(async (community) => {
    const source = community.source_submission_id ? sources.get(community.source_submission_id) : null;
    const stats = analytics.get(community.id) ?? { views: 0, joins: 0 };
    return { ...community, category: categories.get(community.id) ?? null, imageUrl: await getPublishedCommunityImageUrl(community.image_path), ownerEmail: await userEmailById(community.owner_user_id) ?? source?.email ?? null, sourceSubmissionCreatedAt: source?.createdAt ?? null, viewsRecent: stats.views, joinClicksRecent: stats.joins, ctrRecent: stats.views ? Math.round((stats.joins / stats.views) * 1000) / 10 : 0 };
  }));
}

async function buildOwnerSummary(communities: CommunityRow[], submissions: SubmissionRow[], analytics: Map<string, { views: number; joins: number }>) {
  const owners = new Map<string, { listed: number; pending: number; views: number; joins: number; lastListedAt: string | null }>();
  for (const community of communities) {
    const userId = community.owner_user_id;
    if (!userId) continue;
    const current = owners.get(userId) ?? { listed: 0, pending: 0, views: 0, joins: 0, lastListedAt: null };
    current.listed += 1;
    current.lastListedAt = !current.lastListedAt || new Date(community.created_at) > new Date(current.lastListedAt) ? community.created_at : current.lastListedAt;
    const stats = analytics.get(community.id) ?? { views: 0, joins: 0 };
    current.views += stats.views;
    current.joins += stats.joins;
    owners.set(userId, current);
  }
  for (const submission of submissions) {
    const userId = submission.submitter_user_id;
    if (!userId) continue;
    const current = owners.get(userId) ?? { listed: 0, pending: 0, views: 0, joins: 0, lastListedAt: null };
    if (submission.status === "pending") current.pending += 1;
    owners.set(userId, current);
  }
  const entries = await Promise.all([...owners.entries()].map(async ([userId, current]) => ({ userId, email: await userEmailById(userId), listedCommunities: current.listed, pendingSubmissions: current.pending, totalViewsRecent: current.views, totalJoinClicksRecent: current.joins, ctrRecent: current.views ? Math.round((current.joins / current.views) * 1000) / 10 : 0, lastListedAt: current.lastListedAt })));
  return entries.sort((a, b) => (b.listedCommunities - a.listedCommunities) || (b.totalJoinClicksRecent - a.totalJoinClicksRecent)).slice(0, OWNER_LIMIT);
}

export async function getAdminControlCenterData(searchTerm = ""): Promise<AdminDashboardData | null> {
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [totalCommunities, publishedCommunities, archivedCommunities, pendingSubmissions, rejectedSubmissions, recentViews, recentJoinClicks, pending, rejected, published, archived, unpublished, auditLog] = await Promise.all([
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["rejected", "needs_changes"]),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "community_view").gte("occurred_at", since),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "join_click").gte("occurred_at", since),
    supabase.from("submissions").select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(LIST_LIMIT),
    supabase.from("submissions").select("*").in("status", ["rejected", "needs_changes"]).order("updated_at", { ascending: false }).limit(LIST_LIMIT),
    supabase.from("communities").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(LIST_LIMIT),
    supabase.from("communities").select("*").eq("status", "archived").order("archived_at", { ascending: false }).limit(LIST_LIMIT),
    supabase.from("communities").select("*").in("status", ["draft", "suspended"]).order("updated_at", { ascending: false }).limit(LIST_LIMIT),
    supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  if (pending.error || rejected.error || published.error || archived.error || unpublished.error || auditLog.error) return null;
  const communityPool = [...(published.data ?? []), ...(archived.data ?? []), ...(unpublished.data ?? [])];
  const communityAnalytics = await analyticsCounts([...new Set(communityPool.map((community) => community.id))]);
  return {
    overview: { publishedCommunities: publishedCommunities.count ?? 0, pendingSubmissions: pendingSubmissions.count ?? 0, archivedCommunities: archivedCommunities.count ?? 0, rejectedSubmissions: rejectedSubmissions.count ?? 0, totalCommunities: totalCommunities.count ?? 0, recentViews: recentViews.count ?? 0, recentJoinClicks: recentJoinClicks.count ?? 0 },
    pending: await withSubmissionAdminFields(pending.data ?? [], searchTerm),
    published: await withCommunityAdminFields(published.data ?? [], searchTerm),
    archived: await withCommunityAdminFields(archived.data ?? [], searchTerm),
    unpublished: await withCommunityAdminFields(unpublished.data ?? [], searchTerm),
    rejected: await withSubmissionAdminFields(rejected.data ?? [], searchTerm),
    owners: await buildOwnerSummary(communityPool, pending.data ?? [], communityAnalytics),
    auditLog: auditLog.data ?? [],
  };
}
