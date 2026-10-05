import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <main className="page-content detail-page">
        <section className="form-panel" role="status">
          <p className="eyebrow">404 · CHATSCOUT</p>
          <h1>Community page not found.</h1>
          <p>The page may have been removed, archived, or the link may be incorrect.</p>
          <div className="submission-success-actions">
            <Link href="/search" className="primary-button list-button">Find communities</Link>
            <Link href="/" className="admin-secondary">Back to discovery</Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
