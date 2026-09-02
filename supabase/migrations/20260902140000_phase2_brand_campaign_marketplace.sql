-- Phase 2: Brand ↔ Community marketplace foundation.
-- This migration mirrors the live Supabase Phase 2 changes applied during implementation.

create table if not exists public.brand_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  slug text unique,
  logo_url text,
  website text,
  description text,
  industry text,
  contact_email text,
  contact_name text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected','needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','community_admin','brand','platform_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  objective text not null,
  category_id uuid references public.categories(id),
  target_platforms text[] not null default '{}',
  target_category_ids uuid[] not null default '{}',
  target_subcategory_ids uuid[] not null default '{}',
  target_languages text[] not null default '{}',
  target_regions text[] not null default '{}',
  min_member_count integer check (min_member_count is null or min_member_count >= 0),
  max_member_count integer check (max_member_count is null or max_member_count >= 0),
  require_verified boolean not null default false,
  require_healthy boolean not null default false,
  total_budget numeric(14,2) not null default 0 check (total_budget >= 0),
  reward_per_community numeric(14,2) check (reward_per_community is null or reward_per_community >= 0),
  reward_min numeric(14,2) check (reward_min is null or reward_min >= 0),
  reward_max numeric(14,2) check (reward_max is null or reward_max >= 0),
  reward_model text not null default 'fixed' check (reward_model in ('fixed','range','custom')),
  starts_at timestamptz,
  ends_at timestamptz,
  application_deadline timestamptz,
  requirements text,
  deliverables_description text,
  status text not null default 'draft' check (status in ('draft','pending_review','active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_member_count is null or min_member_count is null or max_member_count >= min_member_count),
  check (reward_max is null or reward_min is null or reward_max >= reward_min),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn','shortlisted')),
  application_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, community_id),
  unique(campaign_id, community_id, admin_user_id)
);

create table if not exists public.campaign_participations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid unique references public.campaign_applications(id) on delete set null,
  status text not null default 'selected' check (status in ('selected','ready','in_progress','submitted','under_review','completed','cancelled')),
  committed_reward numeric(14,2) not null default 0 check (committed_reward >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, community_id)
);

create table if not exists public.campaign_shortlists (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  brand_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(campaign_id, community_id)
);

create table if not exists public.brand_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  application_id uuid references public.campaign_applications(id) on delete cascade,
  title text not null,
  message text not null,
  kind text not null default 'info' check (kind in ('info','success','warning','error')),
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_brand_idx on public.campaigns(brand_user_id,status);
create index if not exists campaigns_deadline_idx on public.campaigns(status,application_deadline);
create index if not exists campaign_apps_campaign_idx on public.campaign_applications(campaign_id,status);
create index if not exists campaign_apps_admin_idx on public.campaign_applications(admin_user_id,status);
create index if not exists campaign_apps_community_idx on public.campaign_applications(community_id,status);
create index if not exists participations_campaign_idx on public.campaign_participations(campaign_id,status);
create index if not exists participations_admin_idx on public.campaign_participations(admin_user_id,status);
create index if not exists brand_notifications_user_idx on public.brand_notifications(user_id,created_at desc);

alter table public.brand_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.campaign_participations enable row level security;
alter table public.campaign_shortlists enable row level security;
alter table public.brand_notifications enable row level security;

create or replace function public.is_campaign_brand(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.campaigns c where c.id=p_campaign_id and c.brand_user_id=(select auth.uid()));
$$;
revoke all on function public.is_campaign_brand(uuid) from public,anon,authenticated;
grant execute on function public.is_campaign_brand(uuid) to authenticated;

create or replace function public.is_campaign_admin(p_campaign_id uuid,p_community_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.community_admins ca where ca.community_id=p_community_id and ca.user_id=(select auth.uid()));
$$;
revoke all on function public.is_campaign_admin(uuid,uuid) from public,anon,authenticated;
grant execute on function public.is_campaign_admin(uuid,uuid) to authenticated;

