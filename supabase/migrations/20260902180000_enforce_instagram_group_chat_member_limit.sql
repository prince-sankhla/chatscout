-- Instagram DM group chats can contain up to 250 participants.
-- Values above the platform limit are treated as invalid source metadata,
-- not as real Instagram group membership counts.

update public.communities
set member_count = null,
    last_remote_member_count = null
where lower(platform) = 'instagram'
  and member_count > 250;

alter table public.communities
drop constraint if exists communities_instagram_member_count_limit;

alter table public.communities
add constraint communities_instagram_member_count_limit
check (
  lower(platform) <> 'instagram'
  or member_count is null
  or member_count <= 250
);
