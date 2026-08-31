-- Owner update requests and in-app notifications.
create table if not exists public.owner_update_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  owner_user_id uuid not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_update_requests_owner_status_created_idx
  on public.owner_update_requests (owner_user_id, status, created_at desc);
create index if not exists owner_update_requests_community_status_created_idx
  on public.owner_update_requests (community_id, status, created_at desc);

create table if not exists public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  kind text not null default 'info',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists owner_notifications_user_created_idx
  on public.owner_notifications (user_id, created_at desc);

alter table public.owner_update_requests enable row level security;
alter table public.owner_notifications enable row level security;

create policy "owners can read own update requests"
  on public.owner_update_requests for select
  using (auth.uid() = owner_user_id);

create policy "owners can read own notifications"
  on public.owner_notifications for select
  using (auth.uid() = user_id);
