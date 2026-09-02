"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

const links = [
  { href: "/", label: "Home", icon: "home" as const, match: (path: string) => path === "/" },
  { href: "/categories", label: "Categories", icon: "grid" as const, match: (path: string) => path === "/categories" || path.startsWith("/categories/") },
  { href: "/trending", label: "Trending", icon: "trend" as const, match: (path: string) => path === "/trending" || path.startsWith("/trending/") },
  { href: "/new", label: "New GCs", match: (path: string) => path === "/new" || path.startsWith("/new/") },
  { href: "/for-admins", label: "For Owners", owner: true, match: (path: string) => path === "/for-admins" || path.startsWith("/for-admins/") },
] as const;

export function ActiveNav() {
  const pathname = usePathname();
  return <>{links.map((link) => {
    const active = link.match(pathname);
    return <Link key={link.href} href={link.href} className={`${active ? "active" : ""}${link.owner ? " owner-nav-link" : ""}`} aria-current={active ? "page" : undefined}>
      {"icon" in link && link.icon ? <Icon name={link.icon} size={15} /> : null}{link.label}
    </Link>;
  })}</>;
}

const mobileLinks = [
  { href: "/", label: "Home", icon: "home" as const, match: (path: string) => path === "/" },
  { href: "/search", label: "Search", icon: "search" as const, match: (path: string) => path === "/search" },
  { href: "/categories", label: "Categories", icon: "grid" as const, match: (path: string) => path === "/categories" || path.startsWith("/categories/") },
  { href: "/trending", label: "Trending", icon: "trend" as const, match: (path: string) => path === "/trending" || path.startsWith("/trending/") },
] as const;

export function ActiveMobileNav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const finalLinks = [
    ...mobileLinks,
    {
      href: authenticated ? "/dashboard" : "/saved",
      label: authenticated ? "Dashboard" : "Saved",
      icon: "bookmark" as const,
      match: (path: string) => authenticated ? path === "/dashboard" || path.startsWith("/dashboard/") : path === "/saved" || path.startsWith("/saved/"),
    },
  ];
  return <>{finalLinks.map((link) => {
    const active = link.match(pathname);
    return <Link key={link.href} href={link.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <Icon name={link.icon} /><span>{link.label}</span>
    </Link>;
  })}</>;
}
