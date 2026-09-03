create extension if not exists pgcrypto;

create table if not exists public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  short_code text not null unique,
  click_count integer not null default 0 check (click_count >= 0),
  unique_click_count integer not null default 0 check (unique_click_count >= 0),
  created_at timestamptz not null default now(),
  unique (campaign_id, community_id)
);

create table if not exists public.campaign_conversions (
  id uuid primary key default gen_random_uuid(),
  campaign_link_id uuid not null references public.campaign_links(id) on delete cascade,
  conversion_type text not null,
  conversion_value numeric not null default 0,
  recorded_at timestamptz not null default now(),
  check (length(trim(conversion_type)) > 0)
);

create table if not exists public.campaign_link_visitors (
  campaign_link_id uuid not null references public.campaign_links(id) on delete cascade,
  visitor_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (campaign_link_id, visitor_hash)
);

create index if not exists campaign_links_campaign_idx on public.campaign_links(campaign_id);
create index if not exists campaign_links_community_idx on public.campaign_links(community_id);
create index if not exists campaign_conversions_link_idx on public.campaign_conversions(campaign_link_id);
create index if not exists campaign_link_visitors_last_seen_idx on public.campaign_link_visitors(last_seen_at);

alter table public.campaign_community_matches add column if not exists allocated_budget numeric(12,2) not null default 0 check (allocated_budget >= 0);

alter table public.campaign_links enable row level security;
alter table public.campaign_conversions enable row level security;
alter table public.campaign_link_visitors enable row level security;

create or replace function public.is_campaign_brand(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.campaigns c where c.id=p_campaign_id and c.brand_user_id=auth.uid()); $$;

create or replace function public.is_campaign_link_admin(p_link_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.campaign_links l join public.community_admins ca on ca.community_id=l.community_id where l.id=p_link_id and ca.user_id=auth.uid()); $$;

drop policy if exists campaign_links_brand_select on public.campaign_links;
create policy campaign_links_brand_select on public.campaign_links for select using(public.is_campaign_brand(campaign_id));
drop policy if exists campaign_links_admin_select on public.campaign_links;
create policy campaign_links_admin_select on public.campaign_links for select using(public.is_campaign_link_admin(id));
drop policy if exists campaign_conversions_brand_select on public.campaign_conversions;
create policy campaign_conversions_brand_select on public.campaign_conversions for select using(exists(select 1 from public.campaign_links l where l.id=campaign_link_id and public.is_campaign_brand(l.campaign_id)));
drop policy if exists campaign_conversions_admin_select on public.campaign_conversions;
create policy campaign_conversions_admin_select on public.campaign_conversions for select using(public.is_campaign_link_admin(campaign_link_id));

create or replace function public.record_campaign_link_click(p_link_id uuid,p_visitor_hash text)
returns public.campaign_links language plpgsql security definer set search_path=public
as $$
declare v_row public.campaign_links; v_unique boolean:=false; v_last timestamptz;
begin
 if p_link_id is null or length(trim(coalesce(p_visitor_hash,'')))=0 then raise exception 'campaign link and visitor hash are required'; end if;
 select last_seen_at into v_last from public.campaign_link_visitors where campaign_link_id=p_link_id and visitor_hash=p_visitor_hash for update;
 if v_last is null or v_last < now()-interval '24 hours' then v_unique:=true; end if;
 insert into public.campaign_link_visitors(campaign_link_id,visitor_hash,first_seen_at,last_seen_at) values(p_link_id,p_visitor_hash,now(),now())
 on conflict(campaign_link_id,visitor_hash) do update set last_seen_at=excluded.last_seen_at;
 update public.campaign_links set click_count=click_count+1,unique_click_count=unique_click_count+case when v_unique then 1 else 0 end where id=p_link_id returning * into v_row;
 if not found then raise exception 'campaign link not found'; end if;
 return v_row;
end; $$;
grant execute on function public.record_campaign_link_click(uuid,text) to anon,authenticated;

create or replace function public.generate_campaign_short_code()
returns text language plpgsql
as $$
declare v_code text;
begin loop
 v_code:=lower(substring(encode(extensions.gen_random_bytes(8),'hex') from 1 for 10));
 if not exists(select 1 from public.campaign_links where short_code=v_code) then return v_code; end if;
end loop; end; $$;

create or replace function public.ensure_campaign_link_on_accept()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
 if new.admin_response='accepted' and old.admin_response is distinct from 'accepted' then
   insert into public.campaign_links(campaign_id,community_id,short_code) values(new.campaign_id,new.community_id,public.generate_campaign_short_code()) on conflict(campaign_id,community_id) do nothing;
 end if;
 return new;
end; $$;
drop trigger if exists campaign_match_accept_link on public.campaign_community_matches;
create trigger campaign_match_accept_link after update of admin_response on public.campaign_community_matches for each row execute function public.ensure_campaign_link_on_accept();

