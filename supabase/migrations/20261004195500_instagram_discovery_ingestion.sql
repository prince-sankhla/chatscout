create table if not exists public.discovery_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('google','bing','reddit','website','directory','submission','seed')),
  source_url text not null,
  discovered_at timestamptz not null default now(),
  raw_url text not null,
  normalized_url text not null,
  platform text not null check (platform in ('instagram','whatsapp','telegram','discord')),
  title text,
  description text,
  discovered_name text,
  discovered_category text,
  discovered_language text,
  discovered_region text,
  extraction_status text not null default 'new' check (extraction_status in ('new','processed','rejected','published','duplicate','failed')),
  health_status text not null default 'unknown' check (health_status in ('unknown','healthy','needs_recheck','inactive')),
  health_checked_at timestamptz,
  health_error text,
  community_id uuid references public.communities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_url)
);
create index if not exists discovery_sources_queue_idx on public.discovery_sources(platform,extraction_status,health_status,discovered_at desc);
create index if not exists discovery_sources_source_idx on public.discovery_sources(source_type,discovered_at desc);
create index if not exists discovery_sources_community_idx on public.discovery_sources(community_id);
create or replace function public.set_discovery_source_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists discovery_sources_updated_at on public.discovery_sources;
create trigger discovery_sources_updated_at before update on public.discovery_sources for each row execute function public.set_discovery_source_updated_at();
alter table public.discovery_sources enable row level security;
revoke all on public.discovery_sources from anon, authenticated;
grant all on public.discovery_sources to service_role;
create or replace function public.normalize_discovery_url(p_url text) returns text language plpgsql immutable security invoker set search_path=public as $$
declare u text:=btrim(coalesce(p_url,'')); begin
 if u='' then return ''; end if;
 u:=regexp_replace(u,'[?#].*$','','g');
 u:=regexp_replace(u,'^https?://(www\\.)?','https://','i');
 u:=regexp_replace(u,'/$','','g');
 return lower(u);
end; $$;
revoke all on function public.normalize_discovery_url(text) from public,anon,authenticated;
grant execute on function public.normalize_discovery_url(text) to service_role;
