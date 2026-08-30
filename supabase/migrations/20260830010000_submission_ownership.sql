-- Google-authenticated community submissions are owned by their Auth user.
-- Existing historical submissions remain readable only to trusted server code.
alter table public.submissions
  add column if not exists submitter_user_id uuid references auth.users(id) on delete set null;

create index if not exists submissions_submitter_user_id_idx
  on public.submissions (submitter_user_id)
  where submitter_user_id is not null;

drop policy if exists "public can create pending submissions" on public.submissions;
revoke insert on table public.submissions from anon;

create policy "authenticated users can create their own pending submissions"
on public.submissions for insert to authenticated
with check (
  status = 'pending'
  and submitter_user_id = auth.uid()
);
