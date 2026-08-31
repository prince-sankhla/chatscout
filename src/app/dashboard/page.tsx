import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerDashboardData } from "@/features/owner/data-access";
import styles from "./owner.module.css";

function statusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  if (status === "suspended") return "Suspended";
  return "Draft";
}

function statusClass(status: string) {
  return status === "published" ? styles.success : status === "archived" ? styles.neutral : styles.warning;
}

export default async function OwnerDashboardPage() {
  const data = await getOwnerDashboardData();
  if (!data) redirect("/submit/login?error=auth");

  return <main className="page-content">
    <header className={styles.header}>
      <div>
        <p className="eyebrow">COMMUNITY OWNER</p>
        <h1>My communities</h1>
        <p>Manage your listed group chats and see how people discover and join them.</p>
      </div>
      <div className={styles.actions}>
        <Link className="primary-button list-button" href="/submit">List another community</Link>
        <Link className={styles.profileLink} href="/dashboard/profile">Profile</Link>
      </div>
    </header>

    <section className={styles.metrics} aria-label="Owner performance">
      <div><span>Communities</span><b>{data.stats.totalCommunities}</b><small>{data.stats.published} published · {data.stats.pending} pending</small></div>
      <div><span>Views</span><b>{data.stats.views.toLocaleString("en-IN")}</b><small>Last 30 days</small></div>
      <div><span>Join clicks</span><b>{data.stats.joins.toLocaleString("en-IN")}</b><small>Last 30 days</small></div>
      <div><span>CTR</span><b>{data.stats.ctr.toFixed(1)}%</b><small>Views → joins</small></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className="eyebrow">YOUR LISTINGS</p><h2>Communities</h2></div><span>{data.communities.length}</span></div>
      {data.communities.length ? <div className={styles.grid}>{data.communities.map((community) => <article className={styles.card} key={community.id}>
        <div className={styles.cardMedia}>{community.imageUrl ? <img src={community.imageUrl} alt="" /> : <span>{community.name.slice(0, 2).toUpperCase()}</span>}</div>
        <div className={styles.cardBody}>
          <div className={styles.cardTop}><span className={`${styles.badge} ${statusClass(community.status)}`}>{statusLabel(community.status)}</span>{community.verification_status === "verified" && <span className={`${styles.badge} ${styles.success}`}>✓ Verified</span>}</div>
          <h3>{community.name}</h3>
          <div className={styles.meta}>{community.member_count !== null ? `${community.member_count.toLocaleString("en-IN")} members` : "Member count unavailable"}{community.region ? ` · ${community.region}` : ""}</div>
          <div className={styles.analytics}><div><b>{community.views}</b><span>Views</span></div><div><b>{community.joins}</b><span>Joins</span></div><div><b>{community.ctr.toFixed(1)}%</b><span>CTR</span></div></div>
          <Link className={styles.view} href={`/community/${community.slug}`}>View community →</Link>
        </div>
      </article>)}</div> : <div className={styles.empty}><h3>No communities yet</h3><p>Your approved listings will appear here with performance data.</p><Link className="primary-button list-button" href="/submit">List your first community</Link></div>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className="eyebrow">COMING SOON</p><h2>Grow your community on ChatScout</h2></div></div>
      <div className={styles.monetization}>
        <article><span>Featured</span><h3>Put your community in front of more people.</h3><p>Premium discovery placements are coming soon.</p><b>Coming soon</b></article>
        <article><span>Analytics Pro</span><h3>Understand what drives joins.</h3><p>Deeper audience and conversion insights will be available later.</p><b>Coming soon</b></article>
        <article><span>Brand collaborations</span><h3>Turn community attention into opportunities.</h3><p>Creator and community campaigns are planned for a later phase.</p><b>Coming soon</b></article>
      </div>
    </section>
  </main>;
}
