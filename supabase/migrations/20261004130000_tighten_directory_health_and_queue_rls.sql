-- Directory health/query performance and queue isolation.
alter table public.community_image_fetch_queue enable row level security;

create index if not exists communities_health_queue_idx
  on public.communities (status, auto_monitor_enabled, health_last_checked_at nulls first, platform);

create index if not exists communities_quality_review_idx
  on public.communities (status, needs_manual_review, description_is_generic, platform);

create index if not exists communities_invite_url_normalized_idx
  on public.communities (lower(btrim(invite_url)));

update public.communities
set flag_reason = case
  when flag_reason is null or btrim(flag_reason) = '' then 'generic_description'
  when position('generic_description' in flag_reason) > 0 then flag_reason
  else flag_reason || ';generic_description'
end
where status = 'published'
  and description_is_generic = true;
