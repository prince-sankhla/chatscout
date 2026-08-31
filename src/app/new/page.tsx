import { PageShell } from "@/components/layout/page-shell";
import { PlatformListing } from "@/features/discovery/platform-listing";

type SearchParams = { category?: string; sort?: "newest" | "members" };

export default async function NewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <PageShell>
      <PlatformListing
        kind="new"
        category={params.category ?? ""}
        sort={params.sort === "members" ? "members" : "newest"}
      />
    </PageShell>
  );
}
