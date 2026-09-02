"use client";

import { useEffect } from "react";
import type { AnalyticsEventName, Json } from "@/types/database";
import { trackGAEvent } from "@/components/analytics/google";

const COOKIE = "cs_analytics_session";
const STORAGE = "cs_analytics_session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSessionId() {
  try {
    let value = localStorage.getItem(STORAGE);
    if (!value || !UUID.test(value)) { value = crypto.randomUUID(); localStorage.setItem(STORAGE, value); }
    document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    return value;
  } catch { return null; }
}

function metadata(extra: Record<string, Json> = {}) {
  const params = new URLSearchParams(window.location.search);
  let referrerHost = "";
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch { /* ignore */ }
  const utmSource = params.get("utm_source")?.trim().slice(0, 60) ?? "";
  const utmMedium = params.get("utm_medium")?.trim().slice(0, 60) ?? "";
  const utmCampaign = params.get("utm_campaign")?.trim().slice(0, 100) ?? "";
  return { landing_page: window.location.pathname, referrer_host: referrerHost, ...(utmSource ? { utm_source: utmSource } : {}), ...(utmMedium ? { utm_medium: utmMedium } : {}), ...(utmCampaign ? { utm_campaign: utmCampaign } : {}), ...extra };
}

type Props = {
  eventName: AnalyticsEventName;
  communityId?: string;
  categoryId?: string;
  dedupeKey?: string;
  metadata?: Record<string, Json>;
};

export function TrackEvent({ eventName, communityId, categoryId, dedupeKey, metadata: extra = {} }: Props) {
  useEffect(() => {
    const key = `cs_tracked:${dedupeKey ?? `${eventName}:${window.location.pathname}:${communityId ?? categoryId ?? ""}`}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* best effort */ }
    const eventMetadata = metadata(extra);
    trackGAEvent(eventName, {
      community_id: communityId,
      category_id: categoryId,
      ...eventMetadata,
    });
    const sessionId = getSessionId();
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ eventName, communityId, categoryId, anonymousSessionId: sessionId, metadata: eventMetadata }),
    }).catch(() => undefined);
  }, [eventName, communityId, categoryId, dedupeKey, extra]);
  return null;
}
