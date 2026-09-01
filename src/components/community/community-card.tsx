/* eslint-disable @next/next/no-img-element -- Supabase signed image URLs cannot use a static Next image remote pattern. */
import Link from "next/link";
import type { Community } from "@/types/community";
import { Icon } from "@/components/ui/icon";

const PLATFORM_META: Record<NonNullable<Community["platform"]>, { label: string; icon: "instagram" | "whatsapp" | "telegram" | "discord" }> = {
  instagram: { label: "Instagram", icon: "instagram" },
  whatsapp: { label: "WhatsApp", icon: "whatsapp" },
  telegram: { label: "Telegram", icon: "telegram" },
  discord: { label: "Discord", icon: "discord" },
};

export function CommunityCard({ community, compact = false }: { community: Community; compact?: boolean }) {
  const verification = community.verificationStatus ?? "unverified";
  const healthLabel = community.healthLabel ?? "Active listing";
  const isActive = healthLabel.toLowerCase().startsWith("active");
  const platform = community.platform ?? "instagram";
  const platformMeta = PLATFORM_META[platform];

  return <article className={`community-card ${compact ? "community-card-compact" : ""}`}>
    <Link className={`community-art art-${community.accent}`} href={`/community/${community.slug}`} aria-label={`View ${community.name}`}>
      {community.imageUrl ? <img className="community-image" src={community.imageUrl} alt="" /> : <><span className="art-orbit" /><span className="art-copy">{community.initials.split("\n").map((line) => <span key={line}>{line}</span>)}</span></>}
      <span className="community-status-overlay" aria-label="Community status">
        {isActive && <span className="community-status-pill community-active-pill"><span className="community-active-dot" aria-hidden="true" />Active</span>}
        {verification === "verified" && <span className="community-status-pill community-verified-pill"><Icon name="check" size={12} />Verified</span>}
      </span>
      <span className={`community-platform-pill community-platform-${platform}`} title={platformMeta.label} aria-label={`${platformMeta.label} community`}><Icon name={platformMeta.icon} size={13} />{platformMeta.label}</span>
    </Link>
    <div className="community-info">
      <div className="community-title-row">
        <h3><Link href={`/community/${community.slug}`}>{community.name}</Link></h3>
      </div>
      <div className="tag-row"><span className={`platform-tag platform-tag-${platform}`}><Icon name={platformMeta.icon} size={12} />{platformMeta.label}</span>{community.tags.filter((tag) => tag.toLowerCase() !== platformMeta.label.toLowerCase()).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="community-trust-row"><span><Icon name="users" size={15} />{community.membersLabel}</span><span>{community.listingAgeLabel ?? "Recently listed"}</span></div>
      {!compact && <p className="community-description">{community.description}</p>}
      <Link className={`join-button join-button-${platform}`} href={`/community/${community.slug}`}><Icon name={platformMeta.icon} size={17} />View on {platformMeta.label}</Link>
    </div>
  </article>;
}
