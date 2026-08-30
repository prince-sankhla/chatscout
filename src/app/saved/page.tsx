import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getPublishedCommunities } from "@/features/communities/data-access";
import { toCommunityPresentation } from "@/features/communities/presentation";
import { SavedCommunities } from "@/features/discovery/saved-communities";
export default async function SavedPage() { const result = await getPublishedCommunities(); const communities = result.data ? await Promise.all(result.data.map(toCommunityPresentation)) : []; return <PageShell><main className="platform-page"><section className="platform-heading"><Link href="/" className="back-link">← Back to discovery</Link><p className="eyebrow">YOUR COLLECTION</p><h1>Saved communities</h1><p>Communities saved in this browser appear here.</p></section><SavedCommunities communities={communities} /></main></PageShell>; }
