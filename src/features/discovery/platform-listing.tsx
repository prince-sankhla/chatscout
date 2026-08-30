import Link from "next/link";
import { CommunityGrid } from "@/components/community/community-grid";
import { SearchForm } from "@/components/discovery/search-form";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedCommunities, searchPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

type ListingKind = "search" | "trending" | "new";

export async function PlatformListing({ kind, query = "" }: { kind: ListingKind; query?: string }) {
  const result = kind === "search" && query ? await searchPublishedCommunities(query) : await getPublishedCommunities();
  const communities = result.data ? await Promise.all(result.data.map(toCommunityPresentation)) : [];
  const title = kind === "search" ? "Search communities" : kind === "trending" ? "Trending communities" : "New communities";
  const subtitle = kind === "search" && query ? `Results for “${query}”` : kind === "trending" ? "Browse active Instagram group chats." : "The latest published Instagram group chats.";
  return <main className="platform-page"><section className="platform-heading"><Link href="/" className="back-link">← Back to discovery</Link><p className="eyebrow">CHATSCOUT DISCOVERY</p><h1>{title}</h1><p>{subtitle}</p>{kind === "search" && <SearchForm query={query} className="platform-search" />}</section><Reveal>{result.error ? <p className="neon-empty">Communities are temporarily unavailable. Please try again later.</p> : communities.length ? <CommunityGrid communities={communities} /> : <p className="neon-empty">No published communities match this view yet.</p>}</Reveal></main>;
}
