import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CategoryRow, CommunityRow } from "@/types/database";

export type CommunityQueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: "COMMUNITY_QUERY_FAILED"; message: string } };

export type CommunitySort = "newest" | "members";
export type AgeFilter = "any" | "everyone" | "13+" | "16+" | "18+";
export type PublishedCommunityFilters = {
  categorySlug?: string;
  platform?: "instagram";
  sort?: CommunitySort;
  language?: string;
  region?: string;
  age?: AgeFilter;
  minMembers?: number;
  maxMembers?: number;
};

const MAX_SEARCH_RESULTS = 50;
const TRENDING_WINDOW_DAYS = 7;

function normalizeSearchTerm(term: string) { return term.trim().replace(/[%_(),.]/g, " ").replace(/\s+/g, " ").slice(0, 100); }
function queryFailure<T>(error: PostgrestError, message: string): CommunityQueryResult<T> { void error; return { data: null, error: { code: "COMMUNITY_QUERY_FAILED", message } }; }
function orderColumn(sort: CommunitySort = "newest") { return sort === "members" ? "member_count" : "published_at"; }

function applyDiscoveryFilters(communities: CommunityRow[], filters: PublishedCommunityFilters) {
  const language = filters.language?.trim().toLowerCase();
  const region = filters.region?.trim().toLowerCase();
  const age = filters.age ?? "any";
  return communities.filter((community) => {
    if (language && language !== "any" && !(community.language ?? "").toLowerCase().includes(language)) return false;
    if (region && region !== "any" && !(community.region ?? "").toLowerCase().includes(region)) return false;
    const members = community.member_count ?? -1;
    if (filters.minMembers !== undefined && (members < filters.minMembers || members < 0)) return false;
    if (filters.maxMembers !== undefined && (members < 0 || members > filters.maxMembers)) return false;
    if (age !== "any") {
      const value = (community.age_restriction ?? "").toLowerCase();
      if (age === "everyone" && value && !value.includes("everyone") && !value.includes("no restriction") && !value.includes("no age") && !value.includes("all ages")) return false;
      if (age !== "everyone" && !value.includes(age)) return false;
    }
    return true;
  });
}

export async function getActiveCategories(): Promise<CommunityQueryResult<CategoryRow[]>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (error) return queryFailure(error, "Unable to load categories.");
  return { data: data ?? [], error: null };
}

async function communityIdsForCategory(categorySlug?: string) {
  if (!categorySlug) return { ids: undefined as string[] | undefined, error: null as PostgrestError | null };
  const supabase = createServerSupabaseClient();
  const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", categorySlug).eq("is_active", true).maybeSingle();
  if (categoryError) return { ids: undefined, error: categoryError };
  if (!category) return { ids: [] as string[], error: null as PostgrestError | null };
  const { data: joins, error: joinError } = await supabase.from("community_categories").select("community_id").eq("category_id", category.id);
  if (joinError) return { ids: undefined, error: joinError };
  return { ids: joins.map((join) => join.community_id), error: null };
}

export async function getPublishedCommunities(filters: PublishedCommunityFilters = {}): Promise<CommunityQueryResult<CommunityRow[]>> {
  const supabase = createServerSupabaseClient();
  const category = await communityIdsForCategory(filters.categorySlug);
  if (category.error) return queryFailure(category.error, "Unable to load communities.");
  if (category.ids && category.ids.length === 0) return { data: [], error: null };
  let query = supabase.from("communities").select("*").eq("status", "published").order(orderColumn(filters.sort), { ascending: false, nullsFirst: false });
  if (filters.sort === "members") query = query.order("published_at", { ascending: false });
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (category.ids) query = query.in("id", category.ids);
  const { data, error } = await query.limit(MAX_SEARCH_RESULTS);
  if (error) return queryFailure(error, "Unable to load communities.");
  return { data: applyDiscoveryFilters(data ?? [], filters), error: null };
}

