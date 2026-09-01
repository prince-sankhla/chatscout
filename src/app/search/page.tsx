import { PageShell } from "@/components/layout/page-shell";
import { PlatformListing } from "@/features/discovery/platform-listing";

type SearchParams = { q?: string; category?: string; sort?: "newest" | "members"; language?: string; region?: string; age?: string; members?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <PageShell>
      <PlatformListing kind="search" query={params.q ?? ""} category={params.category ?? ""} sort={params.sort === "members" ? "members" : "newest"} language={params.language ?? ""} region={params.region ?? ""} age={params.age ?? ""} members={params.members ?? ""} />
    </PageShell>
  );
}
