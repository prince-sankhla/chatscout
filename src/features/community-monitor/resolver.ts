import "server-only";

import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

export type CommunityPreview = {
  name: string | null;
  memberCount: number | null;
  imageUrl: string | null;
  finalUrl: string | null;
};

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function meta(html: string, property: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] ?? reverse.exec(html)?.[1] ?? "") || null;
}

function extractImage(html: string) {
  const candidates: string[] = [meta(html, "og:image"), meta(html, "twitter:image")].filter((value): value is string => Boolean(value));
  const imageTags = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)].map((match) => decodeHtml(match[1]));
  candidates.push(...imageTags);
  return candidates.find((url) => /^https?:\/\//i.test(url)) ?? null;
}

function extractName(html: string) {
  const title = meta(html, "og:title") ?? meta(html, "twitter:title");
  if (title) return title.replace(/\s*[-|•].*$/, "").trim().slice(0, 120) || null;
  const match = html.match(/(?:group|community)[^\n<]{0,80}?([A-Za-z0-9][^<]{1,100})/i);
  return match?.[1]?.trim() ?? null;
}

function extractMembers(html: string) {
  const text = decodeHtml(html.replace(/<[^>]*>/g, " ").replace(/\\u0026/g, "&")).replace(/\s+/g, " ");
  const patterns = [/(\d[\d,\.\s]*)\s+members?/i, /members?\s*[:·-]?\s*(\d[\d,\.\s]*)/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1].replace(/[^0-9]/g, ""));
      if (Number.isSafeInteger(value)) return value;
    }
  }
  return null;
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ChatScoutBot/1.0)", Accept: "text/html,application/xhtml+xml" }, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  try {
    const response = await fetchWithTimeout(inviteUrl);
    if (!response.ok) return { name: null, memberCount: null, imageUrl: null, finalUrl: response.url || null };
    const html = await response.text();
    return { name: extractName(html), memberCount: extractMembers(html), imageUrl: extractImage(html), finalUrl: response.url || inviteUrl };
  } catch {
    return { name: null, memberCount: null, imageUrl: null, finalUrl: null };
  }
}

export async function storeRemoteCommunityImage(imageUrl: string, ownerUserId: string) {
  try {
    const response = await fetchWithTimeout(imageUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/jpeg" ? "jpg" : null;
    if (!extension || !ownerUserId) return null;
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
    const path = `submissions/${ownerUserId}/${crypto.randomUUID()}.${extension}`;
    const admin = createAdminSupabaseClient();
    const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).upload(path, bytes, { contentType, cacheControl: "31536000", upsert: false });
    return error ? null : path;
  } catch {
    return null;
  }
}
