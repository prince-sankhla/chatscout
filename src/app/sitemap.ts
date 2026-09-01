import type { MetadataRoute } from "next";
import { getActiveCategories, getPublishedCommunities } from "@/features/communities/data-access";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categoriesResult, communitiesResult] = await Promise.all([getActiveCategories(), getPublishedCommunities({ sort: "newest" })]);
  const communities = communitiesResult.data ?? [];
  const communityCategoryCounts = new Map<string, number>();
  for (const community of communities) communityCategoryCounts.set(community.id, 0);

  const categoryUrls = (categoriesResult.data ?? [])
    .filter((category) => category.is_active)
    .map(async (category) => {
      const result = await getPublishedCommunities({ categorySlug: category.slug, sort: "newest" });
      return result.data?.length ? { url: `${baseUrl}/categories/${category.slug}`, lastModified: category.updated_at } : null;
    });
  const resolvedCategoryUrls = (await Promise.all(categoryUrls)).filter(Boolean) as MetadataRoute.Sitemap;

  return [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/trending`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/new`, changeFrequency: "daily", priority: 0.8 },
    ...resolvedCategoryUrls,
    ...communities.map((community) => ({ url: `${baseUrl}/community/${community.slug}`, lastModified: community.updated_at, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
