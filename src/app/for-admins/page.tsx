import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "For Community Owners | ChatScout",
  description: "List, claim and keep your community information accurate on ChatScout.",
  alternates: { canonical: "/for-admins" },
  robots: { index: true, follow: true },
};

const steps = [
  ["users", "List your community", "Create a public, searchable listing with the details people need before joining."],
  ["check", "Claim when applicable", "Confirm ownership of an existing listing so your community information can stay current."],
  ["shield", "Keep the listing healthy", "Maintain an accurate invite, description, category and community profile."],
  ["spark", "Get discovered", "Reach people already searching ChatScout for communities by topic, language and location."],
] as const;

const benefits = [
  ["search", "More discoverability", "Complete listings can surface in ChatScout search, categories, related results and focused collections."],
  ["shield", "Clear trust signals", "Verification and health information help visitors judge whether a listing looks current and useful."],
  ["users", "Simple owner workflow", "Submit, claim and request updates without managing a separate marketing workspace."],
  ["spark", "Accurate information", "Keep the community name, invite and details aligned with the real community people will join."],
] as const;

export default function ForAdminsPage() {
  return (
    <PageShell>
      <main className="page-content">
        <section className="platform-heading">
          <p className="eyebrow">FOR COMMUNITY OWNERS</p>
          <h1>Make your community easier to discover.</h1>
          <p>ChatScout is a directory first. Owners get a straightforward way to list, claim and maintain a trusted public community profile.</p>
          <div className="neon-hero-actions">
            <Link className="hero-action primary" href="/submit">List Your Community <Icon name="arrow" size={14} /></Link>
            <Link className="hero-action" href="/dashboard">Open Owner Dashboard</Link>
          </div>
        </section>

        <section className="launch-section">
          <div className="launch-section-head">
            <div><p className="eyebrow">OWNER WORKFLOW</p><h2>Simple from listing to <span>maintenance.</span></h2></div>
          </div>
          <div className="launch-how-grid">
            {steps.map(([icon, title, copy], index) => (
              <article key={title} className="launch-how-card">
                <span className="launch-how-number">0{index + 1}</span>
                <span className="launch-platform-card"><Icon name={icon} size={18} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="launch-section">
          <div className="launch-section-head">
            <div><p className="eyebrow">WHY LIST?</p><h2>Discovery stays <span>front and center.</span></h2></div>
          </div>
          <div className="launch-how-grid">
            {benefits.map(([icon, title, copy]) => (
              <article key={title} className="launch-how-card">
                <span className="launch-how-number">•</span>
                <span className="launch-platform-card"><Icon name={icon} size={18} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="neon-bottom-cta">
          <div>
            <b><Icon name="shield" />Keep it current</b>
            <small>Accurate details and healthy invites make listings more useful to visitors.</small>
          </div>
          <div>
            <b><Icon name="search" />Be discoverable</b>
            <small>Complete listings can surface in search, category and related-community results.</small>
          </div>
          <Link href="/submit">List your community</Link>
        </section>
      </main>
    </PageShell>
  );
}
