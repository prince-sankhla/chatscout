import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { PlatformListing } from "@/features/discovery/platform-listing";
type SearchParams={q?:string;category?:string;platform?:"instagram"|"whatsapp"|"telegram"|"discord";sort?:"newest"|"members";language?:string;region?:string;age?:string;members?:string};
export const metadata:Metadata={robots:{index:false,follow:true}};
export default async function SearchPage({searchParams}:{searchParams:Promise<SearchParams>}){const p=await searchParams;return <PageShell><PlatformListing kind="search" query={p.q??""} category={p.category??""} platform={p.platform??""} sort={p.sort==="members"?"members":"newest"} language={p.language??""} region={p.region??""} age={p.age??""} members={p.members??""}/></PageShell>;}
