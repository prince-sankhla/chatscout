import { PageShell } from "@/components/layout/page-shell";
import { DiscoveryHome } from "@/features/discovery/discovery-home";

type HomeProps = { searchParams: Promise<{ q?: string | string[] }> };

export default async function Home({ searchParams }: HomeProps) {
  const query = (await searchParams).q;
  const searchTerm = typeof query === "string" ? query : "";
  return <PageShell><DiscoveryHome searchTerm={searchTerm} /></PageShell>;
}
