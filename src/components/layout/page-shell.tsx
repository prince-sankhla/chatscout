import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { AnalyticsSession } from "@/components/analytics/session";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><AnalyticsSession /> <Header />{children}<MobileNav /></div>;
}
