import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SubmissionForm } from "@/components/submissions/submission-form";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

type SubmitPageProps = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/submit/login");

  const { success, error } = await searchParams;

  return (
    <PageShell>
      <main className="page-content form-page">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 14 }}>
          <Link href="/" className="back-link">← Back to discovery</Link>
          <Link href="/for-admins" className="admin-secondary">For community owners</Link>
        </div>
        <section className="form-panel">
          <p className="eyebrow">LIST YOUR COMMUNITY</p>
          <h1>Help people find your group chat.</h1>
          <p className="form-intro">Share the details people need before joining. ChatScout reviews the listing before it appears publicly.</p>
          {success ? (
            <div className="submission-success">
              <div className="submission-success-card">
                <strong>Listing submitted for review</strong>
                <p>Your community is safely in the review queue. ChatScout keeps it unpublished until the review is complete.</p>
              </div>
              <div className="submission-success-steps" aria-label="What happens next">
                <div><b>Submitted</b><span>Your community details have been received.</span></div>
                <div><b>Review</b><span>ChatScout checks the listing and its trust signals.</span></div>
                <div><b>Live</b><span>Approved listings become searchable on ChatScout.</span></div>
              </div>
              <div className="submission-success-actions">
                <Link className="primary-button list-button" href="/dashboard">Go to Dashboard</Link>
                <Link className="admin-secondary" href="/">Back to discovery</Link>
              </div>
            </div>
          ) : (
            <SubmissionForm error={error} />
          )}
        </section>
      </main>
    </PageShell>
  );
}
