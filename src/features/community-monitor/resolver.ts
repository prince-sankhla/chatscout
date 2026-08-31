import "server-only";

import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET } from "@/lib/supabase/community-images";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

export type CommunityPreview = {
  name: string | null;
  memberCount: number | null;
  imageUrl: string | null;
  finalUrl: string | null;
};

const EMPTY_PREVIEW: CommunityPreview = { name: null, memberCount: null, imageUrl: null, finalUrl: null };

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
  const first = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const second = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return decodeHtml(first.exec(html)?.[1] ?? second.exec(html)?.[1] ?? "") || null;
}

function absoluteUrl(value: string, baseUrl: string) {
  try { return new URL(decodeHtml(value), baseUrl).toString(); } catch { return null; }
}

function isGenericAsset(url: string) {
  try {
    const parsed = new URL(url);
    const haystack = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    return /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo|sprite)/i.test(haystack);
  } catch {
    return /(?:instagram(?:-logo|-icon)?|meta-logo|app-icon|favicon|glyph|threads-logo|sprite)/i.test(url);
  }
}

function isGenericAlt(value: string) {
  return /(?:instagram(?:\s+logo|\s+icon)?|app\s+icon|favicon|meta\s+logo|threads\s+logo)/i.test(value);
}

function isImageUrl(url: string) {
  return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url)
    || /(?:scontent|fbcdn|cdninstagram)/i.test(url);
}

