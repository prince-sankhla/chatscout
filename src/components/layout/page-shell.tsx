import type { ReactNode } from "react";
import { Header } from "./header";
import { RouteAwareMobileNav } from "./route-aware-mobile-nav";
import { AnalyticsSession } from "@/components/analytics/session";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><AnalyticsSession /> <Header />{children}<RouteAwareMobileNav /></div>;
}
