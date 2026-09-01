import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/features/auth/actions";

const nav = [
  ["Overview", "/admin", "overview"],
  ["Communities", "/admin#communities", "communities"],
  ["Moderation", "/admin#moderation", "moderation"],
  ["Owners", "/admin/owners", "owners"],
  ["Reports", "/admin/reports", "reports"],
  ["Verification", "/admin/verification", "verification"],
  ["Health", "/admin/health", "health"],
  ["Categories", "/admin/categories", "categories"],
  ["Audit Log", "/admin/audit", "audit"],
  ["Settings", "/admin/settings", "settings"],
] as const;

type Props = {
  children: ReactNode;
  active: (typeof nav)[number][2];
  title: string;
  eyebrow?: string;
  description?: string;
};

export function ControllerShell({ children, active, title, eyebrow = "CHATSCOUT CONTROLLER", description }: Props) {
  return (
    <div className="controller-shell">
      <aside className="controller-sidebar" aria-label="Controller navigation">
        <Link href="/admin" className="controller-brand" aria-label="ChatScout Controller home">
          <span className="controller-brand-mark">CS</span>
          <span><b>ChatScout</b><small>CONTROL CENTER</small></span>
        </Link>
        <nav className="controller-nav">
          <div className="controller-nav-group">
            <small>WORKSPACE</small>
            {nav.map(([label, href, key]) => <Link key={key} className={active === key ? "active" : ""} href={href}>{label}</Link>)}
          </div>
          <div className="controller-nav-group controller-nav-secondary">
            <small>ACCOUNT</small>
            <Link href="/admin/profile">Profile</Link>
            <form action={logoutAdmin}>
              <button type="submit">Sign out</button>
            </form>
          </div>
        </nav>
      </aside>
      <div className="controller-main">
        <header className="controller-topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          <Link href="/" target="_blank" className="admin-secondary controller-view-site">View public site ↗</Link>
        </header>
        <main className="controller-content">{children}</main>
      </div>
    </div>
  );
}
