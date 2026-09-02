import "server-only";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type OwnerRewardsData = {
  userId: string;
  communities: Array<{
    id: string;
    name: string;
    platform: string;
    claimStatus: string;
    verificationStatus: string;
    status: string;
    monetizationStatus: string;
    readinessScore: number;
    requirements: { listed: boolean; profile: boolean; ownership: boolean; trust: boolean };
  }>;
  totalEarnings: number;
  availableEarnings: number;
};

export async function getOwnerRewardsData(): Promise<OwnerRewardsData | null> {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const admin = createAdminSupabaseClient() as any;
  const { data: communities } = await admin.from("communities").select("id,name,platform,claim_status,verification_status,status").eq("owner_user_id", user.id).order("created_at", { ascending: false });
  const ids = (communities ?? []).map((c: { id: string }) => c.id);
  const [{ data: monetization }, { data: earnings }] = await Promise.all([
    ids.length ? admin.from("community_monetization").select("*").in("community_id", ids) : Promise.resolve({ data: [] }),
    admin.from("community_earnings_ledger").select("amount,status").eq("user_id", user.id),
  ]);
  const monetizationByCommunity = new Map<string, any>((monetization ?? []).map((item: any) => [item.community_id, item]));
  const rows = (communities ?? []).map((c: any) => { const m = monetizationByCommunity.get(c.id) ?? {}; return { id:c.id,name:c.name,platform:c.platform,claimStatus:c.claim_status ?? "unclaimed",verificationStatus:c.verification_status,status:c.status,monetizationStatus:m.status ?? "not_eligible",readinessScore:Number(m.readiness_score ?? 0),requirements:{listed:Boolean(m.listing_complete),profile:Boolean(m.listing_complete),ownership:Boolean(m.ownership_verified),trust:Boolean(m.trust_signals_ready)} }; });
  const totalEarnings = (earnings ?? []).reduce((sum: number, e: any) => e.status === "reversed" ? sum : sum + Number(e.amount ?? 0), 0);
  const availableEarnings = (earnings ?? []).reduce((sum: number, e: any) => e.status === "available" || e.status === "approved" ? sum + Number(e.amount ?? 0) : sum, 0);
  return { userId: user.id, communities: rows, totalEarnings, availableEarnings };
}
