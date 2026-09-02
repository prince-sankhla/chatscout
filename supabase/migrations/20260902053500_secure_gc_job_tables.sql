-- Lock down internal GC job tables to server-side service-role access only.
-- Also add an explicit platform_scope tag used to mark globally scoped communities.

alter table public.gc_import_jobs enable row level security;
alter table public.gc_refresh_jobs enable row level security;

revoke all on table public.gc_import_jobs from anon, authenticated;
revoke all on table public.gc_refresh_jobs from anon, authenticated;
grant all on table public.gc_import_jobs to service_role;
grant all on table public.gc_refresh_jobs to service_role;

drop policy if exists "gc_import_jobs_service_role_only" on public.gc_import_jobs;
create policy "gc_import_jobs_service_role_only"
on public.gc_import_jobs
as permissive
for all
to service_role
using (true)
with check (true);

drop policy if exists "gc_refresh_jobs_service_role_only" on public.gc_refresh_jobs;
create policy "gc_refresh_jobs_service_role_only"
on public.gc_refresh_jobs
as permissive
for all
to service_role
using (true)
with check (true);

alter table public.communities
  add column if not exists platform_scope text;

alter table public.communities
  drop constraint if exists communities_platform_scope_check;

alter table public.communities
  add constraint communities_platform_scope_check
  check (platform_scope is null or platform_scope in ('india', 'global'));
