import "server-only";

import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

export type CommunityPreview = {
  name: string | null;
  memberCount: number | null;
  imageUrl: string | null;
  finalUrl: string | null;
};

const EMPTY_PREVIEW: CommunityPreview = {
  name: null,
  memberCount: null,
  imageUrl: null,
  finalUrl: null,
};

function decodeHtml(value: string) {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0022/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
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
  return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(value)
    || /(?:scontent|fbcdn|cdninstagram)/i.test(value)
    || /(?:image|photo|picture|avatar|profile[_-]?pic)/i.test(value);
}

function isLikelyGenericInstagramAsset(value: string) {
  return /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo)/i.test(value);
}

function extractImage(html: string, baseUrl: string) {
  // Prefer images that appear in the actual page over generic OpenGraph defaults.
  const candidates: string[] = [];

  for (const match of html.matchAll(/<(?:img|source)[^>]+(?:src|data-src|data-original|poster)=["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(match[1]);
  }

  for (const match of html.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    candidates.push(...match[1].split(",").map((part) => part.trim().split(/\s+/)[0]));
  }

  const decoded = decodeHtml(html);
  for (const match of decoded.matchAll(/https?:\/\/[^"'\s<>]+/gi)) {
    const url = match[0].replace(/\\+$/g, "");
    if (looksLikeImageUrl(url)) candidates.push(url);
  }

  candidates.push(
    ...[meta(html, "og:image"), meta(html, "og:image:url"), meta(html, "twitter:image"), meta(html, "twitter:image:src")]
      .filter((value): value is string => Boolean(value)),
  );

  const absoluteCandidates = [...new Set(
    candidates
      .map((value) => absoluteUrl(value, baseUrl))
      .filter((value): value is string => Boolean(value)),
  )];

  return absoluteCandidates.find((url) => !isLikelyGenericInstagramAsset(url) && looksLikeImageUrl(url))
    ?? absoluteCandidates.find((url) => !isLikelyGenericInstagramAsset(url) && /(?:scontent|fbcdn|cdninstagram)/i.test(url))
    ?? absoluteCandidates.find(looksLikeImageUrl)
    ?? null;
}

function visibleText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractMembers(html: string) {
  const candidates = [visibleText(html), decodeHtml(html)];
  const patterns = [
    /(\d[\d,\.\s]*)\s+members?/i,
    /members?\s*[:·-]?\s*(\d[\d,\.\s]*)/i,
    /member[_-]?count["'\s:=]+(\d+)/i,
    /participants?["'\s:=]+(\d+)/i,
  ];

  for (const text of candidates) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const value = Number(match[1].replace(/[^0-9]/g, ""));
      if (Number.isSafeInteger(value)) return value;
    }
  }
  return null;
}

function cleanName(value: string) {
  const name = decodeHtml(value)
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length > 120) return null;
  if (/^(you'?re|you are) invited to join a group chat on instagram$/i.test(name)) return null;
  if (/^you(?:&apos;|')re invited to join/i.test(name)) return null;
  if (/^(instagram|group chat|use the instagram app)/i.test(name)) return null;
  if /^\d[\d,\.\s]*\s+members?$/i.test(name) return null;
  const normalized = name.replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase();
  if (/^(directgroup|directgrouplink|direct group link)$/.test(normalized)) return null;
  return name
    .replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i, "")
    .replace(/^\s*[•·|:-]\s*/, "")
    .trim() || null;
}

function extractName(html: string) {
  // Prefer the visible title immediately before the member count.
  const text = visibleText(html);
  const memberMatch = text.match(/(.{2,120}?)\s+(\d[\d,\.\s]*)\s+members?/i);
  if (memberMatch) {
    const before = memberMatch[1]
      .split(/(?:Use the Instagram app|You'?re invited|Instagram|\n|\r)/i)
      .pop()
      ?.trim() ?? memberMatch[1];
    const candidate = cleanName(before);
    if (candidate) return candidate;
  }

  const directMeta = [meta(html, "og:title"), meta(html, "twitter:title"), meta(html, "title")]
    .filter((value): value is string => Boolean(value));
  for (const value of directMeta) {
    const name = cleanName(value);
    if (name) return name;
  }

  const headings = [...html.matchAll(/<(?:h1|h2|h3|strong|b)[^>]*>([\s\S]{2,180}?)<\/(?:h1|h2|h3|strong|b)>/gi)]
    .map((match) => cleanName(match[1].replace(/<[^>]*>/g, " ")))
    .filter((value): value is string => Boolean(value));
  const headingName = headings.find((value) => !/members?/i.test(value));
  if (headingName) return headingName;

  const keyPatterns = [
    /(?:thread[_-]?title|thread[_-]?name|group[_-]?name|community[_-]?name)["'\s:=]+["']([^"']{2,120})["']/i,
  ];
  for (const pattern of keyPatterns) {
    const match = decodeHtml(html).match(pattern);
    const name = match?.[1] ? cleanName(match[1]) : null;
    if (name) return name;
  }

  return null;
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function instagramDirectUrl(inviteUrl: string) {
  try {
    const url = new URL(inviteUrl);
    const match = url.pathname.match(/^\/j\/([^/]+)/i);
    return match ? `https://www.instagram.com/j/${match[1]}/` : null;
  } catch {
    return null;
  }
}

function jinaReaderUrl(inviteUrl: string) {
  return `https://r.jina.ai/${inviteUrl}`;
}

async function fetchCandidateUrls(inviteUrl: string) {
  const urls = [inviteUrl, instagramDirectUrl(inviteUrl), jinaReaderUrl(inviteUrl)]
    .filter((value): value is string => Boolean(value));
  const seen = new Set<string>();

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const response = await fetchHtml(url);
      if (!response.ok) continue;
      const html = await response.text();
      const baseUrl = response.url || inviteUrl;
      const preview = {
        name: extractName(html),
        memberCount: extractMembers(html),
        imageUrl: extractImage(html, baseUrl),
        finalUrl: baseUrl,
      };
      // Don't stop on a generic image-only result. Keep trying for a real title/image.
      const usefulName = preview.name && !isLikelyGenericInstagramAsset(preview.name);
      const usefulImage = preview.imageUrl && !isLikelyGenericInstagramAsset(preview.imageUrl);
      if (usefulName || preview.memberCount !== null || usefulImage) return preview;
    } catch {
      // Try the next public candidate URL.
    }
  }

  return EMPTY_PREVIEW;
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  return fetchCandidateUrls(inviteUrl);
}

async function fetchImage(imageUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(imageUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function storeRemoteCommunityImage(imageUrl: string, ownerUserId: string) {
  try {
    const response = await fetchImage(imageUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const extension = contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/avif"
          ? "avif"
          : contentType === "image/jpeg"
            ? "jpg"
            : null;
    if (!extension || !ownerUserId) return null;
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
    const path = `submissions/${ownerUserId}/${crypto.randomUUID()}.${extension}`;
    const admin = createAdminSupabaseClient();
    const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).upload(path, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    return error ? null : path;
  } catch {
    return null;
  }
}
