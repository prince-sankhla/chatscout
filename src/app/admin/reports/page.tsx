import Link from "next/link";
import { getAdminControlCenterData } from "@/features/moderation/data-access";
import { updateReportStatus } from "@/features/moderation/trust-actions";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function dateLabel(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default async function AdminReportsPage() {
  await requireAdminUser();
  const supabase = createAdminSupabaseClient();
  const { data: reports, error } = await supabase.from("reports").select("id, community_id, report_type, description, status, created_at, resolved_at, resolved_by").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((reports ?? []).map((r) => r.community_id))];
  const { data: communities } = ids.length ? await supabase.from("communities").select("id, name, slug, status, verification_status").in("id", ids) : { data: [] };
  const byId = new Map((communities ?? []).map((c) => [c.id, c]));
  return <main className="admin-page"><header className="admin-header"><div><Link href="/admin" className="back-link">← Back to control center</Link><p className="eyebrow">CHATSCOUT TRUST & SAFETY</p><h1>Community reports</h1><p>Review reports, see the affected community, and close or dismiss cases.</p></div></header>{error && <p className="form-message error">Reports are temporarily unavailable.</p>}{!error && (reports ?? []).length === 0 && <p className="admin-empty">No community reports yet.</p>}{(reports ?? []).map((report) => { const community = byId.get(report.community_id); return <article className="admin-record-card" key={report.id}><div className="admin-record-main"><div className="admin-record-heading"><span className={`admin-status-badge ${report.status}`}>{report.status}</span><h3>{community?.name ?? "Community deleted"}</h3><p>{report.description ?? "No additional details provided."}</p></div><dl className="admin-meta-grid"><div><dt>Reason</dt><dd>{report.report_type.replace("_", " ")}</dd></div><div><dt>Community status</dt><dd>{community?.status ?? "Deleted"}</dd></div><div><dt>Verification</dt><dd>{community?.verification_status?.replace("_", " ") ?? "Unavailable"}</dd></div><div><dt>Reported</dt><dd>{dateLabel(report.created_at)}</dd></div><div><dt>Resolved</dt><dd>{report.resolved_at ? dateLabel(report.resolved_at) : "Open"}</dd></div><div><dt>Public page</dt><dd>{community ? <Link href={`/community/${community.slug}`} target="_blank">Open community</Link> : "Unavailable"}</dd></div></dl></div><aside className="admin-actions-panel"><form action={updateReportStatus}><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="status" value="resolved" /><input name="note" maxLength={2000} placeholder="Resolution note" /><button className="primary-button form-submit" type="submit">Resolve</button></form><form action={updateReportStatus}><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="status" value="dismissed" /><input name="note" maxLength={2000} placeholder="Dismissal note" /><button className="admin-secondary" type="submit">Dismiss</button></form></aside></article>; })}</main>;
}
