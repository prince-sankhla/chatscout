/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import Link from "next/link";
import type { Community } from "@/types/community";
import { Icon } from "@/components/ui/icon";

export function CommunityCard({ community, compact = false }: { community: Community; compact?: boolean }) {
  const verification = community.verificationStatus ?? "unverified";
  const healthLabel = community.healthLabel ?? "Active listing";
  const isActive = healthLabel.toLowerCase().startsWith("active");

  return <article className={`community-card ${compact ? "community-card-compact" : ""}`}>
    <Link className={`community-art art-${community.accent}`} href={`/community/${community.slug}`} aria-label={`View ${community.name}`}>
      {community.imageUrl ? <img className="community-image" src={community.imageUrl} alt="" /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}
      <span className="community-status-overlay" aria-label="Community status">
        {isActive && <span className="community-status-pill community-active-pill"><span className="community-active-dot" aria-hidden="true" />Active</span>}
        {verification === "verified" && <span className="community-status-pill community-verified-pill"><Icon name="check" size={12} />Verified</span>}
      </span>
    </Link>
    <div className="community-info">
      <div className="community-title-row">
        <h3><Link href={`/community/${community.slug}`}>{community.name}</Link></h3>
      </div>
      <div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="community-trust-row"><span><Icon name="users" size={15} />{community.membersLabel}</span><span>{community.listingAgeLabel ?? "Recently listed"}</span></div>
      {!compact && <p className="community-description">{community.description}</p>}
      <Link className="join-button" href={`/community/${community.slug}`}><Icon name="instagram" size={17} />View community</Link>
    </div>
  </article>;
}
