import type { Community } from "@/types/community";
import type { CommunityRow } from "@/types/database";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";

const accents: Community["accent"][] = ["violet", "blue", "pink", "orange", "teal"];

function accentForSlug(slug: string): Community["accent"] {
  const value = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  return accents[value % accents.length];
}

function initialsForName(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).join("\n").toUpperCase();
}

function membersLabel(memberCount: number | null) {
  return memberCount === null ? "Member count unavailable" : `${memberCount.toLocaleString("en-IN")} members`;
}

function listingAgeLabel(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
  if (days < 1) return "Listed today";
  if (days < 30) return `Listed ${days}d ago`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `Listed ${months}mo ago`;
  const years = Math.floor(months / 12);
  return `Listed ${years}y ago`;
}

function healthLabel(community: CommunityRow) {
  if (community.health_status === "healthy") return "Active · checked recently";
  if (community.health_status === "needs_recheck") return "Needs recheck";
  if (community.health_status === "inactive" || community.verification_status === "broken") return "Inactive";
  if (community.join_enabled === false) return "Join temporarily unavailable";
  return "Active listing";
}

/** Maps stored listing data into the existing presentation-only community card shape. */
export async function toCommunityPresentation(community: CommunityRow): Promise<Community> {
  const tags = ["Instagram", community.language, community.region].filter((tag): tag is string => Boolean(tag));
  return {
    slug: community.slug,
    name: community.name,
    category: tags[0] ?? "Instagram",
    location: community.region ?? "Location unavailable",
    membersLabel: membersLabel(community.member_count),
    description: community.description,
    accent: accentForSlug(community.slug),
    initials: initialsForName(community.name),
    tags,
    isDemo: false,
    imageUrl: await getPublishedCommunityImageUrl(community.image_path),
    listingAgeLabel: listingAgeLabel(community.created_at),
    healthLabel: healthLabel(community),
    verificationStatus: community.verification_status,
  };
}
