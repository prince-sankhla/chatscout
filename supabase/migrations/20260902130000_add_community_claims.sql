begin;

create type public.claim_status as enum ('unclaimed','pending_verification','claimed');
create type public.claim_verification_method as enum ('bio_code','dm_confirmation','admin_manual_review');
create type public.claim_request_status as enum ('pending','approved','rejected');

alter table public.communities
  add column if not exists claim_status public.claim_status not null default 'unclaimed',
  add column if not exists claimed_at timestamptz;

update public.communities
set claim_status = 'claimed', claimed_at = coalesce(claimed_at, updated_at)
where owner_user_id is not null and claim_status = 'unclaimed';

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  requesting_user_id uuid not null references auth.users(id) on delete cascade,
  verification_method public.claim_verification_method not null default 'bio_code',
  verification_code text not null,
  status public.claim_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists claim_requests_status_created_idx on public.claim_requests(status, created_at desc);
create index if not exists claim_requests_community_idx on public.claim_requests(community_id);
create index if not exists claim_requests_user_idx on public.claim_requests(requesting_user_id);

alter table public.claim_requests enable row level security;
revoke all on table public.claim_requests from anon, authenticated;
grant all on table public.claim_requests to service_role;

drop policy if exists claim_requests_service_role_only on public.claim_requests;
create policy claim_requests_service_role_only
on public.claim_requests
as permissive
for all
to service_role
using (true)
with check (true);

commit;
