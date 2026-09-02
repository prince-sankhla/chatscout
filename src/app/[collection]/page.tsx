import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { getPublishedCommunities } from "@/features/communities/data-access";
import { DEMAND_OPPORTUNITIES, type DemandCollection } from "@/features/demand/opportunities";

type Props = { params: Promise<{ collection: string }> };
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://chatscout-ten.vercel.app").replace(/\/$/, "");
const MIN_INDEXABLE_LISTINGS = 3;
const COLLECTION_LABELS: Record<DemandCollection, string> = {
  "whatsapp-groups": "WhatsApp Groups",
  "telegram-groups": "Telegram Groups",
  "discord-servers": "Discord Servers",
  "instagram-gcs": "Instagram Group Chats",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return (["whatsapp-groups", "telegram-groups", "discord-servers", "instagram-gcs"] as DemandCollection[]).map((collection) => ({ collection }));
}

async function getIndexableOpportunities(collection: DemandCollection) {
  const opportunities = DEMAND_OPPORTUNITIES.filter((item) => item.routeCollection === collection);
  const loaded = await Promise.all(opportunities.map(async (item) => {
    const result = await getPublishedCommunities({ categorySlug: item.categorySlug, platform: item.platform, sort: "members" });
    return result.error || result.data.length < MIN_INDEXABLE_LISTINGS ? null : item;
  }));
  return loaded.filter((item): item is (typeof opportunities)[number] => Boolean(item));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = (await params).collection as DemandCollection;
  if (!COLLECTION_LABELS[collection]) return { title: "Not found | ChatScout", robots: { index: false, follow: true } };
  const title = `${COLLECTION_LABELS[collection]} | ChatScout`;
  const description = `Explore search-demand-driven ${COLLECTION_LABELS[collection].toLowerCase()} on ChatScout, backed by real community listings.`;
  const canonical = `${SITE_URL}/${collection}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: "website", url: canonical, title, description, siteName: "ChatScout", images: [{ url: `${SITE_URL}/brand/chatscout-logo.png`, width: 1254, height: 1254, alt: "ChatScout" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/brand/chatscout-logo.png`] },
  };
}

export default async function DemandCollectionPage({ params }: Props) {
  const collection = (await params).collection as DemandCollection;
  if (!COLLECTION_LABELS[collection]) notFound();
  const opportunities = await getIndexableOpportunities(collection);
  if (!opportunities.length) notFound();
  const label = COLLECTION_LABELS[collection];
  const pageUrl = `${SITE_URL}/${collection}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} | ChatScout`,
    url: pageUrl,
    description: `Search-demand-driven ${label.toLowerCase()} with real ChatScout community listings.`,
    isPartOf: { "@type": "WebSite", name: "ChatScout", url: SITE_URL },
  };

  return (
    <PageShell>
      <main className="platform-page">
        <section className="platform-heading">
          <nav aria-label="Breadcrumb" className="detail-breadcrumbs">
            <Link href="/">Home</Link><span>›</span><span aria-current="page">{label}</span>
          </nav>
          <p className="eyebrow">CHATSCOUT DISCOVERY</p>
          <h1>{label}</h1>
          <p>Browse focused collections built only where ChatScout has a useful supply of real listed communities.</p>
        </section>
        <div className="platform-categories">
          {opportunities.map((item) => (
            <Link href={`/${item.routeCollection}/${item.slug}`} key={item.slug}>
              <Icon name="arrow" />
              <b>{item.title}</b>
              <span>{item.keyword}</span>
            </Link>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
    </PageShell>
  );
}
