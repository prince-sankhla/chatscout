"use client";

import { useEffect } from "react";

const COOKIE = "cs_analytics_session";
const STORAGE = "cs_analytics_session";

export function AnalyticsSession() {
  useEffect(() => {
    try {
      let value = localStorage.getItem(STORAGE);
      if (!value) { value = crypto.randomUUID(); localStorage.setItem(STORAGE, value); }
      document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch { /* analytics is best effort */ }
  }, []);
  return null;
}
