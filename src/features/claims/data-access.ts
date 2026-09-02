import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { isAuthorizedAdmin } from "@/lib/supabase/admin-authorization";
import type { CommunityRow } from "@/types/database";

type ClaimRequestRow = { id: string; community_id: string; requesting_user_id: string; verification_method: string; verification_code: string; status: string; created_at: string; resolved_at: string | null };

export async function getClaimCommunity(slug: string): Promise<(CommunityRow & { claim_status?: string; claimed_at?: string | null }) | null> {
  const { data } = await createAdminSupabaseClient().from("communities").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as (CommunityRow & { claim_status?: string; claimed_at?: string | null }) | null;
}

export async function getMyClaimState(communityId: string) {
  const auth = await createServerAuthClient(); const { data: { user } } = await auth.auth.getUser();
  if (!user) return { user: null, pending: false, rejected: false, lastRequest: null };
  const { data } = await createAdminSupabaseClient().from("claim_requests").select("status,verification_code,created_at").eq("community_id", communityId).eq("requesting_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { user, pending: data?.status === "pending", rejected: data?.status === "rejected", lastRequest: data };
}

export async function getPendingClaims() {
  const supabase = createAdminSupabaseClient(); const { data: requests } = await supabase.from("claim_requests").select("*").eq("status", "pending").order("created_at", { ascending: true });
  const rows = (requests ?? []) as ClaimRequestRow[]; const ids = [...new Set(rows.map((r) => r.community_id))];
  const { data: communities } = ids.length ? await supabase.from("communities").select("id,name,slug,platform,invite_url").in("id", ids) : { data: [] };
  const byId = new Map((communities ?? []).map((c) => [c.id, c]));
  return Promise.all(rows.map(async (request) => { const { data } = await supabase.auth.admin.getUserById(request.requesting_user_id); return { ...request, community: byId.get(request.community_id) ?? null, userEmail: data.user?.email ?? null, userName: typeof data.user?.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : data.user?.email ?? "User" }; }));
}

export async function getOwnerEditCommunity(slug: string) {
  const auth = await createServerAuthClient(); const { data: { user } } = await auth.auth.getUser(); if (!user) return null;
  const supabase = createAdminSupabaseClient(); const { data: community } = await supabase.from("communities").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!community || (community.owner_user_id !== user.id && !isAuthorizedAdmin(user.id))) return null;
  const { data: categories } = await supabase.from("categories").select("id,name,slug").eq("is_active", true).order("sort_order").order("name");
  const { data: links } = await supabase.from("community_categories").select("category_id").eq("community_id", community.id).limit(1);
  return { community, categories: categories ?? [], categoryId: links?.[0]?.category_id ?? null, user };
}
