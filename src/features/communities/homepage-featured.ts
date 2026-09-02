import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/types/database";

const HOME_PAGE_QUOTAS = { instagram: 15, whatsapp: 10, telegram: 10, discord: 10 } as const;
type Platform = keyof typeof HOME_PAGE_QUOTAS;

function score(community: CommunityRow) {
  let value = (community.member_count ?? 0) * 2;
  if (community.verification_status === "verified") value += 120;
  if (community.image_path) value += 30;
  const hint = `${community.description ?? ""} ${community.name}`;
  if (/(college|university|student|developer|coding|ai|ml|career|startup|business|writer|book|design|photography|music|education|engineering|technology)/i.test(hint)) value += 40;
  if (/(meme|ragebait|gooner|edger|flirty|dating|weirdo|mental hospital|slaughter house)/i.test(hint)) value -= 100;
  return value;
}

export async function getHomepageFeaturedCommunities(): Promise<{ data: CommunityRow[]; error: string | null }> {
  const supabase = createServerSupabaseClient();
  const selected: CommunityRow[] = [];

  for (const platform of Object.keys(HOME_PAGE_QUOTAS) as Platform[]) {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("status", "published")
      .eq("platform", platform)
      .order("member_count", { ascending: false, nullsFirst: false })
      .order("verification_status", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(40);

    if (error) return { data: [], error: "Unable to load homepage communities." };

    selected.push(
      ...(data ?? [])
        .sort((a, b) => score(b) - score(a))
        .slice(0, HOME_PAGE_QUOTAS[platform]),
    );
  }

  return { data: selected, error: null };
}
