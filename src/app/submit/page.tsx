import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { submitCommunity } from "@/features/submissions/actions";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

type SubmitPageProps = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/submit/login");
  const { success, error } = await searchParams;
  return <PageShell><main className="page-content form-page"><Link href="/" className="back-link">← Back to discovery</Link><section className="form-panel"><p className="eyebrow">LIST YOUR COMMUNITY</p><h1>Help people find your group chat.</h1><p className="form-intro">Share a few details and we&apos;ll review your Instagram community before it appears on ChatScout.</p>{success ? <p className="form-message success">Thanks — your community is pending review.</p> : <form action={submitCommunity} className="community-form"><label>Community name<input name="communityName" required maxLength={120} /></label><label>Instagram invite URL<input name="inviteUrl" type="url" required placeholder="https://www.instagram.com/..." /></label><label>Description<textarea name="description" required maxLength={2000} rows={5} /></label><label>Category<select name="categoryName" required defaultValue=""><option value="" disabled>Select a category</option><option>Coding</option><option>Students</option><option>Anime</option><option>Gaming</option><option>Entrepreneurship</option><option>Fitness</option><option>Art &amp; Design</option></select></label><div className="form-row"><label>Language<input name="language" maxLength={80} placeholder="e.g. English" /></label><label>Region<input name="region" maxLength={120} placeholder="e.g. Jaipur" /></label></div><div className="form-row"><label>Approx. member count<input name="memberCount" type="number" min="0" step="1" /></label><label>Contact (optional)<input name="contact" maxLength={200} /></label></div>{error && <p className="form-message error">Please check the required details and use a valid Instagram invite URL.</p>}<button className="primary-button form-submit" type="submit">Submit for review</button></form>}</section></main></PageShell>;
}
