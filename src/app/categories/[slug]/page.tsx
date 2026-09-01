import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackEvent } from "@/components/analytics/track-event";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { getActiveCategories, getPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

type Props = { params: Promise<{ slug: string }> };

async function getCategory(slug: string) {
  const result = await getActiveCategories();
  if (result.error) return { category: null, communities: [] };
  const category = result.data.find((item) => item.slug === slug) ?? null;
  if (!category) return { category: null, communities: [] };
  const communities = await getPublishedCommunities({ categorySlug: slug, sort: "newest" });
  return { category, communities: communities.data ?? [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, communities } = await getCategory((await params).slug);
  if (!category) return { title: "Category not found | ChatScout", robots: { index: false, follow: true } };
  const description = category.description ?? `Discover ${category.name.toLowerCase()} group chats on ChatScout.`;
  return {
    title: `${category.name} Group Chats | ChatScout`,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    robots: communities.length > 0 ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: `${category.name} Group Chats | ChatScout`, description, url: `/categories/${category.slug}`, type: "website", images: [{ url: "/brand/chatscout-logo.png", width: 1254, height: 1254, alt: "ChatScout" }] },
  };
}

export default async function CategoryPage({ params }: Props) {
  const slug = (await params).slug;
  const { category, communities: rows } = await getCategory(slug);
  if (!category) notFound();
  const communities = await Promise.all(rows.map(toCommunityPresentation));
  return <PageShell><TrackEvent eventName="category_view" categoryId={category.id} dedupeKey={`category:${category.id}`} /><main className="platform-page">
    <section className="platform-heading">
      <Link href="/categories" className="back-link">← All categories</Link>
      <p className="eyebrow">CHATSCOUT CATEGORY</p>
      <h1>{category.name} group chats</h1>
      <p>{category.description ?? `Find published Instagram group chats for ${category.name.toLowerCase()}.`}</p>
    </section>
    {communities.length > 0 ? <CommunityGrid communities={communities} /> : <div className="platform-listing-module__iqzfpq__empty"><p className="neon-empty">No published communities in this category yet.</p><Link href="/submit" className="join-button platform-listing-module__iqzfpq__emptyCta">List the first community</Link></div>}
  </main></PageShell>;
}
