-- Published community media is intentionally public.
-- Upload/delete authorization remains enforced separately by storage policies
-- and the server-side admin client.
update storage.buckets
set public = true
where id = 'community-images';
