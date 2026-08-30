-- ChatScout V1 database foundation.
-- This migration is forward-only. Apply it to a new Supabase project with the
-- Supabase CLI or the Supabase dashboard SQL editor.

create extension if not exists pgcrypto;

create type public.community_status as enum (
  'draft', 'pending', 'published', 'suspended', 'archived'
);

create type public.verification_status as enum (
  'unverified', 'verified', 'needs_review', 'broken'
);

create type public.submission_status as enum (
  'pending', 'approved', 'rejected', 'needs_changes'
);

create type public.report_type as enum (
  'broken_link', 'spam', 'scam', 'misleading', 'other'
);

create type public.report_status as enum ('open', 'resolved', 'dismissed');

create type public.verification_check_type as enum ('invite_link');
create type public.verification_check_status as enum ('passed', 'failed', 'unknown');
create type public.analytics_event_name as enum (
  'search', 'category_view', 'community_view', 'join_click'
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon_key text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_name_not_blank check (length(btrim(name)) > 0),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  platform text not null default 'instagram' check (platform = 'instagram'),
  invite_url text not null check (invite_url ~ '^https?://'),
  description text not null,
  language text,
  region text,
  member_count integer check (member_count is null or member_count >= 0),
  status public.community_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  last_verified_at timestamptz,
  typical_approval_time_minutes integer check (
    typical_approval_time_minutes is null or typical_approval_time_minutes >= 0
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  constraint communities_name_not_blank check (length(btrim(name)) > 0),
  constraint communities_description_not_blank check (length(btrim(description)) > 0),
  constraint communities_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint published_communities_have_published_at check (
    status <> 'published' or published_at is not null
  )
);

create table public.community_categories (
  community_id uuid not null references public.communities(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (community_id, category_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  community_name text not null,
  invite_url text not null check (invite_url ~ '^https?://'),
  description text not null,
  category_name text,
  language text,
  region text,
  approximate_member_count integer check (
    approximate_member_count is null or approximate_member_count >= 0
  ),
  submitter_contact text,
  submitter_platform_identifier text,
  status public.submission_status not null default 'pending',
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint submissions_community_name_not_blank check (length(btrim(community_name)) > 0),
  constraint submissions_description_not_blank check (length(btrim(description)) > 0)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete restrict,
  report_type public.report_type not null,
  description text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid
);

create table public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  check_type public.verification_check_type not null,
  status public.verification_check_status not null default 'unknown',
  checked_at timestamptz not null default timezone('utc', now()),
  details jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name public.analytics_event_name not null,
  community_id uuid references public.communities(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  anonymous_session_id uuid,
  metadata jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  constraint analytics_event_references_subject check (
    (event_name = 'search')
    or (event_name = 'category_view' and category_id is not null)
    or (event_name in ('community_view', 'join_click') and community_id is not null)
  )
);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger communities_set_updated_at
before update on public.communities
for each row execute function public.set_updated_at();

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

-- These indexes follow the planned browse, moderation, and historical-check access paths.
create index categories_active_sort_order_idx
  on public.categories (sort_order, name)
  where is_active;
create index communities_published_browse_idx
  on public.communities (published_at desc)
  where status = 'published';
create index communities_verification_status_idx
  on public.communities (verification_status);
create index communities_region_idx on public.communities (region) where region is not null;
create index communities_language_idx on public.communities (language) where language is not null;
create index community_categories_category_id_idx on public.community_categories (category_id, community_id);
create index submissions_pending_created_at_idx
  on public.submissions (created_at asc)
  where status = 'pending';
create index reports_community_status_idx on public.reports (community_id, status);
create index verification_checks_community_checked_at_idx
  on public.verification_checks (community_id, checked_at desc);
create index analytics_events_name_occurred_at_idx
  on public.analytics_events (event_name, occurred_at desc);
create index analytics_events_community_occurred_at_idx
  on public.analytics_events (community_id, occurred_at desc)
  where community_id is not null;

-- Public tables require explicit grants as well as RLS policies.
revoke all on table public.categories, public.communities, public.community_categories,
  public.submissions, public.reports, public.verification_checks, public.analytics_events
  from anon, authenticated;

grant select on public.categories, public.communities, public.community_categories
  to anon, authenticated;
grant insert (community_name, invite_url, description, category_name, language, region,
  approximate_member_count, submitter_contact, submitter_platform_identifier)
  on public.submissions to anon, authenticated;
grant insert (community_id, report_type, description) on public.reports to anon, authenticated;

alter table public.categories enable row level security;
alter table public.communities enable row level security;
alter table public.community_categories enable row level security;
alter table public.submissions enable row level security;
alter table public.reports enable row level security;
alter table public.verification_checks enable row level security;
alter table public.analytics_events enable row level security;

create policy "public can read active categories"
on public.categories for select to anon, authenticated
using (is_active);

create policy "public can read published communities"
on public.communities for select to anon, authenticated
using (status = 'published');

create policy "public can read categories for published communities"
on public.community_categories for select to anon, authenticated
using (
  exists (
    select 1 from public.communities
    where communities.id = community_categories.community_id
      and communities.status = 'published'
  )
  and exists (
    select 1 from public.categories
    where categories.id = community_categories.category_id
      and categories.is_active
  )
);

create policy "public can create pending submissions"
on public.submissions for insert to anon, authenticated
with check (status = 'pending');

create policy "public can create reports for published communities"
on public.reports for insert to anon, authenticated
with check (
  exists (
    select 1 from public.communities
    where communities.id = reports.community_id
      and communities.status = 'published'
  )
  and status = 'open'
);

-- No public policies or grants are created for verification_checks or analytics_events.
-- They are written by future trusted server-side workflows only.
