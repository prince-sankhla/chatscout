import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOwnerProfile, getOwnerDashboardData } from "@/features/owner/data-access";
import { logoutOwner } from "@/features/owner-workspace/logout";
import styles from "../owner.module.css";

export default async function OwnerProfilePage() {
  const [profile, dashboard] = await Promise.all([getCurrentOwnerProfile(), getOwnerDashboardData()]);
  if (!profile) redirect("/submit/login?error=auth");

  return <main className="page-content">
    <div className={styles.header}>
      <div>
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>
        <p className="eyebrow">YOUR PROFILE</p>
        <h1>Community owner</h1>
        <p>Your ChatScout identity and community performance at a glance.</p>
      </div>
    </div>
    <section className={styles.section}>
      <article className={styles.card} style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 18 }}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--soft)", color: "var(--purple)", fontWeight: 900, fontSize: 22 }}>{profile.name.slice(0, 1).toUpperCase()}</div>}
          <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 23 }}>{profile.name}</h2><p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 12 }}>{profile.email ?? "Email unavailable"}</p><span className={`${styles.badge} ${styles.success}`} style={{ marginTop: 8, display: "inline-flex" }}>Community owner</span></div>
          <form action={logoutOwner}><button type="submit" className={styles.profileLink}>Log out</button></form>
        </div>
        <div className={styles.metrics} style={{ margin: 0, padding: 16 }}>
          <div><span>Communities</span><b>{dashboard?.stats.totalCommunities ?? 0}</b><small>All listings</small></div>
          <div><span>Published</span><b>{dashboard?.stats.published ?? 0}</b><small>Live now</small></div>
          <div><span>Views</span><b>{(dashboard?.stats.views ?? 0).toLocaleString("en-IN")}</b><small>Last 30 days</small></div>
          <div><span>Joins</span><b>{(dashboard?.stats.joins ?? 0).toLocaleString("en-IN")}</b><small>Last 30 days</small></div>
        </div>
      </article>
    </section>
  </main>;
}
