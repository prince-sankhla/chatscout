import "server-only";
import { cookies, headers } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json, AnalyticsEventName } from "@/types/database";

export const ANALYTICS_SESSION_COOKIE = "cs_analytics_session";
const EVENTS: AnalyticsEventName[] = ["search", "category_view", "community_view", "join_click"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value?: string | null) { return value && UUID.test(value) ? value : null; }
function text(value: unknown, max = 160) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

async function context() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const sessionId = uuid(cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value);
  const raw = text(headerStore.get("referer"), 500);
  let host = "";
  try { host = raw ? new URL(raw).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch { /* ignore */ }
  return { sessionId, host };
}

function sourceFor(source: string, referrer: string) {
  if (source) return source;
  if (!referrer) return "direct";
  if (referrer.includes("instagram.")) return "instagram";
  if (referrer.includes("google.")) return "google";
  if (referrer.includes("whatsapp.")) return "whatsapp";
  if (referrer === "chatscout-ten.vercel.app") return "internal";
  return referrer;
}

export async function recordAnalyticsEvent(input: { eventName: AnalyticsEventName; communityId?: string | null; categoryId?: string | null; anonymousSessionId?: string | null; metadata?: Record<string, Json> | null }) {
  if (!EVENTS.includes(input.eventName)) return false;
  const ctx = await context();
  const meta: Record<string, Json> = { ...(input.metadata ?? {}) };
  const referrer = text(meta.referrer_host, 160) || ctx.host;
  meta.source = sourceFor(text(meta.source, 60), referrer);
  meta.referrer_host = referrer || null;
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({
    event_name: input.eventName,
    community_id: input.communityId ?? null,
    category_id: input.categoryId ?? null,
    anonymous_session_id: uuid(input.anonymousSessionId) ?? ctx.sessionId,
    metadata: meta,
  });
  return !error;
}

export function recordCommunityView(communityId: string, metadata?: Record<string, Json>) { return recordAnalyticsEvent({ eventName: "community_view", communityId, metadata }); }
export function recordJoinClick(communityId: string, metadata?: Record<string, Json>) { return recordAnalyticsEvent({ eventName: "join_click", communityId, metadata }); }
export function recordSearch(query: string, resultCount?: number, metadata?: Record<string, Json>) {
  const value = text(query, 100); if (!value) return Promise.resolve(false);
  return recordAnalyticsEvent({ eventName: "search", metadata: { query: value, ...(typeof resultCount === "number" ? { result_count: resultCount } : {}), ...(metadata ?? {}) } });
}
export function recordCategoryView(categoryId: string, categorySlug: string, metadata?: Record<string, Json>) { return recordAnalyticsEvent({ eventName: "category_view", categoryId, metadata: { category_slug: categorySlug, ...(metadata ?? {}) } }); }

export type AnalyticsRange = 1 | 7 | 30 | 90;
export type AnalyticsDashboardData = {
  range: AnalyticsRange; since: string;
  overview: { views: number; joins: number; searches: number; categoryViews: number; sessions: number; conversion: number };
  trend: { label: string; views: number; joins: number }[];
  communities: { id: string; name: string; views: number; joins: number; conversion: number }[];
  searches: { query: string; count: number }[];
  categories: { id: string; name: string; views: number; joins: number }[];
  sources: { source: string; count: number }[];
};

