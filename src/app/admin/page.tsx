/* eslint-disable @next/next/no-img-element -- Images are served through private Supabase signed URLs. */
import { logoutAdmin } from "@/features/auth/actions";
import { approveSubmission, rejectSubmission } from "@/features/moderation/actions";
import { getPendingSubmissions } from "@/features/moderation/data-access";
import { requireAdminUser } from "@/lib/supabase/auth";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";

type AdminPageProps = { searchParams: Promise<{ status?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminUser();
  const [submissions, { status }] = await Promise.all([getPendingSubmissions(), searchParams]);
  const submissionsWithImages = submissions && await Promise.all(submissions.map(async (submission) => ({
    submission,
    imageUrl: await getPublishedCommunityImageUrl(submission.image_path),
  })));

  return <main className="admin-page">
    <header className="admin-header"><div><p className="eyebrow">CHATSCOUT ADMIN</p><h1>Pending community submissions</h1></div><form action={logoutAdmin}><button className="admin-sign-out" type="submit">Sign out</button></form></header>
    {status && <p className={`form-message ${status === "approved" || status === "rejected" ? "success" : "error"}`}>{status === "approved" ? "Community approved and published." : status === "rejected" ? "Submission rejected." : "Unable to complete that review action."}</p>}
    {submissionsWithImages === null ? <p className="form-message error">Submissions are temporarily unavailable.</p> : submissionsWithImages.length === 0 ? <p className="form-message">No pending submissions.</p> : <section className="submission-list">{submissionsWithImages.map(({ submission, imageUrl }) => <article className="submission-card" key={submission.id}>
      <div>
        {imageUrl && <img className="admin-submission-image" src={imageUrl} alt={`${submission.community_name} submission`} />}
        <h2>{submission.community_name}</h2><p>{submission.description}</p>
        <dl><div><dt>Category</dt><dd>{submission.category ?? "—"}</dd></div><div><dt>Language</dt><dd>{submission.language ?? "—"}</dd></div><div><dt>Region</dt><dd>{submission.region ?? "—"}</dd></div><div><dt>Members</dt><dd>{submission.approximate_member_count?.toLocaleString("en-IN") ?? "—"}</dd></div><div><dt>Invite</dt><dd><a href={submission.invite_url} target="_blank" rel="noreferrer">Open Instagram invite</a></dd></div></dl>
        {(submission.community_rules || submission.age_restriction || submission.eligibility || submission.restrictions) && <dl className="submission-guidelines"><div><dt>Rules</dt><dd>{submission.community_rules ?? "—"}</dd></div><div><dt>Age</dt><dd>{submission.age_restriction ?? "—"}</dd></div><div><dt>Eligibility</dt><dd>{submission.eligibility ?? "—"}</dd></div><div><dt>Restrictions</dt><dd>{submission.restrictions ?? "—"}</dd></div></dl>}
      </div>
      <form className="review-form"><input type="hidden" name="submissionId" value={submission.id} /><label>Review notes<textarea name="reviewNotes" maxLength={2000} rows={3} /></label><div><button className="primary-button form-submit" formAction={approveSubmission}>Approve &amp; publish</button><button className="admin-reject" formAction={rejectSubmission}>Reject</button></div></form>
    </article>)}</section>}
  </main>;
}
