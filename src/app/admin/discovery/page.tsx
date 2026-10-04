import Link from "next/link";
import { ControllerShell } from "@/components/admin/controller-shell";
import { getInstagramDiscoveryOverview,getInstagramDiscoveryQueue } from "@/features/discovery/data-access";
import { runInstagramDiscoveryNow } from "@/features/discovery/actions";
import { requireAdminUser } from "@/lib/supabase/auth";
export const dynamic="force-dynamic";

type Props={searchParams:Promise<{status?:string;published?:string;found?:string}>};
export default async function DiscoveryPage({searchParams}:Props){
  await requireAdminUser();const p=await searchParams;const[overview,rows]=await Promise.all([getInstagramDiscoveryOverview(),getInstagramDiscoveryQueue(100)]);
  return <ControllerShell active="discovery" title="Instagram Discovery" description="Public-web ingestion automatically finds, verifies, scores and publishes Instagram group-chat links.">
    {p.status&&<p className={`form-message ${p.status==="failed"?"error":"success"}`}>{p.status==="failed"?"Discovery run failed. Existing listings were not removed.":`Discovery completed: ${p.found??0} links found, ${p.published??0} new communities published.`}</p>}
    <section className="quality-summary-grid">
      <div className="quality-summary"><b>{overview.discovered}</b><span>Discovered</span></div>
      <div className="quality-summary good"><b>{overview.published}</b><span>Published</span></div>
      <div className="quality-summary"><b>{overview.duplicates}</b><span>Duplicates</span></div>
      <div className="quality-summary needs-review"><b>{overview.recheck}</b><span>Needs recheck</span></div>
      <div className="quality-summary critical"><b>{overview.inactive}</b><span>Inactive</span></div>
    </section>
    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">AUTOMATED INGESTION</p><h2>No manual accept/reject</h2><p>ChatScout checks public source pages, normalizes <code>ig.me/j/...</code> and <code>ig.me/channel/...</code> links, deduplicates them, runs health + quality checks, and publishes eligible records automatically.</p></div><form action={runInstagramDiscoveryNow}><input type="hidden" name="limit" value="80"/><button className="primary-button" type="submit">Run discovery now</button></form></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Community</th><th>Source</th><th>Category</th><th>Country</th><th>Health</th><th>Status</th><th>Link</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b>{row.discovered_name??"Instagram group"}</b><small>{row.discovered_language??"Language unknown"}{row.discovered_region?` · ${row.discovered_region}`:""}</small></td><td><span className="admin-status-badge">{row.source_type}</span></td><td>{row.discovered_category??"—"}</td><td>{row.discovered_country_name??"Unknown"}</td><td>{row.health_status}</td><td>{row.extraction_status}</td><td><Link href={row.normalized_url} target="_blank" rel="noreferrer">Open ↗</Link></td></tr>)}</tbody></table></div>
    </section>
  </ControllerShell>;
}
