import type { Community } from "@/types/community";
import { CommunityCard } from "./community-card";

export function CommunityGrid({ communities, compact = false }: { communities: Community[]; compact?: boolean }) {
  return <div className={`community-grid ${compact ? "compact-grid" : ""}`}>{communities.map((community, index) => <CommunityCard community={community} rank={compact ? undefined : index + 1} compact={compact} key={community.slug} />)}</div>;
}
