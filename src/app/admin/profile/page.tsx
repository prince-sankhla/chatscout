import Link from "next/link";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/supabase/admin-authorization";

function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  const name = typeof metadata.full_name === "string" ? metadata.full_name.trim() : typeof metadata.name === "string" ? metadata.name.trim() : "";
  return name || user.email?.split("@")[0] || "ChatScout admin";
}

export default async function AdminProfilePage() {
  const user = await requireAdminUser();
  const role = getAdminRole(user.id);
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("admin_user_id", user.id);
  const metadata = user.user_metadata ?? {};
  const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;

  return <main className="page-content">
    <div className="admin-header"><div><Link href="/admin" className="back-link">← Back to control center</Link><p className="eyebrow">CHATSCOUT ADMIN</p><h1>Admin profile</h1><p>Your internal identity, role and moderation activity.</p></div></div>
    <section className="admin-section">
      <article className="admin-profile-card">
        {avatar ? <img src={avatar} alt="" width={72} height={72} className="admin-profile-avatar" /> : <div className="admin-profile-avatar-fallback">{displayName(user).slice(0, 1).toUpperCase()}</div>}
        <div className="admin-profile-main"><span className={`admin-status-badge ${role === "controller" ? "published" : ""}`}>{role === "controller" ? "Controller" : "Moderator / Admin"}</span><h2>{displayName(user)}</h2><p>{user.email ?? "Email unavailable"}</p><small>Admin since {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(user.created_at))}</small></div>
      </article>
      <div className="admin-profile-stats"><div><b>{count ?? 0}</b><span>Audit actions</span></div><div><b>{role === "controller" ? "Full" : "Moderation"}</b><span>Access level</span></div><div><b>Server</b><span>Protected session</span></div></div>
      <div className="admin-note"><strong>Controller workspace</strong><p>Trust & Safety tools are available from these protected workspaces.</p><div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}><Link className="admin-secondary" href="/admin/reports">Community reports</Link><Link className="admin-secondary" href="/admin/verification">Verification center</Link><Link className="admin-secondary" href="/admin/owners">Owner directory</Link></div></div>
    </section>
  </main>;
}
