import { ControllerShell } from "@/components/admin/controller-shell";
import { requireAdminUser } from "@/lib/supabase/auth";

const groups = [
  ["Discovery", "Search, sorting, categories and public discovery policy."],
  ["Moderation", "Submission review and trust workflow configuration."],
  ["Health monitoring", "Automation cadence and health thresholds."],
  ["Verification", "Review standards and verification policy."],
  ["Owner features", "Owner notifications and account-facing behavior."],
  ["Future monetization", "Reserved for paid listing, promotion and campaign controls."],
] as const;

export default async function AdminSettingsPage() {
  await requireAdminUser();
  return <ControllerShell active="settings" title="Platform settings" description="A future-ready home for real, persisted Controller settings. No fake switches are presented.">
    <section className="controller-panel">
      <div className="controller-panel-head"><div><h2>Settings architecture</h2><p>Only controls that are wired to real persistence will be enabled. The areas below are intentionally placeholders.</p></div></div>
      <div className="controller-settings-grid">{groups.map(([title, description]) => <article key={title} className="controller-setting-card"><span>FUTURE CONTROL</span><h3>{title}</h3><p>{description}</p><button className="admin-secondary" type="button" disabled>Not configured</button></article>)}</div>
    </section>
  </ControllerShell>;
}
