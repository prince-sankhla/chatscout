"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActiveMobileNav } from "./active-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const PRIVATE_NAV_PREFIXES = ["/dashboard", "/admin", "/brand"] as const;

function hideMobileNav(pathname: string) {
  return PRIVATE_NAV_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MobileNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setAuthenticated(Boolean(session?.user));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthenticated(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (hideMobileNav(pathname)) return null;

  return <nav className="mobile-nav" aria-label="Mobile navigation"><ActiveMobileNav authenticated={authenticated} /></nav>;
}

// Keep mobile navigation isolated from server-only auth modules so Vercel can build the client bundle.
