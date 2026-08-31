import "server-only";

import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

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
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return decodeHtml(pattern.exec(html)?.[1] ?? reverse.exec(html)?.[1] ?? "") || null;
}

function absoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return null;
  }
}

function isGenericAsset(url: string) {
  try {
    const parsed = new URL(url);
    const file = (parsed.pathname.split("/").pop() ?? "").toLowerCase();
    const haystack = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    return /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo)/i.test(file)
      || /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo)/i.test(haystack);
  } catch {
    return /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo)/i.test(url);
  }
}

function isGenericAlt(value: string) {
  return /(?:instagram(?:\s+logo|\s+icon)?|app\s+icon|favicon|meta\s+logo|threads\s+logo)/i.test(value);
}

function isImageUrl(url: string) {
  return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url)
    || /(?:scontent|fbcdn|cdninstagram)/i.test(url);
}

function extractImage(html: string, baseUrl: string) {
  const candidates: Array<{ url: string; alt: string }> = [];

  for (const match of html.matchAll(/<(?:img|source)\b([^>]+)>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/(?:src|data-src|data-original|poster)=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const alt = attrs.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    if (!isGenericAlt(alt)) candidates.push({ url: src, alt });
  }

  for (const match of html.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    for (const part of match[1].split(",")) {
      const src = part.trim().split(/\s+/)[0];
      if (src) candidates.push({ url: src, alt: "" });
    }
  }

  for (const match of html.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi)) {
    if (!isGenericAlt(match[1])) candidates.push({ url: match[2], alt: match[1] });
  }

  const decoded = decodeHtml(html);
  for (const match of decoded.matchAll(/https?:\/\/[^"'\s<>\])]+/gi)) {
    candidates.push({ url: match[0], alt: "" });
  }

  candidates.push(
    ...[meta(html, "og:image"), meta(html, "og:image:url"), meta(html, "twitter:image"), meta(html, "twitter:image:src")]
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ url, alt: "" })),
  );

  const absolute = candidates
    .map(({ url, alt }) => ({ url: absoluteUrl(url, baseUrl), alt }))
    .filter((candidate): candidate is { url: string; alt: string } => Boolean(candidate.url));

  return absolute.find(({ url, alt }) => isImageUrl(url) && !isGenericAsset(url) && !isGenericAlt(alt))?.url ?? null;
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

function extractMembers(text: string) {
  const patterns = [
    /(\d[\d,\.\s]*)\s+members?/i,
    /members?\s*[:·-]?\s*(\d[\d,\.\s]*)/i,
    /(?:member[_-]?count|participants?)["'\s:=]+(\d[\d,\.\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(value)) return value;
  }
  return null;
}

function cleanName(value: string) {
  const name = decodeHtml(value)
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length > 120) return null;
  if (/^(?:you(?:'|&apos;)?re|you are) invited to join a group chat on instagram$/i.test(name)) return null;
  if (/^(?:instagram|group chat|use the instagram app)$/i.test(name)) return null;
  if (/^\d[\d,\.\s]*\s+members?$/i.test(name)) return null;
  const normalized = name.replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase();
  if (/^(?:directgroup|directgrouplink|direct group link|community name)$/.test(normalized)) return null;
  return name
    .replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i, "")
    .replace(/^\s*[•·|:-]\s*/, "")
    .trim() || null;
}

function extractName(html: string, text: string) {
  const memberMatch = text.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i);
  if (memberMatch) {
    const candidate = cleanName(memberMatch[1]);
    if (candidate && candidate.length <= 120) return candidate;
  }

  const titleCandidates = [meta(html, "og:title"), meta(html, "twitter:title"), meta(html, "title")]
    .filter((value): value is string => Boolean(value));
  for (const value of titleCandidates) {
    const candidate = cleanName(value);
    if (candidate) return candidate;
  }

  const markdown = html.match(/^#{1,6}\s+([^\n]{2,120})$/m)?.[1];
  if (markdown) {
    const candidate = cleanName(markdown);
    if (candidate) return candidate;
  }

  const heading = [...html.matchAll(/<(?:h1|h2|h3|strong|b)[^>]*>([\s\S]{2,160}?)<\/(?:h1|h2|h3|strong|b)>/gi)]
    .map((match) => cleanName(match[1].replace(/<[^>]*>/g, " ")))
    .find((value): value is string => Boolean(value));
  return heading ?? null;
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const isJina = url.startsWith("https://r.jina.ai/");
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: isJina ? "text/markdown,text/plain,text/html;q=0.9,*/*;q=0.8" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
        ...(isJina
          ? {
              "x-engine": "browser",
              "x-no-cache": "true",
              "x-retain-images": "true",
              "x-with-generated-alt": "true",
            }
          : {}),
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

async function fetchCandidate(url: string): Promise<CommunityPreview> {
  const response = await fetchHtml(url);
  if (!response.ok) return EMPTY_PREVIEW;
  const html = await response.text();
  const text = visibleText(html);
  return {
    name: extractName(html, text),
    memberCount: extractMembers(text),
    imageUrl: extractImage(html, response.url || url),
    finalUrl: response.url || url,
  };
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  const candidates = [
    jinaReaderUrl(inviteUrl),
    instagramDirectUrl(inviteUrl),
    inviteUrl,
  ].filter((value): value is string => Boolean(value));

  let merged = EMPTY_PREVIEW;
  for (const url of candidates) {
    try {
      const preview = await fetchCandidate(url);
      merged = {
        name: merged.name ?? preview.name,
        memberCount: merged.memberCount ?? preview.memberCount,
        imageUrl: merged.imageUrl ?? preview.imageUrl,
        finalUrl: merged.finalUrl ?? preview.finalUrl,
      };
      if (merged.name && merged.memberCount !== null && merged.imageUrl) break;
    } catch {
      // Try the next public source.
    }
  }

  return merged;
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
    if (!imageUrl || isGenericAsset(imageUrl)) return null;
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
