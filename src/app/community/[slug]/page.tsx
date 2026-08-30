import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { getPublishedCommunities, getPublishedCommunityBySlug } from "@/features/communities/data-access";
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

  const community = toCommunityPresentation(communityRow);
  const relatedResult = await getPublishedCommunities();
  const related = relatedResult.data?.filter((item) => item.id !== communityRow.id).slice(0, 3).map(toCommunityPresentation) ?? [];

  return <PageShell><main className="page-content detail-page"><Link href="/" className="back-link">← Back to discovery</Link><section className="detail-hero"><div className={`detail-art art-${community.accent}`}><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span>{community.isDemo && <span className="demo-stamp">DEMO</span>}</div><div className="detail-copy"><p className="eyebrow">COMMUNITY PREVIEW</p><h1>{community.name}</h1><div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p>{community.description}</p><p className="community-members"><Icon name="users" size={16} />{community.membersLabel} · {community.location}</p><Link className="join-button detail-join" href={`/join/${community.slug}`}><Icon name="instagram" size={18} />Join on Instagram <span>↗</span></Link></div></section><section className="detail-info"><div><h2>About this community</h2><p>{community.description}</p></div><div className="detail-info-card"><Icon name="spark" /><b>What to expect</b><span>Interest-led conversation, respectful participation, and a simple path to discover relevant groups.</span></div></section>{related.length > 0 && <section className="discover-section"><div className="section-heading"><div><p className="eyebrow">KEEP EXPLORING</p><h2>Similar <span>communities</span></h2></div></div><CommunityGrid communities={related} compact /></section>}</main></PageShell>;
}
