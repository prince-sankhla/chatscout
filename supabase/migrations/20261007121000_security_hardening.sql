-- Security hardening for campaign authorization helpers and campaign admin policies.
REVOKE ALL ON FUNCTION public.is_campaign_admin(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_admin(uuid,uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_campaign_brand(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_brand(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_campaign_link_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_link_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_community_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS campaign_conversions_admin_select ON public.campaign_conversions;
CREATE POLICY campaign_conversions_admin_select
  ON public.campaign_conversions FOR SELECT TO authenticated
  USING (public.is_campaign_link_admin(campaign_link_id));

DROP POLICY IF EXISTS campaign_conversions_brand_select ON public.campaign_conversions;
CREATE POLICY campaign_conversions_brand_select
  ON public.campaign_conversions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_links l
      WHERE l.id = campaign_conversions.campaign_link_id
        AND public.is_campaign_brand(l.campaign_id)
    )
  );

DROP POLICY IF EXISTS campaign_links_admin_select ON public.campaign_links;
CREATE POLICY campaign_links_admin_select
  ON public.campaign_links FOR SELECT TO authenticated
  USING (public.is_campaign_link_admin(id));

DROP POLICY IF EXISTS campaign_links_brand_select ON public.campaign_links;
CREATE POLICY campaign_links_brand_select
  ON public.campaign_links FOR SELECT TO authenticated
  USING (public.is_campaign_brand(campaign_id));

-- SECURITY DEFINER helpers use an empty search_path and fully qualified objects.
CREATE OR REPLACE FUNCTION public.is_campaign_brand(p_campaign_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select exists (
    select 1 from public.campaigns c
    where c.id=p_campaign_id and c.brand_user_id=(select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_admin(p_campaign_id uuid,p_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select exists (
    select 1 from public.community_admins ca
    where ca.community_id=p_community_id and ca.user_id=(select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_link_admin(p_link_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select exists (
    select 1
    from public.campaign_links l
    join public.community_admins ca on ca.community_id=l.community_id
    where l.id=p_link_id and ca.user_id=(select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  select exists (
    select 1 from public.community_admins ca
    where ca.community_id=p_community_id and ca.user_id=(select auth.uid())
  )
  or exists (
    select 1 from public.communities c
    where c.id=p_community_id and c.owner_user_id=(select auth.uid())
  );
$$;
