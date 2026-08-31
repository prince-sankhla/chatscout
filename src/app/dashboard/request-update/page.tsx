import Link from "next/link";
import { redirect } from "next/navigation";
import { requestCommunityUpdate } from "@/features/owner-workspace/actions";
import { getOwnerDashboardData } from "@/features/owner/data-access";
import styles from "../owner.module.css";

type Props = { searchParams: Promise<{ id?: string; error?: string }> };

const categories = [
  "AI & Machine Learning", "Coding & Programming", "Web Development", "Cybersecurity",
  "Startups & Entrepreneurship", "Cloud & DevOps", "Data Science", "BCA / MCA",
  "College & University", "Study Groups", "Career & Jobs", "Competitive Exams",
  "Gaming", "Anime & Manga", "Music", "Movies & OTT", "Memes & Humor", "Sports",
  "Fitness", "Health & Wellness", "Fashion & Beauty", "Travel", "Photography",
  "Books & Writing", "Finance & Investing", "Crypto & Web3", "Creators & Influencers",
  "Freelance", "Networking", "Local Communities",
];

const languages = ["English", "Hindi", "Hinglish", "Bengali", "Gujarati", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Punjabi", "Urdu", "Odia", "Assamese", "Nepali", "Rajasthani", "Bhojpuri", "Other"];

export default async function RequestUpdatePage({ searchParams }: Props) {
  const data = await getOwnerDashboardData();
  if (!data) redirect("/submit/login?error=auth");
  const params = await searchParams;
  const community = data.communities.find((item) => item.id === params.id);
  if (!community) redirect("/dashboard?update=not-found");

  const error = params.error === "required" ? "Name, description and invite URL are required." : params.error === "members" ? "Member count must be a whole number of zero or more." : params.error === "database" ? "We couldn't send the update request. Please try again." : null;

  return <main className="page-content">
    <header className={styles.header}>
      <div><Link href="/dashboard" className="back-link">← Back to dashboard</Link><p className="eyebrow">LISTING UPDATE</p><h1>Request a community update</h1><p>Send proposed changes to the ChatScout team. Your live listing stays unchanged until the request is reviewed.</p></div>
    </header>
    <section className={`${styles.section} form-panel`}>
      <div className="listing-request-context"><span className="admin-status-badge published">Current listing</span><strong>{community.name}</strong><span>{community.member_count ?? "—"} members · {community.status}</span></div>
      <form action={requestCommunityUpdate} className="community-form listing-form">
        <input type="hidden" name="communityId" value={community.id} />
        <fieldset><legend>Proposed listing details</legend>
          <label>Community name <b>*</b><input name="name" required maxLength={120} defaultValue={community.name} /></label>
          <label>Instagram invite URL <b>*</b><input name="inviteUrl" required maxLength={1000} defaultValue={community.invite_url} /></label>
          <label>Category<select name="category" defaultValue=""><option value="">Keep current category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Description <b>*</b><textarea name="description" required maxLength={2000} rows={6} defaultValue={community.description} placeholder="Tell people what this community is about, who it is for, and what they can expect." /></label>
        </fieldset>
        <fieldset><legend>Community details</legend>
          <div className="form-row"><label>Language<select name="language" defaultValue=""><option value="">Keep current language</option>{languages.map((item) => <option key={item}>{item}</option>)}</select></label><label>Region<input name="region" maxLength={120} defaultValue={community.region ?? ""} placeholder="e.g. Jaipur, Rajasthan" /></label></div>
          <label>Approx. member count<input name="memberCount" type="number" min="0" step="1" defaultValue={community.member_count ?? ""} /></label>
        </fieldset>
        <fieldset><legend>Guidelines</legend>
          <label>Community rules<textarea name="communityRules" maxLength={2000} rows={3} defaultValue={community.community_rules ?? ""} placeholder="Be respectful · No spam · Stay on topic" /></label>
          <div className="form-row"><label>Age restriction<select name="ageRestriction" defaultValue=""><option value="">Keep current</option><option>No restriction</option><option>13+</option><option>16+</option><option>18+</option><option>21+</option></select></label><label>Who can join / eligibility<input name="eligibility" maxLength={500} defaultValue={community.eligibility ?? ""} placeholder="e.g. BCA & MCA students · Everyone welcome" /></label></div>
          <label>Topics, restrictions, or warnings<textarea name="restrictions" maxLength={1000} rows={3} defaultValue={community.restrictions ?? ""} placeholder="Optional warnings or restrictions." /></label>
        </fieldset>
        {error && <p className="form-message error" aria-live="polite">{error}</p>}
        <div className="form-submit-row"><Link href="/dashboard" className="secondary-button">Cancel</Link><button className="primary-button form-submit" type="submit">Send update for review</button></div>
      </form>
    </section>
  </main>;
}
