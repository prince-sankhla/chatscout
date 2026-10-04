alter table public.communities
  add column if not exists country_code text,
  add column if not exists country_name text;

alter table public.discovery_sources
  add column if not exists discovered_country_code text,
  add column if not exists discovered_country_name text;

create index if not exists communities_country_idx
  on public.communities(country_code, status, platform);

create index if not exists discovery_sources_country_idx
  on public.discovery_sources(platform, discovered_country_code, discovered_at desc);

update public.communities
set country_code='IN', country_name='India'
where country_code is null
  and (
    platform_scope='india'
    or lower(coalesce(region,'')) in (
      'india','india-wide','jaipur','rajasthan','delhi','delhi ncr','mumbai',
      'bengaluru','bangalore','hyderabad','chennai','pune','kolkata','ahmedabad',
      'lucknow','indore','kota','chandigarh','noida','gurgaon','gurugram'
    )
  );