function cleanName(value: string) {
  const name = decodeHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[>*`-]+\s*/, "")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length > 120) return null;
  if (/^(?:you(?:'|&apos;)?re|you are) invited to join a group chat on instagram$/i.test(name)) return null;
  if (/^(?:instagram|group chat|use the instagram app|join instagram|community name|directgrouplink|direct group link|directgroup)$/i.test(name)) return null;
  if (/^\d[\d,\.\s]*\s+members?$/i.test(name)) return null;
  return name.replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i, "").trim() || null;
}

function extractMembers(text: string) {
  for (const pattern of [
    /(\d[\d,\.\s]*)\s+members?/i,
    /members?\s*[:·-]?\s*(\d[\d,\.\s]*)/i,
    /(?:member[_-]?count|participants?)["'\s:=]+(\d[\d,\.\s]*)/i,
  ]) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(value)) return value;
  }
  return null;
}

function extractName(html: string, text: string, preferredTitle?: string | null) {
  const normalized = decodeHtml(text).replace(/\r/g, "");
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    if (!/\d[\d,\.\s]*\s+members?/i.test(lines[i])) continue;
    for (let back = 1; back <= 4; back += 1) {
      const candidate = cleanName(lines[i - back] ?? "");
      if (candidate) return candidate;
    }
  }

  const compact = normalized.replace(/\s+/g, " ");
  const memberMatch = compact.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i);
  if (memberMatch) {
    const candidate = cleanName(memberMatch[1]);
    if (candidate) return candidate;
  }

  const preferred = cleanName(preferredTitle ?? "");
  if (preferred) return preferred;

  for (const value of [meta(html, "og:title"), meta(html, "twitter:title"), meta(html, "title")]) {
    const candidate = cleanName(value ?? "");
    if (candidate) return candidate;
  }

  const heading = [...html.matchAll(/<(?:h1|h2|h3|strong|b)[^>]*>([\s\S]{2,180}?)<\/(?:h1|h2|h3|strong|b)>/gi)]
    .map((match) => cleanName(match[1]))
    .find((value): value is string => Boolean(value));
  return heading ?? null;
}

function extractImage(html: string, baseUrl: string, communityName: string | null, memberCount: number | null) {
  const candidates: Array<{ raw: string; alt: string; index: number }> = [];
  for (const match of html.matchAll(/<(?:img|source)\b([^>]+)>/gi)) {
    const attrs = match[1];
    const raw = attrs.match(/(?:src|data-src|data-original|data-lazy-src|poster)=["']([^"']+)["']/i)?.[1];
    const alt = attrs.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    if (raw && !isGenericAlt(alt)) candidates.push({ raw, alt, index: match.index ?? 0 });
  }
  for (const match of html.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    for (const part of match[1].split(",")) {
      const raw = part.trim().split(/\s+/)[0];
      if (raw) candidates.push({ raw, alt: "", index: match.index ?? 0 });
    }
  }
  for (const match of html.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi)) {
    if (!isGenericAlt(match[1])) candidates.push({ raw: match[2], alt: match[1], index: match.index ?? 0 });
  }
  const decoded = decodeHtml(html);
  for (const match of decoded.matchAll(/https?:\/\/[^"'\s<>\])]+/gi)) candidates.push({ raw: match[0], alt: "", index: match.index ?? 0 });
  for (const property of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    const raw = meta(html, property);
    if (raw) candidates.push({ raw, alt: "", index: Math.max(0, html.indexOf(raw)) });
  }

  const memberMarker = memberCount === null ? -1 : html.search(new RegExp(`${String(memberCount).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+members?`, "i"));
  const normalizedName = communityName?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  const ranked = candidates.map(({ raw, alt, index }) => {
    const url = absoluteUrl(raw, baseUrl);
    if (!url || !isImageUrl(url) || isGenericAsset(url) || isGenericAlt(alt)) return null;
    const surrounding = html.slice(Math.max(0, index - 700), Math.min(html.length, index + 1700)).toLowerCase();
    const context = `${alt.toLowerCase()} ${surrounding}`;
    let score = 0;
    if (/(?:scontent|fbcdn|cdninstagram)/i.test(url)) score += 40;
    if (normalizedName && context.includes(normalizedName)) score += 50;
    if (memberMarker >= 0 && Math.abs(index - memberMarker) < 5000) score += Math.max(0, 30 - Math.abs(index - memberMarker) / 200);
    if (alt && normalizedName && alt.toLowerCase().includes(normalizedName)) score += 25;
    if (/(?:logo|icon|favicon|sprite|placeholder|app-icon)/i.test(`${url} ${alt}`)) score -= 100;
    return { url, score };
  }).filter((value): value is { url: string; score: number } => Boolean(value)).sort((a, b) => b.score - a.score);
  return ranked[0]?.url ?? null;
}

async function fetchHtml(url: string, extraHeaders: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.instagram.com/",
        ...extraHeaders,
      },
    });
  } finally { clearTimeout(timeout); }
}

function instagramDirectUrl(inviteUrl: string) {
  try {
    const url = new URL(inviteUrl);
    const match = url.pathname.match(/^\/j\/([^/]+)/i);
    return match ? `https://www.instagram.com/j/${match[1]}/` : null;
  } catch { return null; }
}

function jinaReaderUrl(url: string) { return `https://r.jina.ai/${url}`; }

async function fetchMicrolink(url: string): Promise<CommunityPreview> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&data.html.attr=html&meta=true&ttl=1h`;
  const response = await fetchHtml(endpoint, { Referer: "https://microlink.io/" });
  if (!response.ok) return EMPTY_PREVIEW;
  const payload = await response.json() as { url?: string; data?: { html?: string; title?: string; image?: string; url?: string } };
  const data = payload.data ?? {};
  const html = data.html ?? "";
  const text = visibleText(html);
  const name = extractName(html, text, data.title ?? null);
  const memberCount = extractMembers(text);
  const imageUrl = extractImage(html, data.url ?? payload.url ?? url, name, memberCount) ?? (data.image && isImageUrl(data.image) && !isGenericAsset(data.image) ? data.image : null);
  return { name, memberCount, imageUrl, finalUrl: data.url ?? payload.url ?? url };
}

async function fetchDirect(url: string): Promise<CommunityPreview> {
  const response = await fetchHtml(url);
  if (!response.ok) return EMPTY_PREVIEW;
  const html = await response.text();
  const text = visibleText(html);
  const memberCount = extractMembers(text);
  const name = extractName(html, text);
  return { name, memberCount, imageUrl: extractImage(html, response.url || url, name, memberCount), finalUrl: response.url || url };
}

async function fetchJina(url: string): Promise<CommunityPreview> {
  const response = await fetchHtml(jinaReaderUrl(url), {
    "X-Engine": "browser",
    "X-Retain-Images": "true",
    "X-Bypass-Cache": "true",
    "X-With-Generated-Alt": "true",
  });
  if (!response.ok) return EMPTY_PREVIEW;
  const raw = await response.text();
  try {
    const payload = JSON.parse(raw) as { title?: string; content?: string; url?: string };
    const content = payload.content ?? "";
    const name = extractName(content, content, payload.title ?? null);
    const memberCount = extractMembers(content);
    return { name, memberCount, imageUrl: extractImage(content, payload.url ?? url, name, memberCount), finalUrl: payload.url ?? url };
  } catch {
    const memberCount = extractMembers(raw);
    const name = extractName(raw, raw);
    return { name, memberCount, imageUrl: extractImage(raw, response.url || url, name, memberCount), finalUrl: response.url || url };
  }
}

function visibleText(html: string) {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  const direct = instagramDirectUrl(inviteUrl);
  const loaders = [
    () => fetchMicrolink(direct ?? inviteUrl),
    () => fetchMicrolink(inviteUrl),
    direct ? () => fetchDirect(direct) : null,
    () => fetchDirect(inviteUrl),
    () => fetchJina(direct ?? inviteUrl),
  ].filter((value): value is () => Promise<CommunityPreview> => Boolean(value));

  let merged = EMPTY_PREVIEW;
  for (const loader of loaders) {
    try {
      const preview = await loader();
      merged = {
        name: merged.name ?? preview.name,
        memberCount: merged.memberCount ?? preview.memberCount,
        imageUrl: merged.imageUrl ?? preview.imageUrl,
        finalUrl: merged.finalUrl ?? preview.finalUrl,
      };
      if (merged.name && merged.memberCount !== null && merged.imageUrl) break;
    } catch {
      // Best-effort resolver: continue with the next public rendering path.
    }
  }
  return merged;
}

async function fetchImage(imageUrl: string) {
  return fetchHtml(imageUrl, {
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    Referer: "https://www.instagram.com/",
  });
}

export async function storeRemoteCommunityImage(imageUrl: string, ownerUserId: string) {
  try {
    if (!imageUrl || !ownerUserId || isGenericAsset(imageUrl)) return null;
    const response = await fetchImage(imageUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/avif" ? "avif" : contentType === "image/jpeg" ? "jpg" : null;
    if (!extension) return null;
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
