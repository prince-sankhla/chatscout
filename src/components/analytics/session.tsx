"use client";

import { useEffect } from "react";
import { trackGAEvent } from "@/components/analytics/google";

const COOKIE = "cs_analytics_session";
const STORAGE = "cs_analytics_session";

export function AnalyticsSession() {
  useEffect(() => {
    try {
      let value = localStorage.getItem(STORAGE);
      if (!value) { value = crypto.randomUUID(); localStorage.setItem(STORAGE, value); }
      document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch { /* analytics is best effort */ }

    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      const communityMatch = href.match(/^\/community\/([^/?#]+)/);
      const joinMatch = href.match(/^\/join\/([^/?#]+)/);
      if (joinMatch) {
        trackGAEvent("join_community", { community_slug: decodeURIComponent(joinMatch[1]) });
      } else if (communityMatch) {
        trackGAEvent("community_click", { community_slug: decodeURIComponent(communityMatch[1]) });
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
  return null;
}
