import { NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { resolveCommunityPreview, storeRemoteCommunityImage } from "@/features/community-monitor/resolver";

function validInviteUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && host === "ig.me" && url.pathname.startsWith("/j/");
  } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to fetch community details." }, { status: 401 });
    const body = await request.json() as { inviteUrl?: string };
    const inviteUrl = typeof body.inviteUrl === "string" ? body.inviteUrl.trim() : "";
    if (!validInviteUrl(inviteUrl)) return NextResponse.json({ error: "Enter a valid Instagram group invite URL." }, { status: 400 });
    const preview = await resolveCommunityPreview(inviteUrl);
    const imagePath = preview.imageUrl ? await storeRemoteCommunityImage(preview.imageUrl, user.id) : null;
    return NextResponse.json({ ...preview, imagePath });
  } catch {
    return NextResponse.json({ error: "Community preview could not be fetched." }, { status: 400 });
  }
}
