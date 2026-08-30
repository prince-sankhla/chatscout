import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export function Header() {
  return <header className="topbar"><form className="top-search" role="search"><Icon name="search" size={17} /><input aria-label="Search communities" placeholder="Search communities, topics..." /><kbd>⌘K</kbd></form><div className="top-actions"><ThemeToggle /><Link className="primary-button list-button" href="/submit">+ List your GC</Link></div></header>;
}
