import { PageShell } from "@/components/layout/page-shell";
import { PlatformListing } from "@/features/discovery/platform-listing";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return <PageShell><PlatformListing kind="search" query={(await searchParams).q ?? ""} /></PageShell>; }
