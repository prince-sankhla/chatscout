import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Terms of Use | ChatScout",
  description: "Terms governing use of ChatScout community discovery listings.",
};

export default function TermsPage() {
  return (
    <PageShell>
      <main className="page-content detail-page">
        <Link href="/" className="back-link">← Back to discovery</Link>
        <section className="form-panel">
          <p className="eyebrow">CHATSCOUT</p>
          <h1>Terms of Use</h1>
          <p>ChatScout is a community discovery directory. Listings are provided for discovery convenience and may change or become unavailable.</p>
          <h2>Using ChatScout</h2>
          <p>Use ChatScout lawfully and do not submit or promote content that is fraudulent, abusive, unsafe, or otherwise prohibited by the platform hosting the community.</p>
          <h2>Community listings</h2>
          <p>ChatScout does not own or operate the third-party communities linked from the directory. A listing, badge, or trust signal is not a guarantee of community behavior, membership, or platform availability.</p>
          <h2>External platforms</h2>
          <p>When you join a community, you leave ChatScout and interact with the original platform under its own rules and privacy policies.</p>
          <h2>Contact</h2>
          <p>For listing corrections or trust-and-safety concerns, use the report flow available on community pages.</p>
        </section>
      </main>
    </PageShell>
  );
}
