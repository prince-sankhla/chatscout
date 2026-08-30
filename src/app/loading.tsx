import { PageShell } from "@/components/layout/page-shell";

export default function Loading() {
  return <PageShell><main className="platform-page loading-page" aria-label="Loading communities" aria-busy="true"><section className="platform-heading"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-copy" /></section><div className="skeleton-grid">{Array.from({ length: 4 }, (_, index) => <article className="skeleton skeleton-card" key={index} />)}</div></main></PageShell>;
}
