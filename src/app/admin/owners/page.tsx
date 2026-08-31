import Link from "next/link";
import { getAdminControlCenterData } from "@/features/moderation/data-access";
import { requireAdminUser } from "@/lib/supabase/auth";
import styles from "./owners.module.css";

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "Never";
}

export default async function AdminOwnersPage() {
  await requireAdminUser();
  const dashboard = await getAdminControlCenterData();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link href="/admin" className="back-link">← Back to control center</Link>
          <p className="eyebrow">CHATSCOUT ADMIN</p>
          <h1>Owner performance</h1>
          <p>See how many communities each authenticated submitter has listed and how those listings perform.</p>
        </div>
      </header>
      {!dashboard ? <p className="form-message error">Owner analytics are temporarily unavailable.</p> : (
        <section className="admin-section">
          <div className="admin-section-heading"><h2>Owners</h2><span>{dashboard.owners.length}</span></div>
          {dashboard.owners.length ? (
            <div className={styles.grid}>
              {dashboard.owners.map((owner) => (
                <article key={owner.userId} className={styles.card}>
                  <div className={styles.head}>
                    <div><span className="admin-status-badge published">Owner</span><h3>{owner.email ?? "Email unavailable"}</h3></div>
                    <strong>{owner.ctrRecent.toFixed(1)}% CTR</strong>
                  </div>
                  <div className={styles.metrics}>
                    <div><b>{owner.listedCommunities}</b><span>Listed</span></div>
                    <div><b>{owner.pendingSubmissions}</b><span>Pending</span></div>
                    <div><b>{owner.totalViewsRecent.toLocaleString("en-IN")}</b><span>Views / 7d</span></div>
                    <div><b>{owner.totalJoinClicksRecent.toLocaleString("en-IN")}</b><span>Joins / 7d</span></div>
                  </div>
                  <p className={styles.foot}>Last listed: {dateLabel(owner.lastListedAt)}</p>
                </article>
              ))}
            </div>
          ) : <p className="admin-empty">No authenticated owners have community history yet.</p>}
        </section>
      )}
    </main>
  );
}
