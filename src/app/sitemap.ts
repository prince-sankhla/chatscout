import type { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient();
  const [{ data: categories }, { data: communities }] = await Promise.all([
    supabase.from("categories").select("id,slug,updated_at").eq("is_active", true),
    supabase.from("communities").select("id,slug,updated_at").eq("status", "published").limit(5000),
  ]);
  const ids = (communities ?? []).map((community) => community.id);
  const { data: links } = ids.length
    ? await supabase.from("community_categories").select("community_id,category_id").in("community_id", ids)
    : { data: [] as { community_id: string; category_id: string }[] };
  const indexableCategoryIds = new Set((links ?? []).map((link) => link.category_id));

  return [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/trending`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/new`, changeFrequency: "daily", priority: 0.8 },
    ...(categories ?? [])
      .filter((category) => indexableCategoryIds.has(category.id))
      .map((category) => ({ url: `${baseUrl}/categories/${category.slug}`, lastModified: category.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...(communities ?? []).map((community) => ({ url: `${baseUrl}/community/${community.slug}`, lastModified: community.updated_at, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
