import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerDashboardData } from "@/features/owner/data-access";
import styles from "./owner.module.css";

function statusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  if (status === "suspended") return "Suspended";
  if (status === "pending") return "Pending";
  if (status === "draft") return "Draft";
  return status.replaceAll("_", " ");
}

function verificationLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "needs_review") return "Needs review";
  if (status === "broken") return "Broken";
  return "Not verified";
}

function statusClass(status: string) {
  return status === "published" ? styles.success : status === "archived" ? styles.neutral : styles.warning;
}

export default async function OwnerDashboardPage() {
  const data = await getOwnerDashboardData();
  if (!data) redirect("/submit/login?error=auth");

  return (
    <main className="page-content">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">COMMUNITY OWNER</p>
          <h1>My communities</h1>
          <p>Manage your community listings, ownership status and the information visitors see before joining.</p>
        </div>
        <div className={styles.actions}>
          <Link className="primary-button list-button" href="/submit">List another community</Link>
          <Link className={styles.profileLink} href="/dashboard/notifications">Notifications</Link>
          <Link className={styles.profileLink} href="/dashboard/profile">Profile</Link>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Owner overview">
        <div><span>My Communities</span><b>{data.stats.totalCommunities}</b><small>{data.stats.published} published · {data.stats.pending} pending</small></div>
        <div><span>Published</span><b>{data.stats.published}</b><small>Live listings</small></div>
        <div><span>Profile Views</span><b>{data.stats.views.toLocaleString("en-IN")}</b><small>Last 30 days</small></div>
        <div><span>Join Clicks</span><b>{data.stats.joins.toLocaleString("en-IN")}</b><small>{data.stats.ctr.toFixed(1)}% click-through rate</small></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><p className="eyebrow">YOUR LISTINGS</p><h2>Communities</h2></div>
          <span>{data.communities.length}</span>
        </div>

        {data.communities.length ? (
          <div className={styles.grid}>
            {data.communities.map((community) => (
              <article className={styles.card} key={community.id}>
                <div className={styles.cardMedia}>
                  {community.imageUrl ? <img src={community.imageUrl} alt="" /> : <span>{community.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span className={styles.badge + " " + statusClass(community.status)}>{statusLabel(community.status)}</span>
                    <span className={styles.badge + " " + (community.verification_status === "verified" ? styles.success : styles.warning)}>{verificationLabel(community.verification_status)}</span>
                  </div>
                  <h3>{community.name}</h3>
                  <div className={styles.meta}>
                    {community.member_count !== null ? community.member_count.toLocaleString("en-IN") + " members" : "Member count unavailable"}
                    {community.region ? " · " + community.region : ""}
                  </div>
                  <div className={styles.analytics}>
                    <div><b>{community.views}</b><span>Views</span></div>
                    <div><b>{community.joins}</b><span>Joins</span></div>
                    <div><b>{community.ctr.toFixed(1)}%</b><span>CTR</span></div>
                  </div>
                  <div className="owner-readiness">
                    <div className="owner-readiness-bar"><span style={{ width: community.listingScore + "%" }} /></div>
                    <strong>{community.listingScore}%</strong>
                  </div>
                  <small className="owner-readiness-label">Listing completeness</small>
                  <div className={styles.cardLinks}>
                    <Link className={styles.view} href={"/community/" + community.slug}>View community →</Link>
                    <Link className={styles.view} href={"/dashboard/request-update?id=" + encodeURIComponent(community.id)}>Manage details →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h3>Add your first community</h3>
            <p>List a community to build your public ChatScout presence.</p>
            <Link className="primary-button list-button" href="/submit">List Your Community</Link>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">KEEP LISTINGS USEFUL</p>
            <h2>Complete information helps people decide.</h2>
            <p>Keep your invite, description, category, language, region, image and trust details accurate so visitors have useful context before they join.</p>
          </div>
        </div>
        <div className={styles.monetization}>
          <article>
            <span>Listing</span>
            <h3>Accurate details</h3>
            <p>Update your community information when something changes.</p>
            <Link className={styles.profileLink} href="/submit">List another</Link>
          </article>
          <article>
            <span>Ownership</span>
            <h3>Claim your listing</h3>
            <p>Ownership claims help keep community information accountable.</p>
            <Link className={styles.profileLink} href="/search">Find a listing</Link>
          </article>
          <article>
            <span>Discovery</span>
            <h3>Help people find you</h3>
            <p>Complete profiles can surface in search, categories, related results and collection pages.</p>
            <Link className={styles.profileLink} href="/categories">Explore categories</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
