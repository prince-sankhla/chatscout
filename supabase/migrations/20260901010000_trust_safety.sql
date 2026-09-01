-- Phase 4: trust, verification and community reports.
alter table public.communities
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','needs_review','verified','broken'));

create index if not exists communities_verification_status_idx
  on public.communities (verification_status, status);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('broken_link','wrong_info','spam','unsafe','duplicate','other')),
  details text,
  status text not null default 'open' check (status in ('open','investigating','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_reports_status_created_idx
  on public.community_reports (status, created_at desc);
create index if not exists community_reports_community_created_idx
  on public.community_reports (community_id, created_at desc);

alter table public.community_reports enable row level security;
revoke all on table public.community_reports from anon;
grant insert on table public.community_reports to authenticated;

-- Authenticated users may submit reports, but report contents and moderation fields remain admin-only.
drop policy if exists community_reports_insert_authenticated on public.community_reports;
create policy community_reports_insert_authenticated
  on public.community_reports for insert to authenticated
  with check (reporter_user_id is null or reporter_user_id = auth.uid());

create or replace function public.set_community_verification_status(
  p_community_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('unverified','needs_review','verified','broken') then
    raise exception 'Invalid verification status';
  end if;
  update public.communities
    set verification_status = p_status,
        last_verified_at = case when p_status = 'verified' then timezone('utc', now()) else last_verified_at end,
        updated_at = timezone('utc', now())
  where id = p_community_id;
end;
$$;

revoke all on function public.set_community_verification_status(uuid,text) from public, anon, authenticated;
