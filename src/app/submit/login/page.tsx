import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PageShell } from "@/components/layout/page-shell";
import { createServerAuthClient } from "@/lib/supabase/auth";

type SubmitLoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function SubmitLoginPage({ searchParams }: SubmitLoginPageProps) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/submit");
  const { error } = await searchParams;

  return <PageShell><main className="page-content form-page"><section className="form-panel submit-login-panel"><p className="eyebrow">LIST YOUR COMMUNITY</p><h1>Continue to submit your community.</h1><p className="form-intro">Sign in with Google so we can securely associate your submission with you and keep you updated during review.</p><GoogleSignInButton />{error && <p className="form-message error">Google sign-in was not completed. Please try again.</p>}</section></main></PageShell>;
}
