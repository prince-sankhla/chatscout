import "server-only";

import type { CommunityPlatform, CommunityRow } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchPublishedCommunityPage } from "@/features/communities/published-page";

export type ParsedIntent = {
  normalizedQuery: string;
  tokens: string[];
  goal: string | null;
  platform: CommunityPlatform | null;
  region: string | null;
  language: string | null;
  categorySlug: string | null;
  summary: string;
};

export type IntentSearchFilters = {
  categorySlug?: string;
  platform?: CommunityPlatform;
  language?: string;
  region?: string;
  age?: "any" | "everyone" | "13+" | "16+" | "18+";
  minMembers?: number;
  maxMembers?: number;
};

export type IntentSearchResult = {
  data: CommunityRow[];
  total: number;
  intent: ParsedIntent;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "can", "chat", "chats", "community", "communities",
  "for", "from", "group", "groups", "i", "in", "is", "it", "me", "my", "need", "of",
  "on", "people", "please", "server", "servers", "the", "this", "to", "want", "with",
  "looking", "find", "show", "some", "join", "near", "nearby", "best", "give", "get",
  "help", "something", "where", "like", "just", "any", "anyone", "place", "places",
]);

const PLATFORM_ALIASES: Array<[CommunityPlatform, string[]]> = [
  ["whatsapp", ["whatsapp", "wa"]],
  ["telegram", ["telegram", "tg"]],
  ["discord", ["discord"]],
  ["instagram", ["instagram", "insta"]],
];

const REGION_ALIASES: Array<[string, string[]]> = [
  ["Jaipur", ["jaipur"]],
  ["Delhi", ["delhi", "new delhi"]],
  ["Mumbai", ["mumbai", "bombay"]],
  ["Bengaluru", ["bengaluru", "bangalore"]],
  ["Hyderabad", ["hyderabad"]],
  ["Pune", ["pune"]],
  ["Chennai", ["chennai", "madras"]],
  ["Kolkata", ["kolkata", "calcutta"]],
  ["Ahmedabad", ["ahmedabad"]],
  ["Lucknow", ["lucknow"]],
  ["Indore", ["indore"]],
  ["Kota", ["kota"]],
  ["Chandigarh", ["chandigarh"]],
  ["Noida", ["noida"]],
  ["Gurgaon", ["gurgaon", "gurugram"]],
];

const LANGUAGE_ALIASES: Array<[string, string[]]> = [
  ["Tamil", ["tamil"]],
  ["Malayalam", ["malayalam", "mallu"]],
  ["Hindi", ["hindi"]],
  ["Marathi", ["marathi"]],
  ["Bengali", ["bengali", "bangla"]],
  ["Telugu", ["telugu"]],
  ["Kannada", ["kannada"]],
];

