/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import Link from "next/link";
import type { Community } from "@/types/community";
import { Icon } from "@/components/ui/icon";

export function CommunityCard({ community, rank, compact = false }: { community: Community; rank?: number; compact?: boolean }) {
  return <article className={`community-card ${compact ? "community-card-compact" : ""}`}>
    <Link className={`community-art art-${community.accent}`} href={`/community/${community.slug}`} aria-label={`View ${community.name}`}>{community.imageUrl ? <img className="community-image" src={community.imageUrl} alt="" /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}{rank && <span className="rank">{rank}</span>}{community.isDemo && <span className="demo-stamp">DEMO</span>}</Link>
    <div className="community-info"><div className="community-title-row"><h3><Link href={`/community/${community.slug}`}>{community.name}</Link></h3>{community.isDemo && <span className="demo-pill">Demo</span>}</div><div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p className="community-members"><Icon name="users" size={15} />{community.membersLabel}</p>{!compact && <p className="community-description">{community.description}</p>}<Link className="join-button" href={`/community/${community.slug}`}><Icon name="instagram" size={17} />View community</Link></div>
  </article>;
}
