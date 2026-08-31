import { NextResponse } from "next/server";
import { resolveCommunityPreview } from "@/features/community-monitor/resolver";

function validInviteUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && host === "ig.me" && url.pathname.startsWith("/j/");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { inviteUrl?: string };
    const inviteUrl = typeof body.inviteUrl === "string" ? body.inviteUrl.trim() : "";
    if (!validInviteUrl(inviteUrl)) return NextResponse.json({ error: "Enter a valid Instagram group invite URL." }, { status: 400 });
    return NextResponse.json(await resolveCommunityPreview(inviteUrl));
  } catch {
    return NextResponse.json({ error: "Community preview could not be fetched." }, { status: 400 });
  }
}
