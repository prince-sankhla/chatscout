"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActiveMobileNav } from "./active-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function hideMobileNav(pathname: string) {
  return pathname === "/dashboard"
    || pathname.startsWith("/dashboard/")
    || pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/brand"
    || pathname.startsWith("/brand/");
}

export function MobileNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthenticated(Boolean(data.session?.user));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (hideMobileNav(pathname)) return null;

  return <nav className="mobile-nav" aria-label="Mobile navigation"><ActiveMobileNav authenticated={authenticated} /></nav>;
}
