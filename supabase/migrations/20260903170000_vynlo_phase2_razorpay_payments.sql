begin;

create type public.payout_account_kyc_status as enum ('not_started','pending','needs_action','verified','rejected','suspended');
create type public.transaction_status as enum ('pending','completed','failed','refunded');

alter table public.community_monetization
  add column if not exists payout_enabled boolean not null default false;

create table if not exists public.admin_payout_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay','cashfree')),
  razorpay_linked_account_id text unique,
  provider_customer_reference text,
  kyc_status public.payout_account_kyc_status not null default 'not_started',
  bank_details_verified boolean not null default false,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  last_provider_sync_at timestamptz,
  provider_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_provider_ref_required check (provider <> 'razorpay' or razorpay_linked_account_id is not null or kyc_status='not_started')
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  brand_user_id uuid not null references auth.users(id) on delete restrict,
  community_id uuid not null references public.communities(id) on delete restrict,
  gross_amount numeric(14,2) not null check (gross_amount > 0),
  platform_fee_amount numeric(14,2) not null check (platform_fee_amount >= 0),
  admin_payout_amount numeric(14,2) not null check (admin_payout_amount >= 0),
  currency text not null default 'INR' check (currency = upper(currency) and char_length(currency)=3),
  status public.transaction_status not null default 'pending',
  provider text not null default 'razorpay' check (provider in ('razorpay','cashfree')),
  razorpay_payment_id text,
  razorpay_transfer_id text,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint transaction_amounts_reconcile check (gross_amount = platform_fee_amount + admin_payout_amount)
);

create index if not exists admin_payout_accounts_kyc_idx on public.admin_payout_accounts(kyc_status,updated_at desc);
create index if not exists transactions_campaign_idx on public.transactions(campaign_id,created_at desc);
create index if not exists transactions_brand_idx on public.transactions(brand_user_id,created_at desc);
create index if not exists transactions_admin_idx on public.transactions(community_id,created_at desc);
create unique index if not exists transactions_razorpay_transfer_uidx on public.transactions(razorpay_transfer_id) where razorpay_transfer_id is not null;

create or replace function public.payment_eligibility(p_community_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1
    from public.communities c
    join public.community_monetization m on m.community_id=c.id
    where c.id=p_community_id
      and (c.owner_user_id=p_user_id or exists(select 1 from public.community_admins ca where ca.community_id=c.id and ca.user_id=p_user_id and ca.role in ('owner','manager')))
      and c.claim_status='claimed'
      and m.status='eligible'
      and m.payout_enabled=true
      and m.ownership_verified=true
  );
$$;
revoke all on function public.payment_eligibility(uuid,uuid) from public,anon,authenticated;
grant execute on function public.payment_eligibility(uuid,uuid) to authenticated;

alter table public.admin_payout_accounts enable row level security;
alter table public.transactions enable row level security;

create policy admin_payout_account_self_select on public.admin_payout_accounts
  for select to authenticated using(user_id=auth.uid());
create policy admin_payout_account_self_insert on public.admin_payout_accounts
  for insert to authenticated with check(user_id=auth.uid());
create policy admin_payout_account_self_update on public.admin_payout_accounts
  for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy transactions_brand_select on public.transactions
  for select to authenticated using(brand_user_id=auth.uid());
create policy transactions_admin_select on public.transactions
  for select to authenticated using(exists(select 1 from public.community_admins ca where ca.community_id=transactions.community_id and ca.user_id=auth.uid()) or exists(select 1 from public.communities c where c.id=transactions.community_id and c.owner_user_id=auth.uid()));

create or replace function public.set_payout_enabled(p_community_id uuid,p_enabled boolean)
returns public.community_monetization language plpgsql security definer set search_path=public as $$
declare r public.community_monetization;
begin
  if not public.is_community_admin(p_community_id) then raise exception 'Not authorized'; end if;
  if p_enabled and not exists(select 1 from public.communities c where c.id=p_community_id and c.claim_status='claimed') then raise exception 'Community must be claimed'; end if;
  if p_enabled and not exists(select 1 from public.community_monetization m where m.community_id=p_community_id and m.status='eligible') then raise exception 'Community is not monetization eligible'; end if;
  update public.community_monetization set payout_enabled=p_enabled,updated_at=now() where community_id=p_community_id returning * into r;
  return r;
end; $$;
revoke all on function public.set_payout_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_payout_enabled(uuid,boolean) to authenticated;

commit;
