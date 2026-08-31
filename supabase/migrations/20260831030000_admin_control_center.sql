-- Admin-only community lifecycle controls and immutable moderation history.
alter table public.communities
  add column if not exists join_enabled boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists source_submission_id uuid references public.submissions(id) on delete set null;

create index if not exists communities_owner_user_id_idx
  on public.communities (owner_user_id)
  where owner_user_id is not null;

create index if not exists communities_source_submission_id_idx
  on public.communities (source_submission_id)
  where source_submission_id is not null;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('approved', 'rejected', 'requested_changes', 'edited', 'unpublished', 'archived', 'restored', 'join_disabled', 'join_enabled', 'deleted')),
  community_id uuid,
  submission_id uuid,
  admin_user_id uuid not null,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_audit_log_subject check (community_id is not null or submission_id is not null)
);

create index if not exists admin_audit_log_community_created_at_idx
  on public.admin_audit_log (community_id, created_at desc)
  where community_id is not null;
create index if not exists admin_audit_log_submission_created_at_idx
  on public.admin_audit_log (submission_id, created_at desc)
  where submission_id is not null;

revoke all on table public.admin_audit_log from anon, authenticated;
alter table public.admin_audit_log enable row level security;
