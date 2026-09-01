import { NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { resolveCommunityPreview } from "@/features/community-monitor/resolver";
import { storeRemoteCommunityImage } from "@/features/community-monitor/resolver";

const ALLOWED_PLATFORMS = new Set(["instagram", "whatsapp", "telegram", "discord"]);

function validInviteUrl(value: string, platform: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !ALLOWED_PLATFORMS.has(platform)) return false;
    const host = url.hostname.toLowerCase();
    switch (platform) {
      case "instagram":
        return (host === "ig.me" && /^\/j\/[^/]+\/?$/i.test(url.pathname))
          || host === "instagram.com"
          || host.endsWith(".instagram.com");
      case "whatsapp":
        return host === "chat.whatsapp.com"
          || host === "wa.me"
          || host === "whatsapp.com"
          || host.endsWith(".whatsapp.com");
      case "telegram":
        return host === "t.me"
          || host === "telegram.me"
          || host.endsWith(".t.me")
          || host === "telegram.org";
      case "discord":
        return host === "discord.gg"
          || host === "discord.com"
          || host.endsWith(".discord.com");
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to fetch community details." }, { status: 401 });

    const body = await request.json() as { inviteUrl?: string; platform?: string };
    const inviteUrl = typeof body.inviteUrl === "string" ? body.inviteUrl.trim() : "";
    const platform = typeof body.platform === "string" ? body.platform.toLowerCase().trim() : "";

    if (!validInviteUrl(inviteUrl, platform)) {
      return NextResponse.json({ error: "Enter a valid HTTPS community invite URL for the selected platform." }, { status: 400 });
    }

    const preview = await resolveCommunityPreview(inviteUrl);
    const imagePath = preview.imageUrl ? await storeRemoteCommunityImage(preview.imageUrl, user.id) : null;

    return NextResponse.json({
      ...preview,
      imagePath,
      success: Boolean(preview.name || preview.memberCount !== null || preview.imageUrl),
      platform,
    });
  } catch {
    return NextResponse.json({ error: "Community preview could not be fetched." }, { status: 400 });
  }
}
