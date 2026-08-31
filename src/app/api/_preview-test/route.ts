import { NextResponse } from "next/server";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";

export async function GET() {
  const urls = [
    "https://ig.me/j/D1UJETnFFmQOFtWN/",
    "https://ig.me/j/Abb10UiBCdmOfuHg/",
  ];
  const results = await Promise.all(urls.map(async (url) => ({ url, preview: await resolveRenderedCommunityPreview(url) })));
  return NextResponse.json(results, { headers: { "cache-control": "no-store" } });
}
