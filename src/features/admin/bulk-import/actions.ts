"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";
import { resolveCommunityPreview, storeRemoteCommunityImage } from "@/features/community-monitor/resolver";

const MAX_URLS = 100;
const IG_ME_PATTERN = /^https:\/\/ig\.me\/j\/[^/]+\/?$/i;
const INSTAGRAM_INVITE_PATTERN = /^https:\/\/(?:www\.)?instagram\.com\/j\/[^/]+\/?$/i;

function categorySlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function communitySlug(name: string) {
  const base = categorySlug(name) || "community";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function isInviteUrl(value: string) {
  return IG_ME_PATTERN.test(value) || INSTAGRAM_INVITE_PATTERN.test(value);
}

function defaultDescription(category: string, name: string) {
  const map: Record<string, string> = {
    "College & University": `A student community for ${name} to connect, chat, and meet people with similar interests.`,
    "Coding": `A community for ${name} members to connect, discuss programming, and share ideas.`,
    "Gaming": `A gaming community for ${name} members to chat, connect, and play together.`,
    "Anime & Manga": `A community for anime and manga fans to chat, share recommendations, and discuss their favourite series.`,
    "Study Groups": `A study-focused community for ${name} members to connect, discuss subjects, and study together.`,
    "JEE & NEET": `A preparation community for students working towards JEE or NEET and related entrance goals.`,
    "Competitive Exams": `A community for exam aspirants to discuss preparation, resources, and study strategies.`,
    "Creators": `A creator community for sharing ideas, networking, and discussing content creation.`,
    "Memes & Humor": `A casual meme and humor community for sharing jokes, reactions, and internet culture.`,
  };
  return map[category] ?? `A community for ${name} members to connect, chat, and discover people with similar interests.`;
}

function defaultRules() {
  return "Be respectful. No spam, harassment, scams, or inappropriate content.";
}

export type BulkImportResult = {
  inputCount: number;
  imported: number;
  skipped: number;
  failed: number;
  items: Array<{ url: string; status: "imported" | "skipped" | "failed"; name?: string; members?: number | null; reason?: string }>;
};

export async function bulkImportCommunities(formData: FormData): Promise<BulkImportResult> {
  const adminUser = await requireAdminUser();
  const categoryValue = formData.get("category");
  const category = typeof categoryValue === "string" ? categoryValue.trim() : "";
  const languageValue = formData.get("language");
  const language = typeof languageValue === "string" ? languageValue.trim().slice(0, 80) : "";
  const regionValue = formData.get("region");
  const region = typeof regionValue === "string" ? regionValue.trim().slice(0, 120) : "";
  const urlsValue = formData.get("urls");
  const urlsText = typeof urlsValue === "string" ? urlsValue : "";

  if (!category) return { inputCount: 0, imported: 0, skipped: 0, failed: 1, items: [{ url: "", status: "failed", reason: "Choose a category." }] };

  const urls = [...new Set(urlsText.split(/\s+/).map((value) => value.trim()).filter(Boolean))].slice(0, MAX_URLS);
  const supabase = createAdminSupabaseClient();
  const result: BulkImportResult = { inputCount: urls.length, imported: 0, skipped: 0, failed: 0, items: [] };

  for (const inviteUrl of urls) {
    if (!isInviteUrl(inviteUrl)) {
      result.failed += 1;
      result.items.push({ url: inviteUrl, status: "failed", reason: "Invalid Instagram group invite URL." });
      continue;
    }

    try {
      const { data: existing } = await supabase.from("communities").select("id,name,member_count,image_path").eq("invite_url", inviteUrl).maybeSingle();
      if (existing) {
        result.skipped += 1;
        result.items.push({ url: inviteUrl, status: "skipped", name: existing.name, members: existing.member_count, reason: "Already listed." });
        continue;
      }

      const preview = await resolveCommunityPreview(inviteUrl);
      if (!preview.name || preview.memberCount === null || !preview.imageUrl) {
        result.failed += 1;
        result.items.push({ url: inviteUrl, status: "failed", name: preview.name ?? undefined, members: preview.memberCount, reason: "Could not reliably detect current name, member count, and image." });
        continue;
      }

      const imagePath = await storeRemoteCommunityImage(preview.imageUrl, adminUser.id);
      if (!imagePath) {
        result.failed += 1;
        result.items.push({ url: inviteUrl, status: "failed", name: preview.name, members: preview.memberCount, reason: "Detected image could not be saved." });
        continue;
      }

      const { data: community, error } = await supabase
        .from("communities")
        .insert({
          name: preview.name,
          slug: communitySlug(preview.name),
          invite_url: inviteUrl,
          description: defaultDescription(category, preview.name),
          community_rules: defaultRules(),
          age_restriction: null,
          eligibility: null,
          restrictions: null,
          language: language || null,
          region: region || null,
          member_count: preview.memberCount,
          image_path: imagePath,
          status: "published",
          join_enabled: true,
          owner_user_id: null,
          source_submission_id: null,
          published_at: new Date().toISOString(),
          archived_at: null,
          archived_by: null,
        })
        .select("id,slug")
        .single();

      if (error || !community) {
        result.failed += 1;
        result.items.push({ url: inviteUrl, status: "failed", name: preview.name, members: preview.memberCount, reason: "Database insert failed." });
        await supabase.storage.from("community-images").remove([imagePath]);
        continue;
      }

      const categorySlugValue = categorySlug(category);
      const { data: categoryRow, error: categoryError } = await supabase
        .from("categories")
        .upsert({ name: category, slug: categorySlugValue, is_active: true }, { onConflict: "slug" })
        .select("id")
        .single();
      if (categoryError || !categoryRow) {
        await supabase.from("communities").delete().eq("id", community.id);
        await supabase.storage.from("community-images").remove([imagePath]);
        result.failed += 1;
        result.items.push({ url: inviteUrl, status: "failed", name: preview.name, members: preview.memberCount, reason: "Category mapping failed." });
        continue;
      }

      const { error: linkError } = await supabase.from("community_categories").upsert(
        { community_id: community.id, category_id: categoryRow.id },
        { onConflict: "community_id,category_id" },
      );
      if (linkError) {
        await supabase.from("communities").delete().eq("id", community.id);
        await supabase.storage.from("community-images").remove([imagePath]);
        result.failed += 1;
        result.items.push({ url: inviteUrl, status: "failed", name: preview.name, members: preview.memberCount, reason: "Category link failed." });
        continue;
      }

      result.imported += 1;
      result.items.push({ url: inviteUrl, status: "imported", name: preview.name, members: preview.memberCount });
    } catch {
      result.failed += 1;
      result.items.push({ url: inviteUrl, status: "failed", reason: "Unexpected import error." });
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/categories");
  revalidatePath("/trending");
  revalidatePath("/new");
  revalidatePath("/admin");
  return result;
}
