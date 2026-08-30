import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Sidebar /><div className="content-shell"><Header />{children}</div><MobileNav /></div>;
}
