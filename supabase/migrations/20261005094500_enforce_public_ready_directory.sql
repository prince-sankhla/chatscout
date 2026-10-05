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

-- Keep server-only campaign RPCs off the authenticated REST/RPC surface.
revoke execute on function public.approve_campaign_application(uuid) from authenticated;
revoke execute on function public.audience_pack_match(uuid,jsonb) from authenticated;
revoke execute on function public.campaign_match_score(uuid,uuid) from authenticated;
revoke execute on function public.change_campaign_status(uuid,text) from authenticated;
revoke execute on function public.community_is_pack_eligible(uuid) from authenticated;
revoke execute on function public.current_user_owns_community(uuid) from authenticated;
revoke execute on function public.find_campaign_matches(uuid,integer) from authenticated;
revoke execute on function public.get_admin_audience_pack_memberships(uuid) from authenticated;
revoke execute on function public.invite_campaign_communities(uuid,uuid[]) from authenticated;
revoke execute on function public.payment_eligibility(uuid,uuid) from authenticated;
revoke execute on function public.recompute_audience_packs() from authenticated;
revoke execute on function public.refresh_campaign_matches(uuid,integer) from authenticated;
revoke execute on function public.respond_to_campaign_invitation(uuid,uuid,text) from authenticated;
revoke execute on function public.review_campaign_application(uuid,text) from authenticated;
revoke execute on function public.review_campaign_submission(uuid,text,text) from authenticated;
revoke execute on function public.set_audience_pack_opt_out(uuid,uuid,boolean) from authenticated;
revoke execute on function public.set_payout_enabled(uuid,boolean) from authenticated;
revoke execute on function public.start_campaign_deliverable(uuid,uuid) from authenticated;
revoke execute on function public.start_campaign_participation(uuid) from authenticated;
revoke execute on function public.submit_campaign_deliverable_record(uuid,uuid,text,text,numeric,text) from authenticated;

grant execute on function public.approve_campaign_application(uuid) to service_role;
grant execute on function public.audience_pack_match(uuid,jsonb) to service_role;
grant execute on function public.campaign_match_score(uuid,uuid) to service_role;
grant execute on function public.change_campaign_status(uuid,text) to service_role;
grant execute on function public.community_is_pack_eligible(uuid) to service_role;
grant execute on function public.current_user_owns_community(uuid) to service_role;
grant execute on function public.find_campaign_matches(uuid,integer) to service_role;
grant execute on function public.get_admin_audience_pack_memberships(uuid) to service_role;
grant execute on function public.invite_campaign_communities(uuid,uuid[]) to service_role;
grant execute on function public.payment_eligibility(uuid,uuid) to service_role;
grant execute on function public.recompute_audience_packs() to service_role;
grant execute on function public.refresh_campaign_matches(uuid,integer) to service_role;
grant execute on function public.respond_to_campaign_invitation(uuid,uuid,text) to service_role;
grant execute on function public.review_campaign_application(uuid,text) to service_role;
grant execute on function public.review_campaign_submission(uuid,text,text) to service_role;
grant execute on function public.set_audience_pack_opt_out(uuid,uuid,boolean) to service_role;
grant execute on function public.set_payout_enabled(uuid,boolean) to service_role;
grant execute on function public.start_campaign_deliverable(uuid,uuid) to service_role;
grant execute on function public.start_campaign_participation(uuid) to service_role;
grant execute on function public.submit_campaign_deliverable_record(uuid,uuid,text,text,numeric,text) to service_role;

revoke execute on function public.is_campaign_link_admin(uuid) from anon;

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


-- Keep quality invalidation and joinability atomic when listing metadata changes.
create or replace function public.invalidate_directory_quality()
returns trigger
language plpgsql
security invoker
set search_path = public
as $
begin
  if tg_op='INSERT' or
     new.name is distinct from old.name or
     new.description is distinct from old.description or
     new.language is distinct from old.language or
     new.region is distinct from old.region or
     new.member_count is distinct from old.member_count or
     new.platform is distinct from old.platform or
     new.invite_url is distinct from old.invite_url or
     new.verification_status is distinct from old.verification_status or
     new.health_status is distinct from old.health_status or
     new.image_path is distinct from old.image_path or
     new.external_image_url is distinct from old.external_image_url
  then
    new.quality_score := null;
    new.quality_grade := null;
    new.quality_issues := '[]'::jsonb;
    new.quality_checked_at := null;
    new.quality_version := 0;
    new.data_quality_checked_at := null;
    new.needs_manual_review := true;
    new.quality_reviewed_at := null;
    new.quality_reviewed_by := null;
    new.quality_review_note := null;
    if new.status = 'published' then
      new.join_enabled := false;
    end if;
  end if;
  return new;
end;
$;

alter function public.generate_campaign_short_code() set search_path = public, extensions;
