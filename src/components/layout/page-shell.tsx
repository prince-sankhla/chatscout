import type { ReactNode } from "react";
import { Header } from "./header";
import { RouteAwareMobileNav } from "./route-aware-mobile-nav";
import { AnalyticsSession } from "@/components/analytics/session";
import { Footer } from "./footer";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><AnalyticsSession /> <Header />{children}<Footer /><RouteAwareMobileNav /></div>;
}
