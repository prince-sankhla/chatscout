import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createServerAuthClient } from "@/lib/supabase/auth";

export async function Header() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : user?.email?.split("@")[0] ?? "Your dashboard";
  const initial = displayName.slice(0, 1).toUpperCase() || "U";

  return <header className="neon-header"><Link className="neon-brand" href="/" aria-label="ChatScout home"><Image src="/brand/chatscout-logo.png" alt="" width={1254} height={1254} priority /><span><b>Chat<span>Scout</span></b><small>FIND YOUR NEXT GROUP CHAT.</small></span></Link><nav className="desktop-nav" aria-label="Main navigation"><Link className="active" href="/"><Icon name="home" size={15} />Home</Link><Link href="/categories">Categories</Link><Link href="/trending">Trending</Link><Link href="/new">New GCs</Link><Link href="/#footer">Blog</Link><Link href="/#footer">About Us</Link></nav><div className="neon-actions"><Link className="plain-icon" href="/search" aria-label="Search"><Icon name="search" /></Link><ThemeToggle />{user ? <Link className="header-dashboard-link" href="/dashboard" aria-label={`Open ${displayName} dashboard`}><span className="header-avatar" aria-hidden="true">{initial}</span><span className="header-dashboard-copy"><b>Dashboard</b><small>{displayName}</small></span></Link> : <Link className="neon-cta" href="/submit">List Your GC</Link>}</div></header>;
}
