import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CategoryRow, CommunityRow } from "@/types/database";

export type CommunityQueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: "COMMUNITY_QUERY_FAILED"; message: string } };
export type CommunitySort = "newest" | "members";
export type CommunityPlatform = "instagram" | "whatsapp" | "telegram" | "discord";
export type AgeFilter = "any" | "everyone" | "13+" | "16+" | "18+";
export type PublishedCommunityFilters = { categorySlug?: string; platform?: CommunityPlatform; sort?: CommunitySort; language?: string; region?: string; age?: AgeFilter; minMembers?: number; maxMembers?: number };
export type CommunityTaxonomy = { id: string; slug: string; name: string };
const MAX_SEARCH_RESULTS = 50;
const DISCOVERY_FETCH_LIMIT = 200;
const TRENDING_WINDOW_DAYS = 7;
const FEATURED_CANDIDATE_LIMIT = 30;
const FEATURED_LIMIT = 8;
function normalizeSearchTerm(term: string) { return term.trim().replace(/[%_(),.]/g, " ").replace(/\s+/g, " ").slice(0, 100); }
function queryFailure<T>(error: PostgrestError, message: string): CommunityQueryResult<T> { void error; return { data: null, error: { code: "COMMUNITY_QUERY_FAILED", message } }; }
function orderColumn(sort: CommunitySort = "newest") { return sort === "members" ? "member_count" : "published_at"; }
function applyDiscoveryFilters(communities: CommunityRow[], filters: PublishedCommunityFilters) {
  const language = filters.language?.trim().toLowerCase(), region = filters.region?.trim().toLowerCase(), age = filters.age ?? "any";
  return communities.filter((community) => {
    if (language && language !== "any" && !(community.language ?? "").toLowerCase().includes(language)) return false;
    if (region && region !== "any" && !(community.region ?? "").toLowerCase().includes(region)) return false;
    const members = community.member_count ?? -1;
    if (filters.minMembers !== undefined && (members < filters.minMembers || members < 0)) return false;
    if (filters.maxMembers !== undefined && (members < 0 || members > filters.maxMembers)) return false;
    if (age !== "any") { const value = (community.age_restriction ?? "").toLowerCase(); if (age === "everyone" && value && !/everyone|no restriction|no age|all ages/.test(value)) return false; if (age !== "everyone" && !value.includes(age)) return false; }
    return true;
  });
}
function imagePriority(community: CommunityRow) { return community.image_path ? 1 : 0; }
function platformPriority(community: CommunityRow) { return ({ instagram: 4, whatsapp: 3, telegram: 2, discord: 1 }[community.platform] ?? 0); }
function discoveryPriorityCompare(a: CommunityRow, b: CommunityRow) {
  const imageDiff = imagePriority(b) - imagePriority(a);
  if (imageDiff !== 0) return imageDiff;
  const platformDiff = platformPriority(b) - platformPriority(a);
  if (platformDiff !== 0) return platformDiff;
  return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
}
export async function getActiveCategories(): Promise<CommunityQueryResult<CategoryRow[]>> { const supabase = createServerSupabaseClient(); const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }); if (error) return queryFailure(error, "Unable to load categories."); return { data: data ?? [], error: null }; }
async function communityIdsForCategory(categorySlug?: string) { if (!categorySlug) return { ids: undefined as string[] | undefined, error: null as PostgrestError | null }; const supabase = createServerSupabaseClient(); const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", categorySlug).eq("is_active", true).maybeSingle(); if (categoryError) return { ids: undefined, error: categoryError }; if (!category) return { ids: [] as string[], error: null as PostgrestError | null }; const { data: joins, error: joinError } = await supabase.from("community_categories").select("community_id").eq("category_id", category.id); if (joinError) return { ids: undefined, error: joinError }; return { ids: joins.map((join) => join.community_id), error: null }; }
export async function getCommunityTaxonomy(communityId: string): Promise<CommunityTaxonomy[]> { const supabase = createServerSupabaseClient(); const { data: links } = await supabase.from("community_categories").select("category_id").eq("community_id", communityId); const ids = [...new Set((links ?? []).map((link) => link.category_id))]; if (!ids.length) return []; const { data } = await supabase.from("categories").select("id,slug,name,sort_order").in("id", ids).eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }); return (data ?? []).map((category) => ({ id: category.id, slug: category.slug, name: category.name })); }
export async function getPublishedCommunities(filters: PublishedCommunityFilters = {}): Promise<CommunityQueryResult<CommunityRow[]>> { const supabase = createServerSupabaseClient(); const category = await communityIdsForCategory(filters.categorySlug); if (category.error) return queryFailure(category.error, "Unable to load communities."); if (category.ids && category.ids.length === 0) return { data: [], error: null }; let query = supabase.from("communities").select("*").eq("status", "published").order("image_path", { ascending: false, nullsFirst: false }).order(orderColumn(filters.sort), { ascending: false, nullsFirst: false }); if (filters.sort === "members") query = query.order("published_at", { ascending: false }); if (filters.platform) query = query.eq("platform", filters.platform); if (category.ids) query = query.in("id", category.ids); const { data, error } = await query.limit(DISCOVERY_FETCH_LIMIT); if (error) return queryFailure(error, "Unable to load communities."); const filtered = applyDiscoveryFilters(data ?? [], filters).sort(discoveryPriorityCompare); return { data: filtered.slice(0, MAX_SEARCH_RESULTS), error: null }; }
export async function getFeaturedPublishedCommunities(limit = FEATURED_LIMIT): Promise<CommunityQueryResult<CommunityRow[]>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("communities").select("*").eq("status", "published").not("image_path", "is", null).order("member_count", { ascending: false, nullsFirst: false }).order("verification_status", { ascending: true }).order("published_at", { ascending: false }).limit(FEATURED_CANDIDATE_LIMIT);
  if (error) return queryFailure(error, "Unable to load featured communities.");
  const candidates = (data ?? []).filter((community) => community.platform === "instagram" && (community.member_count ?? 0) >= 70);
  const scored = candidates.map((community) => {
    const hint = `${community.description ?? ""} ${community.name}`;
    let score = (community.member_count ?? 0) * 2;
    if (community.verification_status === "verified") score += 120;
    if (/(college|university|student|developer|coding|ai|ml|career|startup|business|writer|book|design|photography|music|education|engineering|technology)/i.test(hint)) score += 40;
    if (/(meme|ragebait|gooner|edger|flirty|dating|weirdo|mental hospital|slaughter house)/i.test(hint)) score -= 100;
    return { community, score };
  }).sort((a, b) => b.score - a.score || (b.community.member_count ?? 0) - (a.community.member_count ?? 0));
  const unique = new Map<string, CommunityRow>();
  for (const item of scored) { const key = item.community.name.trim().toLowerCase(); if (!unique.has(key)) unique.set(key, item.community); if (unique.size >= Math.max(1, Math.min(limit, 12))) break; }
  return { data: [...unique.values()], error: null };
}
export async function getTrendingPublishedCommunities(filters: Omit<PublishedCommunityFilters, "sort"> = {}, limit = 12): Promise<CommunityQueryResult<CommunityRow[]>> { const published = await getPublishedCommunities({ ...filters, sort: "newest" }); if (published.error || !published.data.length) return published.error ? { data: null, error: published.error } : { data: [], error: null }; const ids = published.data.map((community) => community.id), since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(), analytics = createAdminSupabaseClient(); const { data: events, error } = await analytics.from("analytics_events").select("community_id,event_name").in("community_id", ids).gte("occurred_at", since).in("event_name", ["community_view", "join_click"]).limit(20_000); if (error) return { data: published.data.slice(0, limit), error: null }; const scores = new Map<string, { views: number; joins: number }>(); for (const event of events ?? []) { if (!event.community_id) continue; const current = scores.get(event.community_id) ?? { views: 0, joins: 0 }; if (event.event_name === "community_view") current.views += 1; if (event.event_name === "join_click") current.joins += 1; scores.set(event.community_id, current); } const ranked = [...published.data].sort((a, b) => { const imageDiff = imagePriority(b) - imagePriority(a); if (imageDiff !== 0) return imageDiff; const left = scores.get(a.id) ?? { views: 0, joins: 0 }, right = scores.get(b.id) ?? { views: 0, joins: 0 }, scoreA = left.views + left.joins * 5, scoreB = right.views + right.joins * 5; if (scoreB !== scoreA) return scoreB - scoreA; return discoveryPriorityCompare(a, b); }); return { data: ranked.slice(0, Math.max(1, Math.min(limit, MAX_SEARCH_RESULTS))), error: null }; }
export async function getPublishedCommunityBySlug(slug: string): Promise<CommunityQueryResult<CommunityRow | null>> { const supabase = createServerSupabaseClient(); const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).eq("status", "published").maybeSingle(); if (error) return queryFailure(error, "Unable to load this community."); return { data, error: null }; }
export async function getPublishedRelatedCommunities(communityId: string, limit = 6): Promise<CommunityQueryResult<CommunityRow[]>> {
  const supabase = createServerSupabaseClient();
  const { data: sourceLinks, error: sourceError } = await supabase.from("community_categories").select("category_id").eq("community_id", communityId);
  if (sourceError) return queryFailure(sourceError, "Unable to load related communities.");
  const categoryIds = [...new Set((sourceLinks ?? []).map((link) => link.category_id))];
  if (!categoryIds.length) return { data: [], error: null };
  const { data: links, error: linkError } = await supabase.from("community_categories").select("community_id").in("category_id", categoryIds).neq("community_id", communityId);
  if (linkError) return queryFailure(linkError, "Unable to load related communities.");
  const ids = [...new Set(links.map((link) => link.community_id))];
  if (!ids.length) return { data: [], error: null };
  const { data, error } = await supabase.from("communities").select("*").eq("status", "published").in("id", ids).limit(DISCOVERY_FETCH_LIMIT);
  if (error) return queryFailure(error, "Unable to load related communities.");

  const categoryLinks = await supabase.from("community_categories").select("community_id,category_id").in("community_id", ids);
  const categoryNames = await supabase.from("categories").select("id,name").in("id", [...new Set((categoryLinks.data ?? []).map((link) => link.category_id))]).eq("is_active", true);
  const names = new Map((categoryNames.data ?? []).map((row) => [row.id, row.name]));
  const tagsFor = new Map<string, string[]>();
  for (const link of categoryLinks.data ?? []) { const tag = names.get(link.category_id); if (!tag) continue; const current = tagsFor.get(link.community_id) ?? []; current.push(tag); tagsFor.set(link.community_id, current); }
  const source = await supabase.from("communities").select("platform,language,region,name").eq("id", communityId).maybeSingle();
  const sourcePlatform = source.data?.platform;
  const sourceLanguage = (source.data?.language ?? "").trim().toLowerCase();
  const sourceRegion = (source.data?.region ?? "").trim().toLowerCase();
  const sourceTags = new Set((tagsFor.get(communityId) ?? []).map((tag) => tag.toLowerCase()));
  const scored = (data ?? []).map((community) => {
    const categorySet = new Set((tagsFor.get(community.id) ?? []).map((tag) => tag.toLowerCase()));
    const sharedCategories = [...sourceTags].filter((tag) => categorySet.has(tag)).length;
    const samePlatform = community.platform === sourcePlatform ? 8 : 0;
    const sameLanguage = sourceLanguage && (community.language ?? "").trim().toLowerCase() === sourceLanguage ? 5 : 0;
    const sameRegion = sourceRegion && (community.region ?? "").trim().toLowerCase() === sourceRegion ? 5 : 0;
    const score = sharedCategories * 14 + samePlatform + sameLanguage + sameRegion + imagePriority(community) * 3;
    return { community, score };
  }).sort((a, b) => b.score - a.score || discoveryPriorityCompare(a.community, b.community));
  return { data: scored.slice(0, limit).map((item) => item.community), error: null };
}
export async function searchPublishedCommunities(term: string, filters: Omit<PublishedCommunityFilters, "platform"> & { platform?: CommunityPlatform } = {}): Promise<CommunityQueryResult<CommunityRow[]>> { const searchTerm = normalizeSearchTerm(term); if (!searchTerm) return getPublishedCommunities(filters); const category = await communityIdsForCategory(filters.categorySlug); if (category.error) return queryFailure(category.error, "Unable to search communities."); if (category.ids && category.ids.length === 0) return { data: [], error: null }; const supabase = createServerSupabaseClient(), pattern = `%${searchTerm}%`; const [{ data: textMatches, error: textError }, { data: categories, error: categoryError }] = await Promise.all([supabase.from("communities").select("*").eq("status", "published").or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(DISCOVERY_FETCH_LIMIT), supabase.from("categories").select("id").eq("is_active", true).ilike("name", pattern)]); if (textError) return queryFailure(textError, "Unable to search communities."); if (categoryError) return queryFailure(categoryError, "Unable to search communities."); let categoryMatches: CommunityRow[] = []; if (categories.length) { const { data: categoryLinks, error: linkError } = await supabase.from("community_categories").select("community_id").in("category_id", categories.map((category) => category.id)); if (linkError) return queryFailure(linkError, "Unable to search communities."); const ids = [...new Set(categoryLinks.map((link) => link.community_id))]; if (ids.length) { const { data, error } = await supabase.from("communities").select("*").eq("status", "published").in("id", ids).limit(DISCOVERY_FETCH_LIMIT); if (error) return queryFailure(error, "Unable to search communities."); categoryMatches = data ?? []; } } let matches = [...new Map([...textMatches, ...categoryMatches].map((community) => [community.id, community])).values()]; if (filters.categorySlug) { const allowed = new Set(category.ids ?? []); matches = matches.filter((community) => allowed.has(community.id)); } if (filters.platform) matches = matches.filter((community) => community.platform === filters.platform); matches = applyDiscoveryFilters(matches, filters); matches.sort((a, b) => { if (filters.sort === "members") { const memberDiff = (b.member_count ?? -1) - (a.member_count ?? -1); if (memberDiff !== 0) return memberDiff; } return discoveryPriorityCompare(a, b); }); return { data: matches.slice(0, MAX_SEARCH_RESULTS), error: null }; }
