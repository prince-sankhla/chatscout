/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import Link from "next/link";
import type { Community } from "@/types/community";
import { Icon } from "@/components/ui/icon";

function verificationLabel(status: Community["verificationStatus"] = "unverified") {
  if (status === "verified") return "Verified";
  if (status === "needs_review") return "Needs review";
  if (status === "broken") return "Broken link";
  return "Not verified";
}

export function CommunityCard({ community, rank, compact = false }: { community: Community; rank?: number; compact?: boolean }) {
  const verification = community.verificationStatus ?? "unverified";
  return <article className={`community-card ${compact ? "community-card-compact" : ""}`}>
    <Link className={`community-art art-${community.accent}`} href={`/community/${community.slug}`} aria-label={`View ${community.name}`}>
      {community.imageUrl ? <img className="community-image" src={community.imageUrl} alt="" /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}
      {rank && <span className="rank">{rank}</span>}
    </Link>
    <div className="community-info">
      <div className="community-title-row">
        <h3><Link href={`/community/${community.slug}`}>{community.name}</Link></h3>
        {verification === "verified" && <span className="community-verified-badge"><Icon name="check" size={12} /> Verified</span>}
      </div>
      <div className="tag-row">{community.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="community-trust-row"><span><Icon name="users" size={15} />{community.membersLabel}</span><span>{verificationLabel(verification)}</span></div>
      <div className="community-trust-row secondary"><span>{community.healthLabel ?? "Active listing"}</span><span>{community.listingAgeLabel ?? "Recently listed"}</span></div>
      {!compact && <p className="community-description">{community.description}</p>}
      <Link className="join-button" href={`/community/${community.slug}`}><Icon name="instagram" size={17} />View community</Link>
    </div>
  </article>;
}
