import Link from "next/link";
import { CommunityGrid } from "@/components/community/community-grid";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { SearchForm } from "@/components/discovery/search-form";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedCommunities, getTrendingPublishedCommunities, searchPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";
import styles from "./platform-listing.module.css";

type ListingKind = "search" | "trending" | "new";
type ListingProps = { kind: ListingKind; query?: string; category?: string; sort?: "newest" | "members" };

export async function PlatformListing({ kind, query = "", category = "", sort = "newest" }: ListingProps) {
  const result = kind === "search"
    ? await searchPublishedCommunities(query, { categorySlug: category || undefined, sort })
    : kind === "trending"
      ? await getTrendingPublishedCommunities({ categorySlug: category || undefined }, 24)
      : await getPublishedCommunities({ categorySlug: category || undefined, sort: sort === "members" ? "members" : "newest" });
  const communities = result.data ? await Promise.all(result.data.map(toCommunityPresentation)) : [];
  const title = kind === "search" ? "Search communities" : kind === "trending" ? "Trending communities" : "New communities";
  const subtitle = kind === "search" && query ? `Results for “${query}”` : kind === "trending" ? "What people are discovering and joining right now." : "Freshly published Instagram group chats.";

  return (
    <main className="platform-page">
      <section className="platform-heading">
        <Link href="/" className="back-link">← Back to discovery</Link>
        <p className="eyebrow">CHATSCOUT DISCOVERY</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {kind === "search" && <SearchForm query={query} className="platform-search" />}
      </section>
      <div className={styles.toolbar}>
        <div className={styles.summary}>
          <strong>{communities.length ? `${communities.length} communities` : "No communities"}</strong>
          <span>{kind === "trending" ? "Ranked by recent views + joins" : "Published listings only"}</span>
        </div>
        <DiscoveryFilters category={category} sort={sort} showSort={kind !== "trending"} />
      </div>
      <Reveal>
        {result.error
          ? <p className="neon-empty">Communities are temporarily unavailable. Please try again later.</p>
          : communities.length
            ? <CommunityGrid communities={communities} />
            : <div className={styles.empty}><p className="neon-empty">No published communities match these filters yet.</p><Link href="/submit" className={`join-button ${styles.emptyCta}`}>List the first community</Link></div>}
      </Reveal>
    </main>
  );
}
