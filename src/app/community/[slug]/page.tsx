/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityDetailActions } from "@/components/community/community-detail-actions";
import { CommunityDetailTrust } from "@/components/community/community-detail-trust";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { recordCommunityView } from "@/features/analytics/data-access";
import { getPublishedCommunityBySlug, getPublishedRelatedCommunities, getTrendingPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

type PageProps = { params: Promise<{ slug: string }> };

function UnavailableCommunity() {
  return <PageShell><main className="page-content detail-page"><Link href="/" className="back-link">← Back to discovery</Link><p className="demo-notice">This community is temporarily unavailable. Please try again later.</p></main></PageShell>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getPublishedCommunityBySlug((await params).slug);
  return result.data ? { title: `${result.data.name} | ChatScout`, description: result.data.description } : { title: "Community not found | ChatScout" };
}

export default async function CommunityPage({ params }: PageProps) {
  const result = await getPublishedCommunityBySlug((await params).slug);
  if (result.error) return <UnavailableCommunity />;
  const communityRow = result.data;
  if (!communityRow) notFound();
  void recordCommunityView(communityRow.id);
  const community = await toCommunityPresentation(communityRow);
  const [relatedResult, trendingResult] = await Promise.all([
    getPublishedRelatedCommunities(communityRow.id),
    getTrendingPublishedCommunities({ platform: "instagram" }, 8),
  ]);
  const related = await Promise.all((relatedResult.data ?? []).map(toCommunityPresentation));
  const relatedIds = new Set((relatedResult.data ?? []).map((item) => item.id));
  const trending = await Promise.all((trendingResult.data ?? [])
    .filter((item) => item.id !== communityRow.id && !relatedIds.has(item.id))
    .slice(0, 4)
    .map(toCommunityPresentation));
  const metadata = [
    communityRow.member_count !== null ? { icon: "users" as const, label: `${communityRow.member_count.toLocaleString("en-IN")} members` } : null,
    communityRow.language ? { icon: "globe" as const, label: communityRow.language } : null,
    communityRow.region ? { icon: "map" as const, label: communityRow.region } : null,
  ].filter(Boolean) as { icon: "users" | "globe" | "map"; label: string }[];
  const guidelines = [
    ["Community rules", communityRow.community_rules],
    ["Age restriction", communityRow.age_restriction],
    ["Eligibility", communityRow.eligibility],
    ["Topics & restrictions", communityRow.restrictions],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const healthLabel = community.healthLabel ?? "Active listing";
  const listingAgeLabel = community.listingAgeLabel ?? "Listing age unavailable";

  return <PageShell><main className="page-content detail-page">
    <Link href="/" className="back-link">← Back to discovery</Link>
    <section className="detail-hero detail-hero-polished detail-hero-compact">
      <div className={`detail-art detail-art-polished art-${community.accent}`}>{community.imageUrl ? <img className="community-image" src={community.imageUrl} alt={`${community.name} community`} /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}</div>
      <div className="detail-copy detail-copy-polished"><div className="detail-label-row"><p className="eyebrow">INSTAGRAM COMMUNITY</p><span className="platform-badge"><Icon name="instagram" size={13} />Instagram</span></div><div className="detail-title-line"><h1>{community.name}</h1>{community.verificationStatus === "verified" && <span className="detail-verified"><Icon name="check" size={13} />Verified</span>}</div><div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p className="detail-description">{community.description}</p>{metadata.length > 0 && <div className="detail-metadata">{metadata.map((item) => <span key={item.label}><Icon name={item.icon} size={16} />{item.label}</span>)}</div>}<div className="detail-trust-line"><span>{healthLabel}</span><span>{listingAgeLabel}</span>{communityRow.last_verified_at && <span>Verified {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(communityRow.last_verified_at))}</span>}</div>{guidelines.length > 0 && <dl className="detail-guidelines">{guidelines.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{communityRow.join_enabled !== false ? <Link className="join-button detail-join" href={`/join/${community.slug}`}><Icon name="instagram" size={18} />Join on Instagram <Icon name="arrow" size={16} /></Link> : <span className="join-button detail-join join-disabled" aria-disabled="true"><Icon name="instagram" size={18} />Join temporarily unavailable</span>}<CommunityDetailActions slug={community.slug} name={community.name} /></div>
    </section>
    <CommunityDetailTrust memberCount={communityRow.member_count ?? null} language={communityRow.language ?? null} region={communityRow.region ?? null} ageRestriction={communityRow.age_restriction ?? null} eligibility={communityRow.eligibility ?? null} rules={communityRow.community_rules ?? null} restrictions={communityRow.restrictions ?? null} verificationStatus={String(communityRow.verification_status ?? "unverified")} healthLabel={healthLabel} lastVerifiedAt={communityRow.last_verified_at ?? null} />
    {related.length > 0 && <Reveal><section className="discover-section detail-related"><div className="section-heading"><div><p className="eyebrow">DISCOVER MORE</p><h2>Related <span>Communities</span></h2></div><Link href="/categories">Browse categories <Icon name="arrow" size={14} /></Link></div><CommunityGrid communities={related} compact /></section></Reveal>}
    {trending.length > 0 && <Reveal><section className="discover-section detail-trending"><div className="section-heading"><div><p className="eyebrow">FRESH DISCOVERY</p><h2>Trending <span>GCs</span></h2></div><Link href="/trending">View all <Icon name="arrow" size={14} /></Link></div><CommunityGrid communities={trending} compact /></section></Reveal>}
  </main></PageShell>;
}