export async function getAnalyticsDashboardData(range: AnalyticsRange = 7): Promise<AnalyticsDashboardData> {
  const since = new Date(Date.now() - range * 86_400_000).toISOString();
  const empty = { range, since, overview: { views: 0, joins: 0, searches: 0, categoryViews: 0, sessions: 0, conversion: 0 }, trend: [], communities: [], searches: [], categories: [], sources: [] };
  const supabase = createAdminSupabaseClient();
  const { data: events, error } = await supabase.from("analytics_events").select("event_name,community_id,category_id,anonymous_session_id,metadata,occurred_at").gte("occurred_at", since).order("occurred_at", { ascending: true }).limit(50_000);
  if (error) return empty;

  const overview = { views: 0, joins: 0, searches: 0, categoryViews: 0 };
  const sessions = new Set<string>();
  const byCommunity = new Map<string, { views: number; joins: number }>();
  const byCategory = new Map<string, { views: number; joins: number }>();
  const searches = new Map<string, number>();
  const sources = new Map<string, number>();
  const trend = new Map<string, { views: number; joins: number }>();
  const keyFor = (value: string) => range === 1 ? `${String(new Date(value).getUTCHours()).padStart(2, "0")}:00` : new Date(value).toISOString().slice(0, 10);

  for (const event of events ?? []) {
    if (event.anonymous_session_id) sessions.add(event.anonymous_session_id);
    const source = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) && typeof event.metadata.source === "string" ? event.metadata.source : "direct";
    sources.set(source, (sources.get(source) ?? 0) + 1);
    const point = trend.get(keyFor(event.occurred_at)) ?? { views: 0, joins: 0 };
    if (event.event_name === "community_view") {
      overview.views++; point.views++;
      if (event.community_id) { const value = byCommunity.get(event.community_id) ?? { views: 0, joins: 0 }; value.views++; byCommunity.set(event.community_id, value); }
      if (event.category_id) { const value = byCategory.get(event.category_id) ?? { views: 0, joins: 0 }; value.views++; byCategory.set(event.category_id, value); }
    } else if (event.event_name === "join_click") {
      overview.joins++; point.joins++;
      if (event.community_id) { const value = byCommunity.get(event.community_id) ?? { views: 0, joins: 0 }; value.joins++; byCommunity.set(event.community_id, value); }
      if (event.category_id) { const value = byCategory.get(event.category_id) ?? { views: 0, joins: 0 }; value.joins++; byCategory.set(event.category_id, value); }
    } else if (event.event_name === "search") {
      overview.searches++;
      const query = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) && typeof event.metadata.query === "string" ? event.metadata.query.trim().toLowerCase() : "";
      if (query) searches.set(query, (searches.get(query) ?? 0) + 1);
    } else if (event.event_name === "category_view") overview.categoryViews++;
    trend.set(keyFor(event.occurred_at), point);
  }

  const communityIds = [...byCommunity.keys()];
  const categoryIds = [...byCategory.keys()];
  const [communityResult, categoryResult, linksResult] = await Promise.all([
    communityIds.length ? supabase.from("communities").select("id,name").in("id", communityIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? supabase.from("categories").select("id,name").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    communityIds.length ? supabase.from("community_categories").select("community_id,category_id").in("community_id", communityIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const links = new Map<string, string[]>();
  for (const link of linksResult.data ?? []) links.set(link.community_id, [...(links.get(link.community_id) ?? []), link.category_id]);
  for (const [communityId, cats] of links) {
    const value = byCommunity.get(communityId); if (!value) continue;
    for (const categoryId of cats) {
      const category = byCategory.get(categoryId) ?? { views: 0, joins: 0 };
      category.views += value.views; category.joins += value.joins; byCategory.set(categoryId, category);
    }
  }
  const names = new Map((categoryResult.data ?? []).map((item) => [item.id, item.name]));
  const communities = (communityResult.data ?? []).map((item) => { const value = byCommunity.get(item.id) ?? { views: 0, joins: 0 }; return { id: item.id, name: item.name, ...value, conversion: value.views ? Number((value.joins / value.views * 100).toFixed(1)) : 0 }; }).sort((a,b) => (b.joins*10+b.views)-(a.joins*10+a.views)).slice(0,10);
  const categories = [...byCategory.entries()].map(([id,value]) => ({ id, name: names.get(id) ?? "Unknown category", ...value })).sort((a,b) => (b.joins*10+b.views)-(a.joins*10+a.views)).slice(0,10);
  return {
    range, since,
    overview: { ...overview, sessions: sessions.size, conversion: overview.views ? Number((overview.joins / overview.views * 100).toFixed(1)) : 0 },
    trend: [...trend.entries()].map(([label,value]) => ({ label, ...value })),
    communities,
    searches: [...searches.entries()].map(([query,count]) => ({ query,count })).sort((a,b) => b.count-a.count).slice(0,10),
    categories,
    sources: [...sources.entries()].map(([source,count]) => ({ source,count })).sort((a,b) => b.count-a.count).slice(0,10),
  };
}
