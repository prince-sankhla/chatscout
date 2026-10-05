import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | ChatScout",
  description: "Privacy information for ChatScout visitors and community owners.",
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <main className="page-content detail-page">
        <Link href="/" className="back-link">← Back to discovery</Link>
        <section className="form-panel">
          <p className="eyebrow">CHATSCOUT</p>
          <h1>Privacy Policy</h1>
          <p>ChatScout collects limited information needed to operate discovery, analytics, authentication, submissions, and trust-and-safety workflows.</p>
          <h2>Information we may process</h2>
          <p>This can include account details you provide, community listing information, reports, and standard product analytics such as pages viewed and referral information.</p>
          <h2>Third-party community links</h2>
          <p>ChatScout links to communities hosted by third-party platforms. Those platforms may collect information under their own privacy policies once you leave ChatScout.</p>
          <h2>Saved communities</h2>
          <p>Saved communities are stored locally in your browser for the directory's save feature unless a future product experience explicitly says otherwise.</p>
          <h2>Questions</h2>
          <p>For privacy or data questions, use the support/contact channel provided for the ChatScout product.</p>
        </section>
      </main>
    </PageShell>
  );
}
