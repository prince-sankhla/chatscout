import Link from "next/link";
import { notFound } from "next/navigation";
import { createCommunityReport } from "@/features/moderation/trust-actions";
import { getPublishedCommunityBySlug } from "@/features/communities/data-access";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ report?: string }> };

export default async function ReportCommunityPage({ params, searchParams }: PageProps) {
  const slug = (await params).slug;
  const result = await getPublishedCommunityBySlug(slug);
  if (result.error || !result.data) notFound();
  const community = result.data;
  const query = await searchParams;
  return <main className="page-content detail-page"><Link href={`/community/${slug}`} className="back-link">← Back to community</Link><section className="form-panel trust-report-panel"><p className="eyebrow">CHATSCOUT TRUST & SAFETY</p><h1>Report a community</h1><p>Help us keep ChatScout useful. Reports are reviewed by the platform team.</p>{query.report === "submitted" && <p className="form-message success">Thanks. Your report has been submitted.</p>}{query.report === "failed" && <p className="form-message error">We couldn't submit that report. Please try again.</p>}<form action={createCommunityReport} className="community-form"><input type="hidden" name="communityId" value={community.id} /><p><strong>{community.name}</strong></p><label>What is wrong?<select name="reportType" required defaultValue=""><option value="" disabled>Select a reason</option><option value="broken_link">Invite link is broken</option><option value="spam">Spam or misleading listing</option><option value="scam">Scam or suspicious activity</option><option value="misleading">Community details are incorrect</option><option value="other">Something else</option></select></label><label>Additional details (optional)<textarea name="description" maxLength={2000} rows={5} placeholder="Tell us what you noticed..." /></label><button className="primary-button form-submit" type="submit">Submit report</button></form></section></main>;
}
