import Link from "next/link";
import { ControllerShell } from "@/components/admin/controller-shell";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";

function dateLabel(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default async function AdminAuditPage() {
  await requireAdminUser();
  const supabase = createAdminSupabaseClient();
  const { data: audit, error } = await supabase.from("admin_audit_log").select("id,action,community_id,submission_id,admin_user_id,previous_status,new_status,note,created_at").order("created_at", { ascending: false }).limit(200);
  const communityIds = [...new Set((audit ?? []).map((entry) => entry.community_id).filter((id): id is string => Boolean(id)))];
  const submissionIds = [...new Set((audit ?? []).map((entry) => entry.submission_id).filter((id): id is string => Boolean(id)))];
  const [{ data: communities }, { data: submissions }] = await Promise.all([
    communityIds.length ? supabase.from("communities").select("id,name,slug").in("id", communityIds) : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    submissionIds.length ? supabase.from("submissions").select("id,community_name").in("id", submissionIds) : Promise.resolve({ data: [] as { id: string; community_name: string }[] }),
  ]);
  const communityMap = new Map((communities ?? []).map((item) => [item.id, item]));
  const submissionMap = new Map((submissions ?? []).map((item) => [item.id, item]));
  return <ControllerShell active="audit" title="Audit log" description="A chronological record of important Controller actions. Historical entries are never erased here.">
    <section className="controller-panel">
      <div className="controller-panel-head"><div><h2>Recent actions</h2><p>{audit?.length ?? 0} entries shown, newest first.</p></div><Link href="/admin" className="admin-secondary">Back to overview</Link></div>
      {error ? <p className="form-message error">Audit history is temporarily unavailable.</p> : audit?.length ? <div className="controller-audit-list">{audit.map((entry) => { const community = entry.community_id ? communityMap.get(entry.community_id) : null; const submission = entry.submission_id ? submissionMap.get(entry.submission_id) : null; return <article key={entry.id} className="controller-audit-row"><div className="controller-audit-action"><span className="admin-status-badge">{entry.action.replaceAll("_", " ")}</span><strong>{community?.name ?? submission?.community_name ?? "Platform action"}</strong><small>{dateLabel(entry.created_at)}</small></div><div className="controller-audit-state"><span>{entry.previous_status ?? "—"} → {entry.new_status ?? "—"}</span><p>{entry.note ?? "No note recorded."}</p></div><div className="controller-audit-links">{community && <Link href={`/community/${community.slug}`} target="_blank">Open community ↗</Link>}{entry.submission_id && <span>Submission {entry.submission_id.slice(0, 8)}</span>}</div></article>; })}</div> : <p className="admin-empty">No audit events recorded yet.</p>}
    </section>
  </ControllerShell>;
}
