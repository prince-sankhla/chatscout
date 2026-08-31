/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityDetailActions } from "@/components/community/community-detail-actions";
import { CommunityGrid } from "@/components/community/community-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedCommunities, getPublishedCommunityBySlug } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

type PageProps = { params: Promise<{ slug: string }> };

function UnavailableCommunity() { return <PageShell><main className="page-content detail-page"><Link href="/" className="back-link">← Back to discovery</Link><p className="demo-notice">This community is temporarily unavailable. Please try again later.</p></main></PageShell>; }
function formatLastVerified(value: string | null) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null; }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> { const result = await getPublishedCommunityBySlug((await params).slug); return result.data ? { title: `${result.data.name} | ChatScout`, description: result.data.description } : { title: "Community not found | ChatScout" }; }

export default async function CommunityPage({ params }: PageProps) {
  const result = await getPublishedCommunityBySlug((await params).slug);
  if (result.error) return <UnavailableCommunity />;
  const communityRow = result.data;
  if (!communityRow) notFound();
  const community = await toCommunityPresentation(communityRow);
  const relatedResult = await getPublishedCommunities();
  const related = await Promise.all((relatedResult.data?.filter((item) => item.id !== communityRow.id).slice(0, 3) ?? []).map(toCommunityPresentation));
  const isVerified = communityRow.verification_status === "verified";
  const lastVerified = formatLastVerified(communityRow.last_verified_at);
  const metadata = [communityRow.member_count !== null ? { icon: "users" as const, label: `${communityRow.member_count.toLocaleString("en-IN")} members` } : null, communityRow.language ? { icon: "globe" as const, label: communityRow.language } : null, communityRow.region ? { icon: "map" as const, label: communityRow.region } : null].filter(Boolean) as { icon: "users" | "globe" | "map"; label: string }[];
  return <PageShell><main className="page-content detail-page"><Link href="/" className="back-link">← Back to discovery</Link><section className="detail-hero detail-hero-polished"><div className={`detail-art detail-art-polished art-${community.accent}`}>{community.imageUrl ? <img className="community-image" src={community.imageUrl} alt={`${community.name} community`} /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}{community.isDemo && <span className="demo-stamp">DEMO</span>}</div><div className="detail-copy detail-copy-polished"><div className="detail-label-row"><p className="eyebrow">INSTAGRAM COMMUNITY</p><span className="platform-badge"><Icon name="instagram" size={13} />Instagram</span></div><h1>{community.name}</h1><div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}{isVerified && <span className="verified-badge"><Icon name="check" size={12} />Verified</span>}</div><p className="detail-description">{community.description}</p>{metadata.length > 0 && <div className="detail-metadata">{metadata.map((item) => <span key={item.label}><Icon name={item.icon} size={16} />{item.label}</span>)}</div>}<Link className="join-button detail-join" href={`/join/${community.slug}`}><Icon name="instagram" size={18} />Join on Instagram <Icon name="arrow" size={16} /></Link><small className="detail-disclaimer">You’ll continue to Instagram to join this group chat.</small><CommunityDetailActions slug={community.slug} name={community.name} /></div></section><Reveal><section className="detail-info detail-info-polished"><article><p className="eyebrow">ABOUT</p><h2>About this community</h2><p>{community.description}</p></article><article className="detail-facts"><p className="eyebrow">COMMUNITY DETAILS</p><h2>At a glance</h2><dl><div><dt>Platform</dt><dd>Instagram</dd></div>{communityRow.language && <div><dt>Language</dt><dd>{communityRow.language}</dd></div>}{communityRow.region && <div><dt>Region</dt><dd>{communityRow.region}</dd></div>}{communityRow.typical_approval_time_minutes !== null && <div><dt>Typical approval</dt><dd>About {communityRow.typical_approval_time_minutes} min</dd></div>}{isVerified && lastVerified && <div><dt>Last verified</dt><dd>{lastVerified}</dd></div>}</dl></article></section></Reveal><Reveal><aside className="detail-safety"><Icon name="shield" size={22} /><div><b>Join with care</b><p>Review the group details on Instagram before joining. ChatScout does not access private group messages.</p></div></aside></Reveal>{related.length > 0 && <Reveal><section className="discover-section detail-related"><div className="section-heading"><div><p className="eyebrow">KEEP EXPLORING</p><h2>Similar <span>communities</span></h2></div><Link href="/search">Explore all <Icon name="arrow" size={14} /></Link></div><CommunityGrid communities={related} compact /></section></Reveal>}</main></PageShell>;
}
