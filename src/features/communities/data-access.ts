import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/types/database";

export type CommunityQueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: "COMMUNITY_QUERY_FAILED"; message: string } };

export type PublishedCommunityFilters = {
  categorySlug?: string;
  platform?: "instagram";
};

const MAX_SEARCH_RESULTS = 50;

function normalizeSearchTerm(term: string) {
  return term.trim().replace(/[%_(),.]/g, " ").replace(/\s+/g, " ").slice(0, 100);
}

function queryFailure<T>(error: PostgrestError, message: string): CommunityQueryResult<T> {
  // Keep the provider error out of UI-facing results while preserving a typed failure branch.
  void error;
  return { data: null, error: { code: "COMMUNITY_QUERY_FAILED", message } };
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

  let query = supabase.from("communities").select("*").eq("status", "published").order("published_at", { ascending: false });
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (communityIds) query = query.in("id", communityIds);
  const { data, error } = await query;
  if (error) return queryFailure(error, "Unable to load communities.");
  return { data, error: null };
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

/** Published peers sharing an existing category relationship with a community. */
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
  return { data, error: null };
}

/** Searches the V1 public read model by listing text and active category names. */
export async function searchPublishedCommunities(term: string): Promise<CommunityQueryResult<CommunityRow[]>> {
  const searchTerm = normalizeSearchTerm(term);
  if (!searchTerm) return getPublishedCommunities();

  const supabase = createServerSupabaseClient();
  const pattern = `%${searchTerm}%`;
  const [{ data: textMatches, error: textError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase
      .from("communities")
      .select("*")
      .eq("status", "published")
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .order("published_at", { ascending: false })
      .limit(MAX_SEARCH_RESULTS),
    supabase.from("categories").select("id").eq("is_active", true).ilike("name", pattern),
  ]);
  if (textError) return queryFailure(textError, "Unable to search communities.");
  if (categoryError) return queryFailure(categoryError, "Unable to search communities.");
  if (categories.length === 0) return { data: textMatches, error: null };

  const { data: categoryLinks, error: linkError } = await supabase
    .from("community_categories")
    .select("community_id")
    .in("category_id", categories.map((category) => category.id));
  if (linkError) return queryFailure(linkError, "Unable to search communities.");

  const categoryCommunityIds = [...new Set(categoryLinks.map((link) => link.community_id))];
  if (categoryCommunityIds.length === 0) return { data: textMatches, error: null };
  const { data: categoryMatches, error: communityError } = await supabase
    .from("communities")
    .select("*")
    .eq("status", "published")
    .in("id", categoryCommunityIds)
    .order("published_at", { ascending: false })
    .limit(MAX_SEARCH_RESULTS);
  if (communityError) return queryFailure(communityError, "Unable to search communities.");

  return { data: [...new Map([...textMatches, ...categoryMatches].map((community) => [community.id, community])).values()], error: null };
}
