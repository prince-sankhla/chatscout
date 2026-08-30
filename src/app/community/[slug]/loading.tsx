import { PageShell } from "@/components/layout/page-shell";

export default function CommunityLoading() {
  return <PageShell><main className="page-content detail-page loading-page" aria-label="Loading community" aria-busy="true"><span className="skeleton skeleton-back" /><section className="detail-hero"><div className="skeleton skeleton-detail-art" /><div className="detail-copy"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-copy" /><span className="skeleton skeleton-copy short" /></div></section></main></PageShell>;
}
