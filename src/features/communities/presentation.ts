import type { Community } from "@/types/community";
import type { CommunityRow } from "@/types/database";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";

const accents: Community["accent"][] = ["violet", "blue", "pink", "orange", "teal"];

function accentForSlug(slug: string): Community["accent"] {
  const value = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  return accents[value % accents.length];
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join("\n")
    .toUpperCase();
}

function membersLabel(memberCount: number | null) {
  return memberCount === null ? "Member count unavailable" : `${memberCount.toLocaleString("en-IN")} members`;
}

/** Maps stored listing data into the existing, presentation-only community card shape. */
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
  };
}
