import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  return <header className="neon-header"><Link className="neon-brand" href="/" aria-label="ChatScout home"><Image src="/brand/chatscout-logo.png" alt="" width={1254} height={1254} priority /><span><b>Chat<span>Scout</span></b><small>FIND YOUR NEXT GROUP CHAT.</small></span></Link><nav className="desktop-nav" aria-label="Main navigation"><Link className="active" href="/">⌂ Home</Link><Link href="/?category=all">Categories</Link><Link href="/?q=trending">Trending</Link><Link href="/?q=new">New GCs</Link><Link href="/#footer">Blog</Link><Link href="/#footer">About Us</Link></nav><div className="neon-actions"><button className="plain-icon" aria-label="Search"><Icon name="search" /></button><ThemeToggle /><Link className="neon-cta" href="/submit">＋ List Your GC</Link></div></header>;
}
