alter table public.communities
  add column if not exists needs_manual_review boolean not null default false,
  add column if not exists description_is_generic boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists detected_language text,
  add column if not exists data_quality_checked_at timestamptz;

create table if not exists public.cleanup_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid,
  name text not null,
  invite_url text not null,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.cleanup_log enable row level security;
create index if not exists cleanup_log_community_id_idx on public.cleanup_log(community_id);
create index if not exists communities_needs_manual_review_idx on public.communities(needs_manual_review) where needs_manual_review;
create index if not exists communities_generic_description_idx on public.communities(description_is_generic) where description_is_generic;