const INTENT_RULES: Array<{ goal: string; categorySlug: string | null; terms: string[]; label: string }> = [
  { goal: "competitive-exams", categorySlug: "competitive-exams", terms: ["jee", "neet", "upsc", "ias", "ssc", "cat", "gate", "exam", "mock", "preparation"], label: "Competitive exams" },
  { goal: "coding", categorySlug: "coding", terms: ["coding", "programming", "developer", "developers", "software", "javascript", "typescript", "python", "react", "node", "webdev", "tech", "ai", "ml"], label: "Coding & technology" },
  { goal: "career", categorySlug: "career-jobs", terms: ["job", "jobs", "career", "hiring", "vacancy", "internship", "internships", "placement", "placements", "recruiter"], label: "Jobs & careers" },
  { goal: "education", categorySlug: "study-education", terms: ["study", "student", "students", "college", "exam", "preparation", "education", "bca", "notes"], label: "Study & education" },
  { goal: "gaming", categorySlug: "gaming", terms: ["gaming", "gamer", "gamers", "valorant", "minecraft", "fortnite", "esports", "esport", "freefire", "pubg"], label: "Gaming" },
  { goal: "anime", categorySlug: "anime-fandom", terms: ["anime", "manga", "otaku", "naruto", "onepiece", "bleach", "jjk", "fandom"], label: "Anime & fandom" },
  { goal: "startups", categorySlug: null, terms: ["startup", "startups", "founder", "founders", "entrepreneur", "entrepreneurs", "business", "saas", "indie"], label: "Startups & founders" },
  { goal: "creators", categorySlug: null, terms: ["youtube", "creator", "creators", "influencer", "influencers", "content", "subscriber", "subscribers", "audience", "promotion"], label: "Creators & audience" },
  { goal: "finance", categorySlug: null, terms: ["stock", "stocks", "trading", "trader", "investing", "investment", "finance", "mutual", "crypto"], label: "Finance & investing" },
  { goal: "social", categorySlug: null, terms: ["friend", "friends", "friendship", "meet", "social", "hangout", "networking", "network"], label: "Friends & social" },
  { goal: "fitness", categorySlug: null, terms: ["fitness", "gym", "workout", "running", "calisthenics", "bodybuilding", "health"], label: "Fitness & health" },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

function hasWholeToken(value: string, token: string) {
  return new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?=\\s|$)`, "i").test(value);
}

function detectAlias(value: string, aliases: Array<[string, string[]]>) {
  const found = aliases.find(([, variants]) => variants.some((variant) => hasWholeToken(value, normalize(variant))));
  return found?.[0] ?? null;
}

export function parseSearchIntent(input: string): ParsedIntent {
  const normalizedQuery = normalize(input);
  const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokens = [...new Set(rawTokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token)))].slice(0, 12);
  const tokenSet = new Set(tokens);
  const platform = detectAlias(normalizedQuery, PLATFORM_ALIASES);
  const region = detectAlias(normalizedQuery, REGION_ALIASES);
  const language = detectAlias(normalizedQuery, LANGUAGE_ALIASES);
  const rule = INTENT_RULES
    .map((candidate) => ({ candidate, hits: candidate.terms.filter((term) => tokenSet.has(term)).length }))
    .sort((a, b) => b.hits - a.hits)[0];
  const goal = rule && rule.hits > 0 ? rule.candidate : null;
  const categorySlug = goal?.categorySlug ?? null;
  const parts = [goal?.label ?? null, platform ? platform[0].toUpperCase() + platform.slice(1) : null, region, language].filter(Boolean);
  return {
    normalizedQuery,
    tokens,
    goal: goal?.goal ?? null,
    platform,
    region,
    language,
    categorySlug,
    summary: parts.length ? parts.join(" • ") : "Keyword search",
  };
}

function contains(text: string, token: string) {
  return Boolean(text) && text.includes(token);
}

function scoreCommunity(community: CommunityRow, tokens: string[], parsed: ParsedIntent, categoryId: string | null, categoryIds: Set<string>) {
  const name = normalize(community.name);
  const description = normalize(community.description ?? "");
  const language = normalize(community.language ?? "");
  const region = normalize(community.region ?? "");
  const tags = (community.tags ?? []).map((tag) => normalize(tag)).join(" ");
  const combined = `${name} ${description} ${language} ${region} ${tags}`;
  let score = 0;

  for (const token of tokens) {
    if (contains(name, token)) score += 7;
    if (contains(description, token)) score += 3;
    if (contains(tags, token)) score += 4;
    if (contains(language, token)) score += 2;
    if (contains(region, token)) score += 4;
  }

  if (parsed.normalizedQuery && combined.includes(parsed.normalizedQuery)) score += 10;
  if (parsed.goal) {
    const rule = INTENT_RULES.find((candidate) => candidate.goal === parsed.goal);
    if (rule?.terms.some((term) => combined.includes(term))) score += 8;
  }
  if (parsed.platform && community.platform === parsed.platform) score += 5;
  if (parsed.region && region.includes(parsed.region.toLowerCase())) score += 9;
  if (parsed.language && language.includes(parsed.language.toLowerCase())) score += 4;
  if (categoryId && categoryIds.has(community.id)) score += 11;
  if (community.verification_status === "verified") score += 2;
  if (community.health_status === "healthy") score += 1;
  if (community.member_count !== null) score += Math.min(1.5, Math.log10(Math.max(community.member_count, 1)) * 0.25);

  if (community.published_at) {
    const ageDays = Math.max(0, (Date.now() - new Date(community.published_at).getTime()) / 86400000);
    if (ageDays <= 30) score += 1;
    else if (ageDays <= 90) score += 0.5;
  }

  return score;
}

export async function searchPublishedCommunitiesByIntent(
  term: string,
  filters: IntentSearchFilters = {},
  page = 1,
  pageSize = 48,
): Promise<IntentSearchResult> {
  const parsed = parseSearchIntent(term);
  const effectivePlatform = filters.platform ?? parsed.platform ?? undefined;
  const effectiveRegion = filters.region && filters.region !== "any" ? filters.region : parsed.region ?? undefined;
  const effectiveLanguage = filters.language && filters.language !== "any" ? filters.language : parsed.language ?? undefined;
  const effectiveCategory = filters.categorySlug ?? parsed.categorySlug ?? undefined;
  const supabase = createServerSupabaseClient();

  if (!parsed.tokens.length) {
    const fallback = await searchPublishedCommunityPage(term, filters, page, pageSize);
    return {
      data: fallback.data?.data ?? [],
      total: fallback.data?.total ?? 0,
      intent: parsed,
    };
  }

  let categoryId: string | null = null;
  if (effectiveCategory) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", effectiveCategory).eq("is_active", true).maybeSingle();
    categoryId = category?.id ?? null;
  }

  let query = supabase.from("communities").select("*").eq("status", "published");
  if (effectivePlatform) query = query.eq("platform", effectivePlatform);
  if (effectiveLanguage) query = query.ilike("language", `%${effectiveLanguage.trim()}%`);
  if (effectiveRegion) query = query.ilike("region", `%${effectiveRegion.trim()}%`);
  if (filters.minMembers !== undefined) query = query.gte("member_count", filters.minMembers);
  if (filters.maxMembers !== undefined) query = query.lte("member_count", filters.maxMembers);
  if (filters.age && filters.age !== "any") {
    if (filters.age === "everyone") query = query.or("age_restriction.is.null,age_restriction.ilike.*everyone*,age_restriction.ilike.*no restriction*,age_restriction.ilike.*all ages*");
    else query = query.ilike("age_restriction", `%${filters.age}%`);
  }

  if (categoryId) {
    const { data: links } = await supabase.from("community_categories").select("community_id").eq("category_id", categoryId);
    const ids = [...new Set((links ?? []).map((row) => row.community_id))];
    if (!ids.length) return { data: [], total: 0, intent: parsed };
    query = query.in("id", ids);
  }

  const queryTokens = parsed.tokens.slice(0, 8);
  const conditions = queryTokens.flatMap((token) => {
    const value = token.replace(/[%_(),]/g, " ").trim();
    if (!value) return [];
    const pattern = `%${value}%`;
    return [`name.ilike.${pattern}`, `description.ilike.${pattern}`, `language.ilike.${pattern}`, `region.ilike.${pattern}`];
  });
  if (conditions.length) query = query.or(conditions.join(","));

  const { data, error } = await query.order("published_at", { ascending: false, nullsFirst: false }).limit(240);
  if (error) return { data: [], total: 0, intent: parsed };

  const rows = (data ?? []) as CommunityRow[];
  const categoryIds = new Set<string>();
  if (rows.length) {
    const { data: links } = await supabase.from("community_categories").select("community_id,category_id").in("community_id", rows.map((row) => row.id));
    for (const link of links ?? []) if (!categoryId || link.category_id === categoryId) categoryIds.add(link.community_id);
  }

  const ranked = rows
    .map((community) => ({ community, score: scoreCommunity(community, queryTokens, parsed, categoryId, categoryIds) }))
    .sort((a, b) => b.score - a.score || (b.community.member_count ?? 0) - (a.community.member_count ?? 0) || String(b.community.published_at ?? "").localeCompare(String(a.community.published_at ?? "")) || a.community.id.localeCompare(b.community.id));

  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(12, Math.min(60, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  return { data: ranked.slice(from, from + safeSize).map((entry) => entry.community), total: ranked.length, intent: parsed };
}
