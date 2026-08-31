import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { markOwnerNotificationRead } from "@/features/owner-workspace/actions";
import styles from "../owner.module.css";

export default async function OwnerNotificationsPage() {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/submit/login?error=auth");
  const supabase = createAdminSupabaseClient() as any;
  const { data: notifications } = await supabase.from("owner_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const items = notifications ?? [];

  return <main className="page-content">
    <header className={styles.header}>
      <div><Link href="/dashboard" className="back-link">← Back to dashboard</Link><p className="eyebrow">OWNER INBOX</p><h1>Notifications</h1><p>Review updates about your communities and requests.</p></div>
    </header>
    <section className={styles.section}>
      {items.length ? <div className="owner-notification-list">{items.map((item: { id: string; title: string; message: string; href: string | null; read_at: string | null; created_at: string }) => <article className={`owner-notification ${item.read_at ? "is-read" : "is-unread"}`} key={item.id}>
        <div><span className={`admin-status-badge ${item.read_at ? "" : "published"}`}>{item.read_at ? "Read" : "New"}</span><h3>{item.title}</h3><p>{item.message}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small></div>
        <div className="owner-notification-actions">{item.href && <Link className="secondary-button" href={item.href}>Open</Link>}{!item.read_at && <form action={markOwnerNotificationRead}><input type="hidden" name="id" value={item.id} /><button className="secondary-button" type="submit">Mark read</button></form>}</div>
      </article>)}</div> : <div className={styles.empty}><h3>You're all caught up</h3><p>Community review and health updates will appear here.</p></div>}
    </section>
  </main>;
}
