-- ChatScout V2 Phase 1 owner/admin + monetization foundation.
-- Kept reproducible for fresh environments; the live database has already received the equivalent migrations.

DO $$ BEGIN CREATE TYPE public.community_admin_role AS ENUM ('owner','manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.monetization_status AS ENUM ('not_eligible','pending','eligible','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.earning_status AS ENUM ('pending','approved','available','paid','reversed','disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.claim_request_status ADD VALUE IF NOT EXISTS 'needs_information'; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.community_admins (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.community_admin_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_admins_user ON public.community_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_community_admins_community ON public.community_admins(community_id);

CREATE TABLE IF NOT EXISTS public.community_monetization (
  community_id uuid primary key references public.communities(id) on delete cascade,
  status public.monetization_status not null default 'not_eligible',
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  listing_complete boolean not null default false,
  ownership_verified boolean not null default false,
  trust_signals_ready boolean not null default false,
  eligible_at timestamptz,
  suspended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.community_earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  community_id uuid not null references public.communities(id) on delete restrict,
  campaign_id uuid,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'INR' check (currency = upper(currency) and char_length(currency)=3),
  status public.earning_status not null default 'pending',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON public.community_earnings_ledger(user_id,created_at desc);
CREATE INDEX IF NOT EXISTS idx_earnings_community ON public.community_earnings_ledger(community_id,created_at desc);

CREATE TABLE IF NOT EXISTS public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  title text not null,
  message text not null,
  kind text not null default 'info' check (kind in ('info','success','warning','error')),
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
ALTER TABLE public.owner_notifications ADD COLUMN IF NOT EXISTS community_id uuid references public.communities(id) on delete cascade;
CREATE INDEX IF NOT EXISTS owner_notifications_user_created_idx ON public.owner_notifications(user_id,created_at desc);
CREATE INDEX IF NOT EXISTS owner_notifications_community_idx ON public.owner_notifications(community_id,created_at desc);

ALTER TABLE public.claim_requests ADD COLUMN IF NOT EXISTS verification_evidence text;
ALTER TABLE public.claim_requests ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.claim_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid references auth.users(id);
ALTER TABLE public.claim_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.claim_requests ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_claim_requests_community_status ON public.claim_requests(community_id,status,created_at desc);
CREATE INDEX IF NOT EXISTS idx_claim_requests_user ON public.claim_requests(requesting_user_id,created_at desc);

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_admins ca WHERE ca.community_id=p_community_id AND ca.user_id=auth.uid())
      OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id=p_community_id AND c.owner_user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.current_user_owns_community(p_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_admins ca WHERE ca.community_id=p_community_id AND ca.user_id=auth.uid() AND ca.role='owner')
      OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id=p_community_id AND c.owner_user_id=auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.calculate_community_monetization(p_community_id uuid)
RETURNS public.community_monetization LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.communities; r public.community_monetization; score integer := 0;
BEGIN
  SELECT * INTO c FROM public.communities WHERE id=p_community_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Community not found'; END IF;
  score := score + CASE WHEN c.status='published' THEN 35 ELSE 0 END;
  score := score + CASE WHEN c.owner_user_id IS NOT NULL THEN 25 ELSE 0 END;
  score := score + CASE WHEN c.verification_status='verified' THEN 25 ELSE 0 END;
  score := score + CASE WHEN c.health_status='healthy' THEN 15 ELSE 0 END;
  INSERT INTO public.community_monetization(community_id,status,readiness_score,listing_complete,ownership_verified,trust_signals_ready,eligible_at)
  VALUES(c.id,CASE WHEN score>=85 THEN 'eligible'::public.monetization_status WHEN c.owner_user_id IS NULL THEN 'not_eligible'::public.monetization_status ELSE 'pending'::public.monetization_status END,score,c.status='published',c.owner_user_id IS NOT NULL,c.verification_status='verified' OR c.health_status='healthy',CASE WHEN score>=85 THEN now() ELSE NULL END)
  ON CONFLICT(community_id) DO UPDATE SET status=CASE WHEN public.community_monetization.status='suspended' THEN 'suspended'::public.monetization_status ELSE excluded.status END, readiness_score=excluded.readiness_score, listing_complete=excluded.listing_complete, ownership_verified=excluded.ownership_verified, trust_signals_ready=excluded.trust_signals_ready, eligible_at=coalesce(public.community_monetization.eligible_at,excluded.eligible_at), updated_at=now()
  RETURNING * INTO r;
  RETURN r;
END;
$$;

ALTER TABLE public.community_admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_admin_profiles_self ON public.community_admin_profiles;
CREATE POLICY community_admin_profiles_self ON public.community_admin_profiles FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS community_admins_self_read ON public.community_admins;
CREATE POLICY community_admins_self_read ON public.community_admins FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS community_monetization_owner_read ON public.community_monetization;
CREATE POLICY community_monetization_owner_read ON public.community_monetization FOR SELECT TO authenticated USING(public.is_community_admin(community_id));
DROP POLICY IF EXISTS earnings_owner_read ON public.community_earnings_ledger;
CREATE POLICY earnings_owner_read ON public.community_earnings_ledger FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS "owners can read own notifications" ON public.owner_notifications;
CREATE POLICY "owners can read own notifications" ON public.owner_notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS "owners can mark own notifications read" ON public.owner_notifications;
CREATE POLICY "owners can mark own notifications read" ON public.owner_notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

DROP POLICY IF EXISTS "community owners can read their own communities" ON public.communities;
CREATE POLICY "community owners can read their own communities" ON public.communities FOR SELECT TO authenticated USING(status='published' OR public.is_community_admin(id));
DROP POLICY IF EXISTS "submitters can read their own submissions" ON public.submissions;
CREATE POLICY "submitters can read their own submissions" ON public.submissions FOR SELECT TO authenticated USING(submitter_user_id=auth.uid());
DROP POLICY IF EXISTS "claimants can read their own claims" ON public.claim_requests;
CREATE POLICY "claimants can read their own claims" ON public.claim_requests FOR SELECT TO authenticated USING(requesting_user_id=auth.uid());

REVOKE ALL ON FUNCTION public.calculate_community_monetization(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_community_monetization(uuid) TO service_role;