create or replace function public.change_campaign_status(p_campaign_id uuid,p_status text)
returns public.campaigns language plpgsql security definer set search_path='' as $$
declare r public.campaigns; old_status text;
begin
  select status into old_status from public.campaigns where id=p_campaign_id and brand_user_id=(select auth.uid());
  if old_status is null then raise exception 'Campaign not found or not authorized'; end if;
  if not ((old_status='draft' and p_status='pending_review') or (old_status='pending_review' and p_status in ('active','cancelled')) or (old_status='active' and p_status in ('paused','completed','cancelled')) or (old_status='paused' and p_status in ('active','completed','cancelled'))) then
    raise exception 'Invalid campaign status transition: % -> %',old_status,p_status;
  end if;
  update public.campaigns set status=p_status,updated_at=now() where id=p_campaign_id returning * into r;
  return r;
end; $$;
revoke all on function public.change_campaign_status(uuid,text) from public,anon,authenticated;
grant execute on function public.change_campaign_status(uuid,text) to authenticated;

create or replace function public.find_campaign_matches(p_campaign_id uuid,p_limit integer default 50)
returns table(community_id uuid,name text,slug text,platform text,member_count integer,language text,region text,verification_status text,health_status text,image_path text,match_score numeric,category_match boolean,monetization_eligible boolean)
language sql stable security definer set search_path='' as $$
with camp as(select c.* from public.campaigns c where c.id=p_campaign_id and c.brand_user_id=(select auth.uid())), candidates as(
 select cm.id cid,cm.name cname,cm.slug cslug,cm.platform cplatform,cm.member_count cmembers,cm.language clang,cm.region cregion,cm.verification_status cverify,cm.health_status chealth,cm.image_path cimage,
 exists(select 1 from public.community_categories cc where cc.community_id=cm.id and (cc.category_id=camp.category_id or cc.category_id=any(camp.target_category_ids))) cat_match,
 exists(select 1 from public.community_monetization m where m.community_id=cm.id and m.status='eligible') monet_ok,camp.*
 from public.communities cm cross join camp where cm.status='published'
 and (camp.target_platforms='{}' or cm.platform=any(camp.target_platforms))
 and (camp.target_languages='{}' or coalesce(cm.language,'')=any(camp.target_languages))
 and (camp.target_regions='{}' or coalesce(cm.region,'')=any(camp.target_regions))
 and (camp.min_member_count is null or cm.member_count is null or cm.member_count>=camp.min_member_count)
 and (camp.max_member_count is null or cm.member_count is null or cm.member_count<=camp.max_member_count)
 and (not camp.require_verified or cm.verification_status='verified')
 and (not camp.require_healthy or cm.health_status='healthy')
),ranked as(
 select *,least(100::numeric,(case when target_platforms='{}' then 15 when cplatform=any(target_platforms) then 30 else 0 end)+(case when cat_match then 20 when target_category_ids='{}' and category_id is null then 10 else 0 end)+(case when target_languages='{}' or coalesce(clang,'')=any(target_languages) then 10 else 0 end)+(case when target_regions='{}' or coalesce(cregion,'')=any(target_regions) then 10 else 0 end)+(case when (min_member_count is null or cmembers is null or cmembers>=min_member_count) and (max_member_count is null or cmembers is null or cmembers<=max_member_count) then 10 else 0 end)+(case when cverify='verified' then 5 else 0 end)+(case when chealth='healthy' then 5 else 0 end)+(case when monet_ok then 5 else 0 end)) score from candidates)
select cid,cname,cslug,cplatform,cmembers,clang,cregion,cverify,chealth,cimage,score,cat_match,monet_ok from ranked order by score desc,cmembers desc nulls last,cname asc limit greatest(1,least(p_limit,200));
$$;
revoke all on function public.find_campaign_matches(uuid,integer) from public,anon,authenticated;
grant execute on function public.find_campaign_matches(uuid,integer) to authenticated;

create or replace function public.review_campaign_application(p_application_id uuid,p_status text)
returns public.campaign_applications language plpgsql security definer set search_path='' as $$
declare r public.campaign_applications;
begin
 if p_status not in ('approved','rejected','shortlisted') then raise exception 'Invalid application status'; end if;
 update public.campaign_applications a set status=p_status,updated_at=now() where a.id=p_application_id and a.status in ('pending','shortlisted') and exists(select 1 from public.campaigns c where c.id=a.campaign_id and c.brand_user_id=(select auth.uid())) returning a.* into r;
 if r.id is null then raise exception 'Application not found or not authorized'; end if;
 return r;
