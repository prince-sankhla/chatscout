import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Header />{children}<MobileNav /></div>;
}
