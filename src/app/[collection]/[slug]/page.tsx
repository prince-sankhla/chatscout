import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { getPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";
import { DEMAND_OPPORTUNITIES, getDemandOpportunity } from "@/features/demand/opportunities";

type Props = { params: Promise<{ collection: string; slug: string }> };
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app").replace(/\/$/, "");
const MIN_INDEXABLE_LISTINGS = 3;
const COLLECTION_LABELS = {
  "whatsapp-groups": "WhatsApp groups",
  "telegram-groups": "Telegram groups",
  "discord-servers": "Discord servers",
  "instagram-gcs": "Instagram group chats",
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMAND_OPPORTUNITIES.map(({ routeCollection, slug }) => ({ collection: routeCollection, slug }));
}

async function loadOpportunity(collection: string, slug: string) {
  const opportunity = getDemandOpportunity(collection, slug);
  if (!opportunity) return null;
  const result = await getPublishedCommunities({
    categorySlug: opportunity.categorySlug,
    platform: opportunity.platform,
    sort: "members",
  });
  if (result.error) return { opportunity, communities: [] };
  return { opportunity, communities: result.data };
}

function categoryLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection, slug } = await params;
  const data = await loadOpportunity(collection, slug);
  if (!data || data.communities.length < MIN_INDEXABLE_LISTINGS) {
    return { title: "Collection not found | ChatScout", robots: { index: false, follow: true } };
  }
  const { opportunity } = data;
  const canonical = `${SITE_URL}/${opportunity.routeCollection}/${opportunity.slug}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${opportunity.title} | ChatScout`,
    description: opportunity.description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${opportunity.title} | ChatScout`,
      description: opportunity.description,
      siteName: "ChatScout",
      images: [{ url: `${SITE_URL}/brand/chatscout-logo.png`, width: 1254, height: 1254, alt: "ChatScout" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${opportunity.title} | ChatScout`,
      description: opportunity.description,
      images: [`${SITE_URL}/brand/chatscout-logo.png`],
    },
  };
}

export default async function DemandLandingPage({ params }: Props) {
  const { collection, slug } = await params;
  const data = await loadOpportunity(collection, slug);
  if (!data || data.communities.length < MIN_INDEXABLE_LISTINGS) notFound();

  const { opportunity, communities: rows } = data;
  const communities = await Promise.all(rows.map(toCommunityPresentation));
  const collectionLabel = COLLECTION_LABELS[opportunity.routeCollection];
  const related = DEMAND_OPPORTUNITIES
    .filter((item) => item !== opportunity && item.routeCollection === opportunity.routeCollection)
    .filter((item) => item.categorySlug !== opportunity.categorySlug)
    .slice(0, 3);
  const pageUrl = `${SITE_URL}/${opportunity.routeCollection}/${opportunity.slug}`;
  const categoryUrl = `/categories/${encodeURIComponent(opportunity.categorySlug)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${opportunity.title} | ChatScout`,
      url: pageUrl,
      description: opportunity.description,
      isPartOf: { "@type": "WebSite", name: "ChatScout", url: SITE_URL },
      about: { "@type": "Thing", name: opportunity.keyword },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: collectionLabel, item: `${SITE_URL}/${opportunity.routeCollection}` },
        { "@type": "ListItem", position: 3, name: opportunity.title, item: pageUrl },
      ],
    },
  ];

  return (
    <PageShell>
      <main className="platform-page">
        <section className="platform-heading">
          <nav aria-label="Breadcrumb" className="detail-breadcrumbs">
            <Link href="/">Home</Link><span>›</span>
            <Link href={categoryUrl}>{categoryLabel(opportunity.categorySlug)}</Link><span>›</span>
            <span aria-current="page">{opportunity.title}</span>
          </nav>
          <p className="eyebrow">CHATSCOUT SEARCH DEMAND</p>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.description}</p>
          <div className="detail-trust-line">
            <span>{communities.length} listed communities</span>
            <span>{collectionLabel}</span>
            <Link href={categoryUrl}>Browse full category</Link>
          </div>
        </section>

        <CommunityGrid communities={communities} />

        {related.length > 0 && (
          <section className="discover-section">
            <div className="section-heading">
              <div><p className="eyebrow">RELATED SEARCHES</p><h2>More <span>collections</span></h2></div>
            </div>
            <div className="platform-categories">
              {related.map((item) => (
                <Link href={`/${item.routeCollection}/${item.slug}`} key={`${item.routeCollection}:${item.slug}`}>
                  <Icon name="arrow" />
                  <b>{item.title}</b>
                  <span>{item.keyword}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
    </PageShell>
  );
}
