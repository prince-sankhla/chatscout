import type { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMAND_OPPORTUNITIES } from "@/features/demand/opportunities";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app";
const MIN_INDEXABLE_LISTINGS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/trending`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/new`, changeFrequency: "daily", priority: 0.8 },
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return staticEntries;
  }

  try {
    const supabase = createServerSupabaseClient();
    const [{ data: categories }, { data: communities }] = await Promise.all([
      supabase.from("categories").select("id,slug,updated_at").eq("is_active", true),
      supabase.from("communities").select("id,slug,updated_at,platform").eq("status", "published").limit(5000),
    ]);
    const ids = (communities ?? []).map((community) => community.id);
    const { data: links } = ids.length
      ? await supabase.from("community_categories").select("community_id,category_id").in("community_id", ids)
      : { data: [] as { community_id: string; category_id: string }[] };

    const categorySlugById = new Map((categories ?? []).map((category) => [category.id, category.slug]));
    const communityPlatformById = new Map((communities ?? []).map((community) => [community.id, community.platform]));
    const supply = new Map<string, number>();
    for (const link of links ?? []) {
      const slug = categorySlugById.get(link.category_id);
      const platform = communityPlatformById.get(link.community_id);
      if (!slug || !platform) continue;
      const key = `${platform}:${slug}`;
      supply.set(key, (supply.get(key) ?? 0) + 1);
    }

    const indexableDemand = DEMAND_OPPORTUNITIES.filter(
      (opportunity) => (supply.get(`${opportunity.platform}:${opportunity.categorySlug}`) ?? 0) >= MIN_INDEXABLE_LISTINGS,
    );
    const demandCollections = [...new Set(indexableDemand.map((item) => item.routeCollection))];

    return [
      ...staticEntries,
      ...demandCollections.map((collection) => ({
        url: `${baseUrl}/${collection}`,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...indexableDemand.map((opportunity) => ({
        url: `${baseUrl}/${opportunity.routeCollection}/${opportunity.slug}`,
        changeFrequency: "weekly" as const,
        priority: opportunity.priority === "tier-1" ? 0.85 : 0.75,
      })),
      ...(categories ?? [])
        .filter((category) => (links ?? []).some((link) => link.category_id === category.id))
        .map((category) => ({
          url: `${baseUrl}/categories/${category.slug}`,
          lastModified: category.updated_at,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })),
      ...(communities ?? []).map((community) => ({
        url: `${baseUrl}/community/${community.slug}`,
        lastModified: community.updated_at,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
