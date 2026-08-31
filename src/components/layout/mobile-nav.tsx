import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { createServerAuthClient } from "@/lib/supabase/auth";

export async function MobileNav() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/"><Icon name="home" /><span>Home</span></Link><Link href="/search"><Icon name="search" /><span>Search</span></Link><Link href="/categories"><Icon name="grid" /><span>Categories</span></Link><Link href="/trending"><Icon name="trend" /><span>Trending</span></Link><Link href={user ? "/dashboard" : "/saved"}><Icon name={user ? "user" : "bookmark"} /><span>{user ? "Dashboard" : "Saved"}</span></Link></nav>;
}
