import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Brand } from "./brand";

const primary = [["Home", "home"], ["Search", "search"], ["Categories", "grid"], ["Trending", "trend"], ["Bookmarks", "bookmark"]] as const;
const categories = ["Coding", "Students", "Anime", "Gaming", "Entrepreneurship", "Fitness", "Art & Design"];

export function Sidebar() {
  return <aside className="sidebar"><Brand /><nav aria-label="Main navigation">{primary.map(([label, icon], index) => <Link className={`side-link ${index === 0 ? "active" : ""}`} href="/" key={label}><Icon name={icon} size={18} />{label}</Link>)}</nav><p className="nav-label">Categories</p><nav aria-label="Categories">{categories.map((category) => <Link className="side-link category-link" href={`/?category=${encodeURIComponent(category)}`} key={category}><span className="category-dot" />{category}</Link>)}</nav><div className="sidebar-cta"><b>Can&apos;t find your people?</b><p>Tell us the kind of group chat you&apos;re looking for.</p><Link href="/submit">List your GC</Link></div><footer className="sidebar-footer">About · Contact · Privacy<br />© 2026 ChatScout</footer></aside>;
}
