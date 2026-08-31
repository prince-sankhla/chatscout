-- Community health snapshots used by the server-side monitor.
alter table public.communities
  add column if not exists health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'needs_recheck', 'inactive')),
  add column if not exists health_last_checked_at timestamptz,
  add column if not exists health_failure_count integer not null default 0
    check (health_failure_count >= 0),
  add column if not exists auto_monitor_enabled boolean not null default true,
  add column if not exists last_remote_name text,
  add column if not exists last_remote_member_count integer,
  add column if not exists last_remote_image_hash text,
  add column if not exists last_health_error text,
  add column if not exists last_remote_image_checked_at timestamptz;

create index if not exists communities_health_monitor_idx
  on public.communities (auto_monitor_enabled, health_last_checked_at)
  where status = 'published';

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (
    action in (
      'approved', 'rejected', 'requested_changes', 'edited',
      'unpublished', 'archived', 'restored', 'join_disabled', 'join_enabled',
      'deleted', 'verification_updated', 'health_updated', 'auto_archived'
    )
  );
