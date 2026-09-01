import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/features/analytics/data-access";
import type { AnalyticsEventName, Json } from "@/types/database";

const EVENTS = new Set<AnalyticsEventName>(["search", "category_view", "community_view", "join_click"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEYS = new Set(["query", "result_count", "category_slug", "landing_page", "source", "referrer_host", "utm_source", "utm_medium", "utm_campaign"]);

function cleanMetadata(value: unknown): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, Json> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!KEYS.has(key)) continue;
    if (typeof raw === "string") result[key] = raw.trim().slice(0, 160);
    else if (typeof raw === "number" && Number.isFinite(raw)) result[key] = raw;
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventName = typeof body?.eventName === "string" ? body.eventName as AnalyticsEventName : null;
    if (!eventName || !EVENTS.has(eventName)) return NextResponse.json({ ok: false }, { status: 400 });
    const session = typeof body?.anonymousSessionId === "string" && UUID.test(body.anonymousSessionId) ? body.anonymousSessionId : null;
    const communityId = typeof body?.communityId === "string" && UUID.test(body.communityId) ? body.communityId : null;
    const categoryId = typeof body?.categoryId === "string" && UUID.test(body.categoryId) ? body.categoryId : null;
    if ((eventName === "community_view" || eventName === "join_click") && !communityId) return NextResponse.json({ ok: false }, { status: 400 });
    if (eventName === "category_view" && !categoryId) return NextResponse.json({ ok: false }, { status: 400 });
    if (eventName === "search" && !cleanMetadata(body?.metadata).query) return NextResponse.json({ ok: true }, { status: 204 });
    const ok = await recordAnalyticsEvent({ eventName, communityId, categoryId, anonymousSessionId: session, metadata: cleanMetadata(body?.metadata) });
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
