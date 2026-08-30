-- Optional images remain private until an administrator publishes the community.
alter table public.submissions
  add column if not exists image_path text;

alter table public.communities
  add column if not exists image_path text;

alter table public.submissions
  add constraint submissions_image_path_format check (
    image_path is null
    or image_path ~ '^submissions/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

alter table public.communities
  add constraint communities_image_path_format check (
    image_path is null
    or image_path ~ '^submissions/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', false)
on conflict (id) do update set public = false;

-- No Storage object policies are granted to anon or authenticated users.
-- Authenticated uploads are mediated by the server route; service-role writes
-- use unpredictable owner-scoped paths. Published image reads are served through
-- short-lived, trusted-server-generated signed URLs.
