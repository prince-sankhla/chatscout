import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function MobileNav() {
  return <nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/"><Icon name="home" /><span>Home</span></Link><Link href="/"><Icon name="search" /><span>Search</span></Link><Link href="/"><Icon name="grid" /><span>Categories</span></Link><Link href="/"><Icon name="trend" /><span>Trending</span></Link><Link href="/"><Icon name="bookmark" /><span>Saved</span></Link></nav>;
}
