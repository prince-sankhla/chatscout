-- Enforce a single public-ready invariant for directory joins.
-- A published listing can only have an enabled join link when it is quality-approved and health-checked.

create or replace function public.enforce_public_ready_join_gate()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'published'
     and (
       new.quality_grade is distinct from 'good'
       or new.health_status is distinct from 'healthy'
     ) then
    new.join_enabled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists communities_public_ready_join_gate on public.communities;
create trigger communities_public_ready_join_gate
before insert or update of status, quality_grade, health_status, join_enabled
on public.communities
for each row execute function public.enforce_public_ready_join_gate();

revoke all on function public.enforce_public_ready_join_gate() from public, anon, authenticated;
grant execute on function public.enforce_public_ready_join_gate() to service_role;

-- Repair existing rows that violated the invariant.
update public.communities
set join_enabled = false
where status = 'published'
  and join_enabled = true
  and (
    quality_grade is distinct from 'good'
    or health_status is distinct from 'healthy'
  );

-- Fill metadata only where there is an explicit existing source signal.
update public.communities
set language = detected_language
where status = 'published'
  and (language is null or btrim(language) = '')
  and detected_language is not null
  and btrim(detected_language) <> '';

update public.communities
set region = country_name
where status = 'published'
  and (region is null or btrim(region) = '')
  and country_name is not null
  and btrim(country_name) <> '';

update public.communities c
set topic_confidence = case
  when exists (
    select 1 from public.community_categories cc
    where cc.community_id = c.id
  ) then 80
  when coalesce(length(btrim(c.description)), 0) >= 40 then 65
  else 55
end
where c.status = 'published'
  and c.topic_confidence is null;

-- Reduce the privilege surface of internal SECURITY DEFINER routines.
revoke all on function public.enrich_community_external_images(integer) from public, anon, authenticated;
grant execute on function public.enrich_community_external_images(integer) to service_role;

revoke all on function public.ensure_campaign_link_on_accept() from public, anon, authenticated;
grant execute on function public.ensure_campaign_link_on_accept() to service_role;

revoke all on function public.process_community_image_fetch_queue() from public, anon, authenticated;
grant execute on function public.process_community_image_fetch_queue() to service_role;

revoke all on function public.queue_direct_missing_community_image_refresh(integer) from public, anon, authenticated;
grant execute on function public.queue_direct_missing_community_image_refresh(integer) to service_role;

revoke all on function public.queue_missing_community_image_refresh(integer) from public, anon, authenticated;
grant execute on function public.queue_missing_community_image_refresh(integer) to service_role;

revoke all on function public.set_campaign_match_allocated_budget() from public, anon, authenticated;
grant execute on function public.set_campaign_match_allocated_budget() to service_role;

revoke all on function public.sync_community_platform_from_submission() from public, anon, authenticated;
grant execute on function public.sync_community_platform_from_submission() to service_role;

alter function public.generate_campaign_short_code() set search_path = public, extensions;
