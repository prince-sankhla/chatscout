"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./mobile-nav";

const WORKSPACE_PREFIXES = ["/dashboard", "/admin", "/brand"] as const;

export function RouteAwareMobileNav() {
  const pathname = usePathname();
  const isWorkspace = WORKSPACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isWorkspace) return null;
  return <MobileNav />;
}
