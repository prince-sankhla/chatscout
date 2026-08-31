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
        <Link className={styles.profileLink} href="/dashboard/notifications">Notifications</Link>
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
          <div className={styles.cardLinks}><Link className={styles.view} href={`/community/${community.slug}`}>View community →</Link><Link className={styles.view} href={`/dashboard/request-update?id=${encodeURIComponent(community.id)}`}>Request update</Link></div>
        </div>
      </article>)}</div> : <div className={styles.empty}><h3>No communities yet</h3><p>Your approved listings will appear here with performance data.</p><Link className="primary-button list-button" href="/submit">List your first community</Link></div>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className="eyebrow">GROW & EARN</p><h2>More ways to grow your community</h2><p>Premium discovery and brand opportunities are being prepared for community owners.</p></div></div>
      <div className={styles.monetization}>
        <article><span>💰 Earn with your community</span><h3>Turn your community into an opportunity.</h3><p>Eligible communities may get opportunities to promote relevant products, services or campaigns.</p><b>Coming soon</b></article>
        <article><span>🤝 Brand collaborations</span><h3>Get discovered by relevant brands.</h3><p>Brands will be able to discover suitable communities for targeted campaigns and collaborations.</p><b>Coming soon</b></article>
        <article><span>🚀 Get featured</span><h3>Put your community in front of more people.</h3><p>Premium discovery placements across ChatScout are coming soon.</p><b>Coming soon</b></article>
        <article><span>📈 Analytics Pro</span><h3>Understand what drives joins.</h3><p>Deeper audience and conversion insights will be available later.</p><b>Coming soon</b></article>
      </div>
    </section>
  </main>;
}
