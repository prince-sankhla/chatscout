"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGAEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, parameters);
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        id="google-analytics"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false});`}
      </Script>
      <GoogleAnalyticsPageView />
    </>
  );
}

function GoogleAnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    let attempts = 0;
    const send = () => {
      attempts += 1;
      if (typeof window.gtag === "function") {
        window.gtag("event", "page_view", {
          page_location: window.location.href,
          page_path: window.location.pathname,
          page_title: document.title,
        });
        return;
      }
      if (attempts < 20) window.setTimeout(send, 100);
    };

    send();
  }, [pathname]);

  return null;
}
