import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackEvent } from "@/components/analytics/track-event";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { categoryIcon, getActiveCategoryBySlug, getActiveChildren } from "@/features/categories/data-access";
import { getPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";
import { Icon } from "@/components/ui/icon";

type Props = { params: Promise<{ slug: string }> };

async function loadCategory(slug: string) {
  const category = await getActiveCategoryBySlug(slug);
  if (!category) return null;
  const children = await getActiveChildren(category.id);
  if (children.length) return { category, children, communities: [] };
  const result = await getPublishedCommunities({ categorySlug: slug, sort: "newest" });
  return { category, children: [], communities: result.data ?? [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadCategory((await params).slug);
  if (!data) return { title: "Category not found | ChatScout", robots: { index: false, follow: true } };
  const { category, children, communities } = data;
  const description = category.description ?? `Discover ${category.name.toLowerCase()} group chats on ChatScout.`;
  const hasListings = communities.length > 0;
  return {
    title: `${category.name} Group Chats | ChatScout`,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    robots: children.length > 0 || hasListings ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: `${category.name} Group Chats | ChatScout`, description, url: `/categories/${category.slug}`, type: "website", images: [{ url: "/brand/chatscout-logo.png", width: 1254, height: 1254, alt: "ChatScout" }] },
  };
}

export default async function CategoryPage({ params }: Props) {
  const data = await loadCategory((await params).slug);
  if (!data) notFound();
  const { category, children, communities: rows } = data;
  const communities = await Promise.all(rows.map(toCommunityPresentation));
  const isMain = !category.parent_id;

  return (
    <PageShell>
      <TrackEvent eventName="category_view" categoryId={category.id} dedupeKey={`category:${category.id}`} />
      <main className="platform-page">
        <section className="platform-heading">
          <nav aria-label="Breadcrumb" className="detail-breadcrumbs">
            <Link href="/">Home</Link><span>›</span><Link href="/categories">Categories</Link>
            {category.parent && <><span>›</span><Link href={`/categories/${category.parent.slug}`}>{category.parent.name}</Link></>}
            <span>›</span><span aria-current="page">{category.name}</span>
          </nav>
          <p className="eyebrow">CHATSCOUT CATEGORY</p>
          <h1>{isMain ? category.name : `${category.name} GCs`}</h1>
          <p>{category.description ?? `Explore ${category.name.toLowerCase()} communities on ChatScout.`}</p>
        </section>

        {children.length > 0 ? (
          <div className="platform-categories">
            {children.map((child) => (
              <Link href={`/categories/${child.slug}`} key={child.id}>
                <Icon name={categoryIcon(child.icon_key)} />
                <b>{child.name}</b>
                <span>Explore {child.name.toLowerCase()} GCs <Icon name="arrow" size={14} /></span>
              </Link>
            ))}
          </div>
        ) : communities.length > 0 ? (
          <CommunityGrid communities={communities} />
        ) : (
          <div className="platform-listing-module__iqzfpq__empty">
            <p className="neon-empty">No published communities in this subcategory yet.</p>
            <Link href="/submit" className="join-button platform-listing-module__iqzfpq__emptyCta">List the first community</Link>
          </div>
        )}
      </main>
    </PageShell>
  );
}
