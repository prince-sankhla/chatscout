-- Optional listing guidance is reviewed by an administrator before publication.
alter table public.submissions
  add column if not exists community_rules text,
  add column if not exists age_restriction text,
  add column if not exists eligibility text,
  add column if not exists restrictions text;

alter table public.communities
  add column if not exists community_rules text,
  add column if not exists age_restriction text,
  add column if not exists eligibility text,
  add column if not exists restrictions text;

grant insert (community_rules, age_restriction, eligibility, restrictions)
  on table public.submissions to authenticated;