export async function getTrendingPublishedCommunities(filters: Omit<PublishedCommunityFilters, "sort"> = {}, limit = 12): Promise<CommunityQueryResult<CommunityRow[]>> {
  const published = await getPublishedCommunities({ categorySlug: filters.categorySlug, platform: filters.platform, sort: "newest", language: filters.language, region: filters.region, age: filters.age, minMembers: filters.minMembers, maxMembers: filters.maxMembers });
  if (published.error || !published.data.length) return published.error ? { data: null, error: published.error } : { data: [], error: null };
  const ids = published.data.map((community) => community.id);
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const analytics = createAdminSupabaseClient();
  const { data: events, error } = await analytics.from("analytics_events").select("community_id,event_name").in("community_id", ids).gte("occurred_at", since).in("event_name", ["community_view", "join_click"]).limit(20_000);
  if (error) return { data: published.data.slice(0, limit), error: null };
  const scores = new Map<string, { views: number; joins: number }>();
  for (const event of events ?? []) {
    if (!event.community_id) continue;
    const current = scores.get(event.community_id) ?? { views: 0, joins: 0 };
    if (event.event_name === "community_view") current.views += 1;
    if (event.event_name === "join_click") current.joins += 1;
    scores.set(event.community_id, current);
  }
  const ranked = [...published.data].sort((a, b) => {
    const left = scores.get(a.id) ?? { views: 0, joins: 0 };
    const right = scores.get(b.id) ?? { views: 0, joins: 0 };
    const scoreA = left.views + left.joins * 5;
    const scoreB = right.views + right.joins * 5;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });
  return { data: ranked.slice(0, Math.max(1, Math.min(limit, MAX_SEARCH_RESULTS))), error: null };
}

export async function getPublishedCommunityBySlug(slug: string): Promise<CommunityQueryResult<CommunityRow | null>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return queryFailure(error, "Unable to load this community.");
  return { data, error: null };
}

export async function getPublishedRelatedCommunities(communityId: string, limit = 6): Promise<CommunityQueryResult<CommunityRow[]>> {
  const supabase = createServerSupabaseClient();
  const { data: sourceLinks, error: sourceError } = await supabase.from("community_categories").select("category_id").eq("community_id", communityId);
  if (sourceError) return queryFailure(sourceError, "Unable to load related communities.");
  const categoryIds = [...new Set(sourceLinks.map((link) => link.category_id))];
  if (!categoryIds.length) return { data: [], error: null };
  const { data: links, error: linkError } = await supabase.from("community_categories").select("community_id").in("category_id", categoryIds).neq("community_id", communityId);
  if (linkError) return queryFailure(linkError, "Unable to load related communities.");
  const ids = [...new Set(links.map((link) => link.community_id))];
  if (!ids.length) return { data: [], error: null };
  const { data, error } = await supabase.from("communities").select("*").eq("status", "published").in("id", ids).order("published_at", { ascending: false }).limit(limit);
  if (error) return queryFailure(error, "Unable to load related communities.");
  return { data: data ?? [], error: null };
}

export async function searchPublishedCommunities(term: string, filters: Omit<PublishedCommunityFilters, "platform"> = {}): Promise<CommunityQueryResult<CommunityRow[]>> {
  const searchTerm = normalizeSearchTerm(term);
  const category = await communityIdsForCategory(filters.categorySlug);
  if (category.error) return queryFailure(category.error, "Unable to search communities.");
  if (category.ids && category.ids.length === 0) return { data: [], error: null };
  const supabase = createServerSupabaseClient();
  if (!searchTerm) return getPublishedCommunities(filters);
  const pattern = `%${searchTerm}%`;
  const [{ data: textMatches, error: textError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from("communities").select("*").eq("status", "published").or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(MAX_SEARCH_RESULTS),
    supabase.from("categories").select("id").eq("is_active", true).ilike("name", pattern),
  ]);
  if (textError) return queryFailure(textError, "Unable to search communities.");
  if (categoryError) return queryFailure(categoryError, "Unable to search communities.");
  let categoryMatches: CommunityRow[] = [];
  if (categories.length) {
    const { data: categoryLinks, error: linkError } = await supabase.from("community_categories").select("community_id").in("category_id", categories.map((category) => category.id));
    if (linkError) return queryFailure(linkError, "Unable to search communities.");
    const ids = [...new Set(categoryLinks.map((link) => link.community_id))];
    if (ids.length) {
      const { data, error } = await supabase.from("communities").select("*").eq("status", "published").in("id", ids).limit(MAX_SEARCH_RESULTS);
      if (error) return queryFailure(error, "Unable to search communities.");
      categoryMatches = data ?? [];
    }
  }
  let matches = [...new Map([...textMatches, ...categoryMatches].map((community) => [community.id, community])).values()];
  if (category.ids) {
    const allowed = new Set(category.ids);
    matches = matches.filter((community) => allowed.has(community.id));
  }
  matches = applyDiscoveryFilters(matches, filters);
  matches.sort((a, b) => {
    if (filters.sort === "members") return (b.member_count ?? -1) - (a.member_count ?? -1);
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });
  return { data: matches.slice(0, MAX_SEARCH_RESULTS), error: null };
}
