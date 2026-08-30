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
  return <PageShell><main className="page-content form-page"><Link href="/" className="back-link">← Back to discovery</Link><section className="form-panel"><p className="eyebrow">LIST YOUR COMMUNITY</p><h1>Help people find your group chat.</h1><p className="form-intro">Share a few details and we&apos;ll review your Instagram community before it appears on ChatScout.</p>{success ? <p className="form-message success">Thanks — your community is pending review.</p> : <SubmissionForm error={error} />}</section></main></PageShell>;
}
