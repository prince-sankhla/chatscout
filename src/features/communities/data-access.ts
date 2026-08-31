import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CategoryRow, CommunityRow } from "@/types/database";

export type CommunityQueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: "COMMUNITY_QUERY_FAILED"; message: string } };

export type CommunitySort = "newest" | "members";

export type PublishedCommunityFilters = {
  categorySlug?: string;
  platform?: "instagram";
  sort?: CommunitySort;
};

const MAX_SEARCH_RESULTS = 50;

function normalizeSearchTerm(term: string) {
  return term.trim().replace(/[%_(),.]/g, " ").replace(/\s+/g, " ").slice(0, 100);
}

function queryFailure<T>(error: PostgrestError, message: string): CommunityQueryResult<T> {
  void error;
  return { data: null, error: { code: "COMMUNITY_QUERY_FAILED", message } };
}

function orderColumn(sort: CommunitySort = "newest") {
  return sort === "members" ? "member_count" : "published_at";
}

export async function getActiveCategories(): Promise<CommunityQueryResult<CategoryRow[]>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return queryFailure(error, "Unable to load categories.");
  return { data: data ?? [], error: null };
}

export async function getPublishedCommunities(
  filters: PublishedCommunityFilters = {},
): Promise<CommunityQueryResult<CommunityRow[]>> {
  const supabase = createServerSupabaseClient();
  let communityIds: string[] | undefined;

  if (filters.categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (categoryError) return queryFailure(categoryError, "Unable to load communities.");
    if (!category) return { data: [], error: null };

    const { data: joins, error: joinError } = await supabase
      .from("community_categories")
      .select("community_id")
      .eq("category_id", category.id);
    if (joinError) return queryFailure(joinError, "Unable to load communities.");
    communityIds = joins.map((join) => join.community_id);
    if (communityIds.length === 0) return { data: [], error: null };
  }

  let query = supabase
    .from("communities")
    .select("*")
    .eq("status", "published")
    .order(orderColumn(filters.sort), { ascending: false, nullsFirst: false });
  if (filters.sort === "members") query = query.order("published_at", { ascending: false });
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (communityIds) query = query.in("id", communityIds);
  const { data, error } = await query.limit(MAX_SEARCH_RESULTS);
  if (error) return queryFailure(error, "Unable to load communities.");
  return { data: data ?? [], error: null };
}

export async function getPublishedCommunityBySlug(slug: string): Promise<CommunityQueryResult<CommunityRow | null>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
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
  if (!searchTerm) return getPublishedCommunities(filters);

  const supabase = createServerSupabaseClient();
  const pattern = `%${searchTerm}%`;
  const [{ data: textMatches, error: textError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from("communities").select("*").eq("status", "published").or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(MAX_SEARCH_RESULTS),
    supabase.from("categories").select("id").eq("is_active", true).ilike("name", pattern),
  ]);
  if (textError) return queryFailure(textError, "Unable to search communities.");
  if (categoryError) return queryFailure(categoryError, "Unable to search communities.");

  let categoryMatches: CommunityRow[] = [];
  if (categories.length) {
    const { data: categoryLinks, error: linkError } = await supabase
      .from("community_categories")
      .select("community_id")
      .in("category_id", categories.map((category) => category.id));
    if (linkError) return queryFailure(linkError, "Unable to search communities.");
    const ids = [...new Set(categoryLinks.map((link) => link.community_id))];
    if (ids.length) {
      const { data, error } = await supabase.from("communities").select("*").eq("status", "published").in("id", ids).limit(MAX_SEARCH_RESULTS);
      if (error) return queryFailure(error, "Unable to search communities.");
      categoryMatches = data ?? [];
    }
  }

  const matches = [...new Map([...textMatches, ...categoryMatches].map((community) => [community.id, community])).values()];
  if (filters.categorySlug) {
    const { data: category, error } = await supabase.from("categories").select("id").eq("slug", filters.categorySlug).eq("is_active", true).maybeSingle();
    if (error) return queryFailure(error, "Unable to search communities.");
    if (!category) return { data: [], error: null };
    const { data: links, error: linkError } = await supabase.from("community_categories").select("community_id").eq("category_id", category.id);
    if (linkError) return queryFailure(linkError, "Unable to search communities.");
    const allowed = new Set(links.map((link) => link.community_id));
    matches.splice(0, matches.length, ...matches.filter((community) => allowed.has(community.id)));
  }

  matches.sort((a, b) => {
    if (filters.sort === "members") return (b.member_count ?? -1) - (a.member_count ?? -1);
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });

  return { data: matches.slice(0, MAX_SEARCH_RESULTS), error: null };
}
