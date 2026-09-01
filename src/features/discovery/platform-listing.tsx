import Link from "next/link";
import { CommunityGrid } from "@/components/community/community-grid";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { SearchForm } from "@/components/discovery/search-form";
import { Reveal } from "@/components/ui/reveal";
import { getActiveCategories, getPublishedCommunities, getTrendingPublishedCommunities, searchPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";
import styles from "./platform-listing.module.css";

type ListingKind = "search" | "trending" | "new";
type ListingProps = { kind: ListingKind; query?: string; category?: string; sort?: "newest" | "members"; language?: string; region?: string; age?: string; members?: string };

function memberBounds(value: string) {
  if (!value) return {};
  const [min, max] = value.split("-").map(Number);
  return { minMembers: Number.isFinite(min) ? min : undefined, maxMembers: Number.isFinite(max) ? max : undefined };
}

const TOPIC_CHIPS = ["AI & ML", "Coding", "JEE", "NEET", "Anime", "Gaming", "Startups", "Fitness", "Jaipur"];

export async function PlatformListing({ kind, query = "", category = "", sort = "newest", language = "", region = "", age = "", members = "" }: ListingProps) {
  const bounds = memberBounds(members);
  const filters = { categorySlug: category || undefined, language: language || undefined, region: region || undefined, age: (age || undefined) as "any" | "everyone" | "13+" | "16+" | "18+" | undefined, ...bounds };
  const [{ data: categoryRows }, result] = await Promise.all([
    getActiveCategories(),
    kind === "search"
      ? searchPublishedCommunities(query, { ...filters, sort })
      : kind === "trending"
        ? getTrendingPublishedCommunities({ ...filters }, 24)
        : getPublishedCommunities({ ...filters, sort: sort === "members" ? "members" : "newest" }),
  ]);
  const communities = result.data ? await Promise.all(result.data.map(toCommunityPresentation)) : [];
  const categoryOptions = categoryRows?.map((row) => [row.slug, row.name] as const) ?? [];
  const title = kind === "search" ? "Search communities" : kind === "trending" ? "Trending communities" : "New communities";
  const subtitle = kind === "search" && query ? `Results for “${query}”` : kind === "trending" ? "What people are discovering and joining right now." : "Freshly published Instagram group chats.";
  const activeFilterCount = [category, language, region, age, members].filter(Boolean).length;

  return (
    <main className="platform-page">
      <section className="platform-heading">
        <Link href="/" className="back-link">← Back to discovery</Link>
        <p className="eyebrow">CHATSCOUT DISCOVERY</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {kind === "search" && <SearchForm query={query} className="platform-search" />}
        <div className={styles.topics} aria-label="Popular topics">
          <span>Popular:</span>
          {TOPIC_CHIPS.map((topic) => <Link href={`/search?q=${encodeURIComponent(topic)}`} key={topic}>{topic}</Link>)}
        </div>
      </section>
      <div className={styles.toolbar}>
        <div className={styles.summary}>
          <strong>{communities.length ? `${communities.length} communities` : "No communities"}</strong>
          <span>{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : kind === "trending" ? "Ranked by recent views + joins" : "Published listings only"}</span>
        </div>
        <DiscoveryFilters category={category} sort={sort} language={language} region={region} age={age} members={members} showSort={kind !== "trending"} categories={categoryOptions.length ? categoryOptions : undefined} />
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
