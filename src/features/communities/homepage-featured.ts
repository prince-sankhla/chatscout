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

  // One DB read for the whole homepage instead of four sequential platform queries.
  // This keeps the first paint fast while preserving the exact 15/10/10/10 quotas.
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("status", "published")
    .limit(500);

  if (error) return { data: [], error: "Unable to load homepage communities." };

  const byPlatform = new Map<Platform, CommunityRow[]>();
  for (const platform of Object.keys(HOME_PAGE_QUOTAS) as Platform[]) {
    byPlatform.set(platform, []);
  }

  for (const community of data ?? []) {
    if (byPlatform.has(community.platform as Platform)) {
      byPlatform.get(community.platform as Platform)!.push(community);
    }
  }

  const selected: CommunityRow[] = [];
  for (const platform of Object.keys(HOME_PAGE_QUOTAS) as Platform[]) {
    selected.push(
      ...(byPlatform.get(platform) ?? [])
        .sort((a, b) => score(b) - score(a))
        .slice(0, HOME_PAGE_QUOTAS[platform]),
    );
  }

  return { data: selected, error: null };
}
