import Link from "next/link";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkCommunityHealthNow } from "@/features/health/actions";
import type { CommunityHealthStatus, VerificationStatus } from "@/types/database";

export const dynamic = "force-dynamic";

type HealthPageProps = { searchParams: Promise<{ status?: string }> };

type HealthCommunity = {
  id: string;
  name: string;
  slug: string;
  invite_url: string;
  member_count: number | null;
  owner_user_id: string | null;
  health_status: CommunityHealthStatus;
  health_last_checked_at: string | null;
  health_failure_count: number;
  auto_monitor_enabled: boolean;
  last_remote_name: string | null;
  last_remote_member_count: number | null;
  last_remote_image_hash: string | null;
  last_health_error: string | null;
  last_remote_image_checked_at: string | null;
  verification_status: VerificationStatus;
};

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  healthy: { kind: "success", text: "Health check passed; no metadata changes were detected." },
  changed: { kind: "success", text: "Health check passed and ChatScout updated the detected changes." },
  "failed-check": { kind: "error", text: "The invite could not be verified publicly. The listing has been marked for recheck." },
  failed: { kind: "error", text: "The health check could not be completed." },
};

function dateLabel(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(value: CommunityHealthStatus) {
  if (value === "healthy") return "Healthy";
  if (value === "needs_recheck") return "Needs recheck";
  if (value === "inactive") return "Inactive";
  return "Not checked";
}

export default async function AdminHealthPage({ searchParams }: HealthPageProps) {
  await requireAdminUser();
  const { status } = await searchParams;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("communities")
    .select("id,name,slug,invite_url,member_count,owner_user_id,health_status,health_last_checked_at,health_failure_count,auto_monitor_enabled,last_remote_name,last_remote_member_count,last_remote_image_hash,last_health_error,last_remote_image_checked_at,verification_status")
    .eq("status", "published")
    .order("health_last_checked_at", { ascending: true, nullsFirst: true })
    .limit(500);
  const communities = (data ?? []) as HealthCommunity[];
  const counts = communities.reduce((acc, item) => {
    acc[item.health_status] += 1;
    return acc;
  }, { unknown: 0, healthy: 0, needs_recheck: 0, inactive: 0 } as Record<CommunityHealthStatus, number>);
  const message = status ? messages[status] : null;

  return <main className="admin-page"><header className="admin-header"><div><Link href="/admin" className="back-link">← Back to control center</Link><p className="eyebrow">CHATSCOUT CONTROLLER</p><h1>Community Health Monitor</h1><p>See which published communities were checked, what changed, and which listings need attention.</p></div><div className="admin-header-actions"><span className="admin-status-badge published">Daily monitor active</span></div></header>
    {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    <section className="admin-overview-grid"><article><span>{counts.healthy}</span><p>Healthy</p></article><article><span>{counts.needs_recheck}</span><p>Needs recheck</p></article><article><span>{counts.inactive}</span><p>Inactive</p></article><article><span>{counts.unknown}</span><p>Not checked</p></article><article><span>{communities.length}</span><p>Monitored</p></article></section>
    <section className="admin-section"><div className="admin-section-heading"><div><h2>Health queue</h2><p>Oldest unchecked listings appear first.</p></div><span>{communities.length}</span></div>
      {communities.length ? <div className="admin-health-list">{communities.map((community) => <article key={community.id} className="admin-health-card"><div><div className="admin-health-heading"><span className={`admin-status-badge ${community.health_status === "healthy" ? "published" : community.health_status === "inactive" ? "rejected" : "pending"}`}>{statusLabel(community.health_status)}</span>{!community.auto_monitor_enabled && <span className="admin-status-badge">Auto monitor off</span>}</div><h3>{community.name}</h3><p><a href={`/community/${community.slug}`} target="_blank" rel="noreferrer">View public listing</a> · <a href={community.invite_url} target="_blank" rel="noreferrer">Open Instagram invite</a></p><dl className="admin-meta-grid"><div><dt>Last checked</dt><dd>{dateLabel(community.health_last_checked_at)}</dd></div><div><dt>Failures</dt><dd>{community.health_failure_count}</dd></div><div><dt>Stored members</dt><dd>{community.member_count?.toLocaleString("en-IN") ?? "Unknown"}</dd></div><div><dt>Remote members</dt><dd>{community.last_remote_member_count?.toLocaleString("en-IN") ?? "Unknown"}</dd></div><div><dt>Remote name</dt><dd>{community.last_remote_name ?? "Unknown"}</dd></div><div><dt>Verification</dt><dd>{community.verification_status.replace("_", " ")}</dd></div><div><dt>Image last checked</dt><dd>{dateLabel(community.last_remote_image_checked_at)}</dd></div><div><dt>Last error</dt><dd>{community.last_health_error ?? "None"}</dd></div></dl></div><form action={checkCommunityHealthNow}><input type="hidden" name="communityId" value={community.id} /><button className="admin-secondary" type="submit">Check now</button></form></article>)}</div> : <p className="admin-empty">No published communities are currently monitored.</p>}
    </section>
  </main>;
}