create or replace function public.set_campaign_match_allocated_budget()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
 if coalesce(new.allocated_budget,0)=0 then
  select coalesce(nullif(c.reward_per_community,0),nullif(c.reward_min,0),0) into new.allocated_budget from public.campaigns c where c.id=new.campaign_id;
 end if;
 return new;
end; $$;
drop trigger if exists campaign_match_budget_default on public.campaign_community_matches;
create trigger campaign_match_budget_default before insert on public.campaign_community_matches for each row execute function public.set_campaign_match_allocated_budget();

create or replace function public.refresh_campaign_matches(p_campaign_id uuid,p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public
as $$
declare v_brand uuid; v_count integer;
begin
 select brand_user_id into v_brand from public.campaigns where id=p_campaign_id;
 if v_brand is null or v_brand<>auth.uid() then raise exception 'Not authorized'; end if;
 delete from public.campaign_community_matches where campaign_id=p_campaign_id and invited_at is null and admin_response='pending';
 with camp as(select * from public.campaigns where id=p_campaign_id), candidates as(
   select cm.id,
    (case when coalesce(cardinality(camp.target_platforms),0)=0 then 15 when cm.platform=any(camp.target_platforms) then 25 else 0 end
    +case when coalesce(cardinality(camp.target_languages),0)=0 then 10 when lower(coalesce(cm.language,''))=any(select lower(x) from unnest(camp.target_languages) x) then 15 else 0 end
    +case when coalesce(cardinality(camp.target_regions),0)=0 then 10 when lower(coalesce(cm.region,''))=any(select lower(x) from unnest(camp.target_regions) x) then 15 else 0 end
    +case when camp.category_id is null and coalesce(cardinality(camp.target_category_ids),0)=0 then 10 when exists(select 1 from public.community_categories cc where cc.community_id=cm.id and (cc.category_id=camp.category_id or cc.category_id=any(camp.target_category_ids))) then 20 else 0 end
    +case when (camp.min_member_count is null or cm.member_count is null or cm.member_count>=camp.min_member_count) and (camp.max_member_count is null or cm.member_count is null or cm.member_count<=camp.max_member_count) then 10 else 0 end
    +case when cm.verification_status='verified' then 5 else 0 end
    +case when cm.health_status='healthy' then 5 else 0 end + 5)::numeric as score,
    coalesce(camp.reward_per_community,camp.reward_min,0)::numeric as allocated_budget
   from public.communities cm cross join camp
   where cm.status='published' and cm.claim_status='claimed' and coalesce(cm.standalone_inventory,false)=false
     and (coalesce(cardinality(camp.target_platforms),0)=0 or cm.platform=any(camp.target_platforms))
     and (coalesce(cardinality(camp.target_languages),0)=0 or lower(coalesce(cm.language,''))=any(select lower(x) from unnest(camp.target_languages) x))
     and (coalesce(cardinality(camp.target_regions),0)=0 or lower(coalesce(cm.region,''))=any(select lower(x) from unnest(camp.target_regions) x))
     and (camp.min_member_count is null or cm.member_count is null or cm.member_count>=camp.min_member_count)
     and (camp.max_member_count is null or cm.member_count is null or cm.member_count<=camp.max_member_count)
     and (not camp.require_verified or cm.verification_status='verified')
     and (not camp.require_healthy or cm.health_status='healthy')
     and exists(select 1 from public.community_admins ca join public.admin_payout_accounts pa on pa.user_id=ca.user_id where ca.community_id=cm.id and ca.role in('owner','manager') and pa.kyc_status='verified' and pa.razorpay_linked_account_id is not null)
     and exists(select 1 from public.community_monetization m where m.community_id=cm.id and m.status='eligible' and m.payout_enabled=true)
   order by score desc,cm.member_count desc nulls last,cm.name limit greatest(1,least(coalesce(p_limit,100),200))
 )
 insert into public.campaign_community_matches(campaign_id,community_id,match_score,allocated_budget)
 select p_campaign_id,id,least(100,score),allocated_budget from candidates
 on conflict(campaign_id,community_id) do update set match_score=excluded.match_score,allocated_budget=excluded.allocated_budget,updated_at=now()
 where public.campaign_community_matches.admin_response='pending' and public.campaign_community_matches.invited_at is null;
 get diagnostics v_count=row_count; return v_count;
end; $$;

update public.campaign_community_matches m set allocated_budget=coalesce(nullif(c.reward_per_community,0),nullif(c.reward_min,0),0) from public.campaigns c where c.id=m.campaign_id and m.allocated_budget=0;
comment on table public.campaign_link_visitors is 'Internal 24-hour visitor dedupe state for campaign-link attribution. Stores only a one-way visitor hash.';
