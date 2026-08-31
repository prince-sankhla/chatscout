-- Owner history and real analytics build on the existing event/audit tables.
-- This migration adds only indexes and the extra admin audit action required
-- for verification changes.

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (
    action in (
      'approved',
      'rejected',
      'requested_changes',
      'edited',
      'unpublished',
      'archived',
      'restored',
      'join_disabled',
      'join_enabled',
      'deleted',
      'verification_updated'
    )
  );

create index if not exists analytics_events_community_name_occurred_at_idx
  on public.analytics_events (community_id, event_name, occurred_at desc)
  where community_id is not null;

create index if not exists submissions_submitter_status_created_at_idx
  on public.submissions (submitter_user_id, status, created_at desc)
  where submitter_user_id is not null;
