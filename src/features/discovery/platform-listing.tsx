import Link from "next/link";
import { CommunityGrid } from "@/components/community/community-grid";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { SearchForm } from "@/components/discovery/search-form";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedCommunities, searchPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";

type ListingKind = "search" | "trending" | "new";

type ListingProps = {
  kind: ListingKind;
  query?: string;
  category?: string;
  sort?: "newest" | "members";
};

export async function PlatformListing({ kind, query = "", category = "", sort = "newest" }: ListingProps) {
  const filters = { categorySlug: category || undefined, sort };
  const result = kind === "search"
    ? await searchPublishedCommunities(query, filters)
    : await getPublishedCommunities(filters);
  const communities = result.data ? await Promise.all(result.data.map(toCommunityPresentation)) : [];
  const title = kind === "search" ? "Search communities" : kind === "trending" ? "Trending communities" : "New communities";
  const subtitle = kind === "search" && query
    ? `Results for “${query}”`
    : kind === "trending"
      ? "Find active Instagram group chats worth joining."
      : "Freshly published Instagram group chats.";
  const resultCount = communities.length;

  return (
    <main className="platform-page">
      <section className="platform-heading">
        <Link href="/" className="back-link">← Back to discovery</Link>
        <p className="eyebrow">CHATSCOUT DISCOVERY</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {kind === "search" && <SearchForm query={query} className="platform-search" />}
      </section>
      <div className="listing-toolbar">
        <div>
          <strong>{resultCount ? `${resultCount} communities` : "No communities"}</strong>
          <span>Public listings only</span>
        </div>
        <DiscoveryFilters category={category} sort={sort} />
      </div>
      <Reveal>
        {result.error
          ? <p className="neon-empty">Communities are temporarily unavailable. Please try again later.</p>
          : communities.length
            ? <CommunityGrid communities={communities} />
            : <div className="listing-empty"><p className="neon-empty">No published communities match these filters yet.</p><Link href="/submit" className="join-button empty-cta">List the first community</Link></div>}
      </Reveal>
    </main>
  );
}
