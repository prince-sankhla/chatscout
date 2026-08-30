import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function MobileNav() {
  return <nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/"><Icon name="home" /><span>Home</span></Link><Link href="/search"><Icon name="search" /><span>Search</span></Link><Link href="/categories"><Icon name="grid" /><span>Categories</span></Link><Link href="/trending"><Icon name="trend" /><span>Trending</span></Link><Link href="/saved"><Icon name="bookmark" /><span>Saved</span></Link></nav>;
}
