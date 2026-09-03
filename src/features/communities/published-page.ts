import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { CommunityRow } from "@/types/database";
import type { CommunityPlatform, CommunitySort, PublishedCommunityFilters, CommunityQueryResult } from "./data-access";

export type PublishedPageResult = CommunityQueryResult<{ data: CommunityRow[]; total: number }>;
const PAGE_SIZE = 48;

function failure(error: PostgrestError): PublishedPageResult {
  void error;
  return { data: null, error: { code: "COMMUNITY_QUERY_FAILED", message: "Unable to load communities." } };
}

export async function getPublishedCommunityPage(
  filters: PublishedCommunityFilters = {},
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<PublishedPageResult> {
  const supabase = createServerSupabaseClient();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(12, Math.min(60, Math.floor(pageSize)));
  let query = supabase
    .from("communities")
    .select("*", { count: "exact" })
    .eq("status", "published");

  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.language && filters.language !== "any") query = query.ilike("language", `%${filters.language.trim()}%`);
  if (filters.region && filters.region !== "any") query = query.ilike("region", `%${filters.region.trim()}%`);
  if (filters.minMembers !== undefined) query = query.gte("member_count", filters.minMembers);
  if (filters.maxMembers !== undefined) query = query.lte("member_count", filters.maxMembers);
  if (filters.age && filters.age !== "any") {
    if (filters.age === "everyone") query = query.or("age_restriction.is.null,age_restriction.ilike.*everyone*,age_restriction.ilike.*no restriction*,age_restriction.ilike.*all ages*");
    else query = query.ilike("age_restriction", `%${filters.age}%`);
  }

  if (filters.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", filters.categorySlug).eq("is_active", true).maybeSingle();
    if (!category) return { data: { data: [], total: 0 }, error: null };
    const { data: links, error: linkError } = await supabase.from("community_categories").select("community_id").eq("category_id", category.id);
    if (linkError) return failure(linkError);
    const ids = [...new Set((links ?? []).map((row) => row.community_id))];
    if (!ids.length) return { data: { data: [], total: 0 }, error: null };
    query = query.in("id", ids);
  }

  const orderColumn = filters.sort === "members" ? "member_count" : "published_at";
  query = query.order("image_path", { ascending: false, nullsFirst: false }).order(orderColumn, { ascending: false, nullsFirst: false }).order("id", { ascending: true });
  const from = (safePage - 1) * safeSize;
  const { data, error, count } = await query.range(from, from + safeSize - 1);
  if (error) return failure(error);
  return { data: { data: data ?? [], total: count ?? 0 }, error: null };
}

export async function searchPublishedCommunityPage(
  term: string,
  filters: Omit<PublishedCommunityFilters, "platform"> & { platform?: CommunityPlatform } = {},
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<PublishedPageResult> {
  const q = term.trim().replace(/[%_(),]/g, " ").replace(/\s+/g, " ").slice(0, 100);
  if (!q) return getPublishedCommunityPage(filters, page, pageSize);
  const supabase = createServerSupabaseClient();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(12, Math.min(60, Math.floor(pageSize)));
  const pattern = `%${q}%`;
  let query = supabase.from("communities").select("*", { count: "exact" }).eq("status", "published").or(`name.ilike.${pattern},description.ilike.${pattern}`);
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.language && filters.language !== "any") query = query.ilike("language", `%${filters.language.trim()}%`);
  if (filters.region && filters.region !== "any") query = query.ilike("region", `%${filters.region.trim()}%`);
  if (filters.minMembers !== undefined) query = query.gte("member_count", filters.minMembers);
  if (filters.maxMembers !== undefined) query = query.lte("member_count", filters.maxMembers);
  if (filters.categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", filters.categorySlug).eq("is_active", true).maybeSingle();
    if (!category) return { data: { data: [], total: 0 }, error: null };
    const { data: links, error: linkError } = await supabase.from("community_categories").select("community_id").eq("category_id", category.id);
    if (linkError) return failure(linkError);
    const ids = [...new Set((links ?? []).map((row) => row.community_id))];
    if (!ids.length) return { data: { data: [], total: 0 }, error: null };
    query = query.in("id", ids);
  }
  const orderColumn = filters.sort === "members" ? "member_count" : "published_at";
  query = query.order("image_path", { ascending: false, nullsFirst: false }).order(orderColumn, { ascending: false, nullsFirst: false }).order("id", { ascending: true });
  const from = (safePage - 1) * safeSize;
  const { data, error, count } = await query.range(from, from + safeSize - 1);
  if (error) return failure(error);
  return { data: { data: data ?? [], total: count ?? 0 }, error: null };
}

export { PAGE_SIZE as PUBLISHED_PAGE_SIZE };
