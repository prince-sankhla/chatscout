begin;

alter table public.gc_import_jobs enable row level security;
alter table public.gc_refresh_jobs enable row level security;

revoke all on table public.gc_import_jobs from anon, authenticated;
revoke all on table public.gc_refresh_jobs from anon, authenticated;
grant all on table public.gc_import_jobs to service_role;
grant all on table public.gc_refresh_jobs to service_role;

drop policy if exists gc_import_jobs_service_role_only on public.gc_import_jobs;
drop policy if exists gc_refresh_jobs_service_role_only on public.gc_refresh_jobs;

create policy gc_import_jobs_service_role_only
  on public.gc_import_jobs
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

create policy gc_refresh_jobs_service_role_only
  on public.gc_refresh_jobs
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

commit;
