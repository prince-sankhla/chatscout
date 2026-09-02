begin;

create unique index if not exists claim_requests_one_pending_per_user_community_idx
  on public.claim_requests(community_id, requesting_user_id)
  where status = 'pending';

create or replace function public.approve_claim_request(p_claim_request_id uuid)
returns public.claim_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.claim_requests;
begin
  select * into r from public.claim_requests where id = p_claim_request_id for update;
  if not found then raise exception 'Claim request not found'; end if;
  if r.status <> 'pending' then raise exception 'Claim request is not pending'; end if;
  update public.communities
  set owner_user_id = r.requesting_user_id, claim_status = 'claimed', claimed_at = now(), updated_at = now()
  where id = r.community_id and claim_status <> 'claimed';
  if not found then raise exception 'Community is already claimed'; end if;
  update public.claim_requests set status = 'approved', resolved_at = now() where id = r.id returning * into r;
  return r;
end;
$$;

create or replace function public.reject_claim_request(p_claim_request_id uuid)
returns public.claim_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.claim_requests;
begin
  update public.claim_requests set status = 'rejected', resolved_at = now()
  where id = p_claim_request_id and status = 'pending' returning * into r;
  if not found then raise exception 'Claim request is not pending'; end if;
  update public.communities set claim_status = 'unclaimed', updated_at = now()
  where id = r.community_id and claim_status = 'pending_verification'
    and not exists (select 1 from public.claim_requests cr where cr.community_id = r.community_id and cr.status = 'pending');
  return r;
end;
$$;

revoke all on function public.approve_claim_request(uuid) from public, anon, authenticated;
grant execute on function public.approve_claim_request(uuid) to service_role;
revoke all on function public.reject_claim_request(uuid) from public, anon, authenticated;
grant execute on function public.reject_claim_request(uuid) to service_role;

commit;
