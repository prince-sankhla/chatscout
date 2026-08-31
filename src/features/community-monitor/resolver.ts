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
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const value = Number.parseInt(code, 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : _;
    });
}

function meta(html: string, property: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] ?? reverse.exec(html)?.[1] ?? "") || null;
}

function absoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return null;
  }
}

function looksLikeImageUrl(value: string) {
  return /\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(value)
    || /(?:scontent|fbcdn|cdninstagram|instagram).*\.(?:jpe?g|png|webp)/i.test(value)
    || /(?:image|photo|picture|avatar|profile[_-]?pic)/i.test(value);
}

function extractImage(html: string, baseUrl: string) {
  const candidates: string[] = [
    meta(html, "og:image"),
    meta(html, "og:image:url"),
    meta(html, "twitter:image"),
    meta(html, "twitter:image:src"),
  ].filter((value): value is string => Boolean(value));

  const imageTags = [...html.matchAll(/<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);
  candidates.push(...imageTags);

  const srcSets = [...html.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)]
    .flatMap((match) => match[1].split(",").map((part) => part.trim().split(/\s+/)[0]));
  candidates.push(...srcSets);

  const preloads = [...html.matchAll(/<link[^>]+(?:rel=["'](?:preload|image_src)["'][^>]+)?(?:href|content)=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);
  candidates.push(...preloads);

  const absoluteCandidates = candidates
    .map((value) => absoluteUrl(value, baseUrl))
    .filter((value): value is string => Boolean(value));

  const genericUrls = [...html.matchAll(/https?:\\?\\?/gi)];
  void genericUrls;

  return absoluteCandidates.find(looksLikeImageUrl) ?? absoluteCandidates.find((url) => /(?:scontent|fbcdn|cdninstagram)/i.test(url)) ?? null;
}

function visibleText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\\u0026/g, "&")
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractMembers(html: string) {
  const text = visibleText(html);
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

function cleanName(value: string) {
  const name = decodeHtml(value).replace(/\\u0026/g, "&").replace(/\s+/g, " ").trim();
  if (!name || name.length > 120) return null;
  if (/^(you'?re|you are) invited to join a group chat on instagram$/i.test(name)) return null;
  if (/^(instagram|group chat|use the instagram app)/i.test(name)) return null;
  return name.replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i, "").trim() || null;
}

function extractName(html: string) {
  const directMeta = [meta(html, "og:title"), meta(html, "twitter:title")].filter((value): value is string => Boolean(value));
  for (const value of directMeta) {
    const name = cleanName(value);
    if (name) return name;
  }

  const keyed = html.match(/(?:thread[_-]?title|group[_-]?name|community[_-]?name)["'\s:=]+["']([^"']{2,120})["']/i)?.[1];
  const keyedName = keyed ? cleanName(keyed) : null;
  if (keyedName) return keyedName;

  const text = visibleText(html);
  const memberMatch = text.match(/(.{2,120})\s+(\d[\d,\.\s]*)\s+members?/i);
  if (memberMatch) {
    const before = memberMatch[1].trim().split(/\s{2,}|[|•]/).pop() ?? memberMatch[1];
    const candidate = cleanName(before);
    if (candidate) return candidate;
  }

  const headings = [...html.matchAll(/<(?:h1|h2|h3|strong|b)[^>]*>([\s\S]{2,180}?)<\/(?:h1|h2|h3|strong|b)>/gi)]
    .map((match) => cleanName(match[1].replace(/<[^>]*>/g, " ")))
    .filter((value): value is string => Boolean(value));
  return headings.find((value) => !/members?/i.test(value)) ?? null;
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  try {
    const response = await fetchWithTimeout(inviteUrl);
    if (!response.ok) return { name: null, memberCount: null, imageUrl: null, finalUrl: response.url || null };
    const html = await response.text();
    const baseUrl = response.url || inviteUrl;
    return {
      name: extractName(html),
      memberCount: extractMembers(html),
      imageUrl: extractImage(html, baseUrl),
      finalUrl: baseUrl,
    };
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
