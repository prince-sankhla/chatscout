import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { markOwnerNotificationRead } from "@/features/owner-workspace/actions";
import styles from "../owner.module.css";

export default async function OwnerNotificationsPage() {
  const auth = await createServerAuthClient(); const { data: { user } } = await auth.auth.getUser(); if (!user) redirect("/submit/login?error=auth");
  const supabase = createAdminSupabaseClient() as any;
  const { data: notifications } = await supabase.from("community_admin_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const items = notifications ?? [];
  return <main className="page-content"><header className={styles.header}><div><Link href="/dashboard" className="back-link">← Back to dashboard</Link><p className="eyebrow">OWNER INBOX</p><h1>Notifications</h1><p>Review updates about your communities, claims and future monetization eligibility.</p></div></header><section className={styles.section}>{items.length?<div className="owner-notification-list">{items.map((item:any)=><article className={`owner-notification ${item.read_at?"is-read":"is-unread"}`} key={item.id}><div><span className={`admin-status-badge ${item.read_at?"":"published"}`}>{item.read_at?"Read":"New"}</span><h3>{item.title}</h3><p>{item.message}</p><small>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.created_at))}</small></div><div className="owner-notification-actions">{!item.read_at&&<form action={markOwnerNotificationRead}><input type="hidden" name="id" value={item.id}/><button className="secondary-button" type="submit">Mark read</button></form>}</div></article>)}</div>:<div className={styles.empty}><h3>You&apos;re all caught up</h3><p>Community review, ownership and eligibility updates will appear here.</p></div>}</section></main>;
}
