import { NextResponse } from "next/server";
import { resolveCommunityPreview } from "@/features/community-monitor/resolver";

const TEST_INVITE = "https://ig.me/j/D1UJETnFFmQOFtWN/";

export async function GET() {
  const preview = await resolveCommunityPreview(TEST_INVITE);
  return NextResponse.json(preview, { headers: { "cache-control": "no-store" } });
}
