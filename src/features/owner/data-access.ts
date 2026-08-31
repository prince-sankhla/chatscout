import "server-only";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";
import type { CommunityRow, Database } from "@/types/database";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

type OwnerCommunity = CommunityRow & {
  imageUrl: string | null;
  views: number;
  joins: number;
  ctr: number;
};

export type OwnerDashboardData = {
  user: {
    id: string;
    email: string | null;
    name: string;
    avatarUrl: string | null;
  };
  communities: OwnerCommunity[];
  stats: {
    totalCommunities: number;
    published: number;
    pending: number;
    archived: number;
    views: number;
    joins: number;
    ctr: number;
  };
  recentSubmissions: SubmissionRow[];
};

function userDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  const name = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (name) return name;
  const given = typeof metadata.name === "string" ? metadata.name.trim() : "";
  if (given) return given;
  return user.email?.split("@")[0] ?? "Community owner";
}

function avatarUrl(user: { user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  return typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;
}

async function authContext() {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: userDisplayName(user),
    avatarUrl: avatarUrl(user),
  };
}

async function analyticsForCommunities(ids: string[]) {
  if (!ids.length) return new Map<string, { views: number; joins: number }>();
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("analytics_events")
    .select("community_id,event_name")
    .in("community_id", ids)
    .gte("occurred_at", since)
    .in("event_name", ["community_view", "join_click"])
    .limit(20000);
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

export async function getOwnerDashboardData(): Promise<OwnerDashboardData | null> {
  const user = await authContext();
  if (!user) return null;

  const supabase = createAdminSupabaseClient();
  const [{ data: communities }, { data: submissions }] = await Promise.all([
    supabase.from("communities").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("submissions").select("*").eq("submitter_user_id", user.id).order("created_at", { ascending: false }).limit(12),
  ]);

  const owned = communities ?? [];
  const analytics = await analyticsForCommunities(owned.map((community) => community.id));
  const mapped = await Promise.all(owned.map(async (community) => {
    const stats = analytics.get(community.id) ?? { views: 0, joins: 0 };
    return {
      ...community,
      imageUrl: await getPublishedCommunityImageUrl(community.image_path),
      views: stats.views,
      joins: stats.joins,
      ctr: stats.views ? Math.round((stats.joins / stats.views) * 1000) / 10 : 0,
    };
  }));

  const views = mapped.reduce((sum, item) => sum + item.views, 0);
  const joins = mapped.reduce((sum, item) => sum + item.joins, 0);
  const stats = {
    totalCommunities: mapped.length,
    published: mapped.filter((item) => item.status === "published").length,
    pending: (submissions ?? []).filter((item) => item.status === "pending").length,
    archived: mapped.filter((item) => item.status === "archived").length,
    views,
    joins,
    ctr: views ? Math.round((joins / views) * 1000) / 10 : 0,
  };

  return { user, communities: mapped, stats, recentSubmissions: submissions ?? [] };
}

export async function getCurrentOwnerProfile() {
  const user = await authContext();
  return user;
}