end; $$;
revoke all on function public.review_campaign_application(uuid,text) from public,anon,authenticated;
grant execute on function public.review_campaign_application(uuid,text) to authenticated;

create or replace function public.validate_campaign_status_transition() returns trigger language plpgsql set search_path='' as $$begin if new.status is distinct from old.status and not ((old.status='draft' and new.status='pending_review') or (old.status='pending_review' and new.status in ('active','cancelled')) or (old.status='active' and new.status in ('paused','completed','cancelled')) or (old.status='paused' and new.status in ('active','completed','cancelled'))) then raise exception 'Invalid campaign status transition: % -> %',old.status,new.status; end if; return new; end; $$;
drop trigger if exists trg_validate_campaign_status on public.campaigns;
create trigger trg_validate_campaign_status before update on public.campaigns for each row execute function public.validate_campaign_status_transition();

create or replace function public.validate_application_status_transition() returns trigger language plpgsql set search_path='' as $$begin if new.status is distinct from old.status and not ((old.status='pending' and new.status in ('shortlisted','approved','rejected','withdrawn')) or (old.status='shortlisted' and new.status in ('approved','rejected','withdrawn'))) then raise exception 'Invalid application status transition: % -> %',old.status,new.status; end if; return new; end; $$;
drop trigger if exists trg_validate_application_status on public.campaign_applications;
create trigger trg_validate_application_status before update on public.campaign_applications for each row execute function public.validate_application_status_transition();

create or replace function public.ensure_brand_role() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.user_roles(user_id,role) values(new.user_id,'brand') on conflict do nothing; return new; end; $$;
revoke all on function public.ensure_brand_role() from public,anon,authenticated;
drop trigger if exists trg_brand_profile_role on public.brand_profiles;
create trigger trg_brand_profile_role after insert or update of user_id on public.brand_profiles for each row execute function public.ensure_brand_role();

create policy brand_profile_self on public.brand_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy brand_profile_insert on public.brand_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy brand_profile_update on public.brand_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy user_roles_self_select on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy campaign_brand_select on public.campaigns for select to authenticated using(brand_user_id=(select auth.uid()) or (status='active' and application_deadline is not null and application_deadline>=now()));
create policy campaign_brand_insert on public.campaigns for insert to authenticated with check(brand_user_id=(select auth.uid()));
create policy campaign_brand_update on public.campaigns for update to authenticated using(brand_user_id=(select auth.uid())) with check(brand_user_id=(select auth.uid()));
create policy campaign_brand_delete on public.campaigns for delete to authenticated using(brand_user_id=(select auth.uid()) and status='draft');
create policy campaign_apps_brand_select on public.campaign_applications for select to authenticated using(public.is_campaign_brand(campaign_id));
create policy campaign_apps_admin_select on public.campaign_applications for select to authenticated using(admin_user_id=(select auth.uid()));
create policy campaign_apps_admin_insert on public.campaign_applications for insert to authenticated with check(admin_user_id=(select auth.uid()) and public.is_campaign_admin(campaign_id,community_id));
create policy campaign_apps_admin_update on public.campaign_applications for update to authenticated using(admin_user_id=(select auth.uid())) with check(admin_user_id=(select auth.uid()));
create policy campaign_apps_brand_update on public.campaign_applications for update to authenticated using(public.is_campaign_brand(campaign_id)) with check(public.is_campaign_brand(campaign_id));
create policy participation_brand_select on public.campaign_participations for select to authenticated using(public.is_campaign_brand(campaign_id));
create policy participation_admin_select on public.campaign_participations for select to authenticated using(admin_user_id=(select auth.uid()));
create policy shortlist_brand_all on public.campaign_shortlists for all to authenticated using(brand_user_id=(select auth.uid())) with check(brand_user_id=(select auth.uid()));
create policy brand_notifications_self_read on public.brand_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy brand_notifications_self_update on public.brand_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.brand_profiles to authenticated;
grant select,insert,update,delete on public.campaigns to authenticated;
grant select,insert,update on public.campaign_applications to authenticated;
grant select on public.campaign_participations to authenticated;
grant select,insert,update,delete on public.campaign_shortlists to authenticated;
grant select,update on public.brand_notifications to authenticated;
