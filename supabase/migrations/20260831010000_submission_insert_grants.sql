-- Submission ownership is enforced by RLS, but authenticated users also need
-- column-level INSERT rights for the ownership and optional image fields.
grant insert (submitter_user_id, image_path)
  on table public.submissions to authenticated;
