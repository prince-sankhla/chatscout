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

function normalizeText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\t\f\r]+/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n +/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return decodeHtml(a.exec(html)?.[1] ?? b.exec(html)?.[1] ?? "") || null;
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
    return /(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(file);
  } catch {
    return /(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(url);
  }
}

function isGenericAlt(value: string) {
  return /(?:instagram\s+(?:logo|icon)|app\s+icon|favicon|meta\s+logo|threads\s+logo)/i.test(value);
}

function isImageUrl(url: string) {
  return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url)
    || /(?:scontent|fbcdn|cdninstagram)/i.test(url);
}

function cleanName(value: string) {
  const name = normalizeText(value)
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[>*`\-•·|:\s]+/, "")
    .replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i, "")
    .trim();

  if (!name || name.length > 120) return null;
  if (/^(?:you(?:'|&apos;)?re|you are) invited to join a group chat on instagram$/i.test(name)) return null;
  if (/^(?:instagram|group chat|use the instagram app|join instagram|community name)$/i.test(name)) return null;
  if (/^(?:directgroup|directgrouplink|direct group link)$/i.test(name.replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase())) return null;
  if (/^\d[\d,\.\s]*\s+members?$/i.test(name)) return null;
  return name;
}

function extractMembers(text: string) {
  const patterns = [
    /\b(\d[\d,\.\s]*)\s+members?\b/i,
    /\bmembers?\s*[:·\-]?\s*(\d[\d,\.\s]*)\b/i,
    /["'](?:member[_-]?count|participants?)["']\s*[:=]\s*["']?(\d[\d,\.\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(value) && value >= 0) return value;
  }
  return null;
}

function extractJsonNames(text: string) {
  const values: string[] = [];
  const patterns = [
    /["'](?:group[_-]?name|community[_-]?name|thread[_-]?name)["']\s*[:=]\s*["']([^"']{2,120})["']/gi,
    /["']name["']\s*[:=]\s*["']([^"']{2,120})["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) values.push(match[1]);
  }
  return values.map(cleanName).find((value): value is string => Boolean(value)) ?? null;
}

function extractName(raw: string, preferredTitle?: string | null) {
  const decoded = decodeHtml(raw);
  const text = normalizeText(decoded);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  // Instagram invite pages conventionally present the group name immediately
  // before the member count. Prefer that exact relationship over generic titles.
  for (let i = 0; i < lines.length; i += 1) {
    if (!/\d[\d,\.\s]*\s+members?/i.test(lines[i])) continue;
    for (let back = 1; back <= 4; back += 1) {
      const candidate = cleanName(lines[i - back] ?? "");
      if (candidate) return candidate;
    }
  }

  const compact = text.replace(/\s+/g, " ");
  const memberMatch = compact.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i);
  if (memberMatch) {
    const candidate = cleanName(memberMatch[1]);
    if (candidate) return candidate;
  }

  const jsonName = extractJsonNames(decoded);
  if (jsonName) return jsonName;

  const preferred = cleanName(preferredTitle ?? "");
  if (preferred) return preferred;

  for (const value of [meta(decoded, "og:title"), meta(decoded, "twitter:title"), meta(decoded, "title")]) {
    const candidate = cleanName(value ?? "");
    if (candidate) return candidate;
  }

  return null;
}

function extractImage(raw: string, baseUrl: string, communityName: string | null, memberCount: number | null) {
  const candidates: Array<{ raw: string; alt: string; index: number }> = [];

  for (const match of raw.matchAll(/<(?:img|source)\b([^>]+)>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/(?:src|data-src|data-original|data-lazy-src|poster)=["']([^"']+)["']/i)?.[1];
    const alt = attrs.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    if (src && !isGenericAlt(alt)) candidates.push({ raw: src, alt, index: match.index ?? 0 });
  }

  for (const match of raw.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    for (const part of match[1].split(",")) {
      const src = part.trim().split(/\s+/)[0];
      if (src) candidates.push({ raw: src, alt: "", index: match.index ?? 0 });
    }
  }

  for (const match of raw.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi)) {
    if (!isGenericAlt(match[1])) candidates.push({ raw: match[2], alt: match[1], index: match.index ?? 0 });
  }

  const decoded = decodeHtml(raw);
  for (const match of decoded.matchAll(/https?:\/\/[^"'\s<>\])]+/gi)) {
    candidates.push({ raw: match[0], alt: "", index: match.index ?? 0 });
  }

  for (const property of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    const value = meta(decoded, property);
    if (value) candidates.push({ raw: value, alt: "", index: Math.max(0, decoded.indexOf(value)) });
  }

  const nameNeedle = communityName?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  const memberNeedle = memberCount === null ? -1 : decoded.search(new RegExp(`${String(memberCount).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+members?`, "i"));

  const ranked = candidates
    .map(({ raw, alt, index }) => {
      const url = absoluteUrl(raw, baseUrl);
      if (!url || !isImageUrl(url) || isGenericAsset(url) || isGenericAlt(alt)) return null;
      const surrounding = decoded.slice(Math.max(0, index - 1200), Math.min(decoded.length, index + 2200)).toLowerCase();
      const context = `${alt.toLowerCase()} ${surrounding}`;
      let score = 0;
      if (/(?:scontent|fbcdn|cdninstagram)/i.test(url)) score += 45;
      if (nameNeedle && context.includes(nameNeedle)) score += 60;
      if (nameNeedle && alt.toLowerCase().includes(nameNeedle)) score += 30;
      if (memberNeedle >= 0 && Math.abs(index - memberNeedle) < 7000) score += Math.max(0, 40 - Math.abs(index - memberNeedle) / 250);
      if (/(?:profile|group|thread|avatar|image|photo|picture|media)/i.test(context)) score += 5;
      if (/(?:logo|icon|favicon|sprite|placeholder|app-icon)/i.test(`${url} ${alt}`)) score -= 120;
      return { url, score };
    })
    .filter((value): value is { url: string; score: number } => Boolean(value))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.url ?? null;
}

async function fetchText(url: string, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function instagramDirectUrl(inviteUrl: string) {
  try {
    const url = new URL(inviteUrl);
    const match = url.pathname.match(/^\/j\/([^/]+)\/?$/i);
    return match ? `https://www.instagram.com/j/${match[1]}/` : null;
  } catch {
    return null;
  }
}

function jinaReaderUrl(url: string) {
  return `https://r.jina.ai/${url}`;
}

async function fetchJina(url: string): Promise<CommunityPreview> {
  const response = await fetchText(jinaReaderUrl(url), {
    Accept: "application/json",
    "X-Retain-Images": "true",
    "X-No-Cache": "true",
    "X-Base": "true",
    "X-With-Generated-Alt": "true",
    "X-Target-Selector": "body",
  });
  if (!response.ok) return EMPTY_PREVIEW;

  const raw = await response.text();
  try {
    const payload = JSON.parse(raw) as { url?: string; title?: string; content?: string };
    const content = payload.content ?? "";
    const memberCount = extractMembers(content);
    const name = extractName(content, payload.title ?? null);
    return {
      name,
      memberCount,
      imageUrl: extractImage(content, payload.url ?? url, name, memberCount),
      finalUrl: payload.url ?? url,
    };
  } catch {
    const memberCount = extractMembers(raw);
    const name = extractName(raw);
    return {
      name,
      memberCount,
      imageUrl: extractImage(raw, response.url || url, name, memberCount),
      finalUrl: response.url || url,
    };
  }
}

async function fetchDirect(url: string): Promise<CommunityPreview> {
  const response = await fetchText(url, {
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    Referer: "https://www.instagram.com/",
  });
  if (!response.ok) return EMPTY_PREVIEW;
  const html = await response.text();
  const text = normalizeText(html);
  const memberCount = extractMembers(`${html}\n${text}`);
  const name = extractName(html, null);
  return {
    name,
    memberCount,
    imageUrl: extractImage(html, response.url || url, name, memberCount),
    finalUrl: response.url || url,
  };
}

export async function resolveCommunityPreview(inviteUrl: string): Promise<CommunityPreview> {
  const direct = instagramDirectUrl(inviteUrl);
  const candidates = [
    () => fetchJina(direct ?? inviteUrl),
    direct ? () => fetchJina(direct) : null,
    direct ? () => fetchDirect(direct) : null,
    () => fetchDirect(inviteUrl),
  ].filter((value): value is () => Promise<CommunityPreview> => Boolean(value));

  let merged = EMPTY_PREVIEW;
  for (const loader of candidates) {
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
      // Best-effort resolver: try the next public source.
    }
  }
  return merged;
}

async function fetchImage(imageUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(imageUrl, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });
  } finally {
    clearTimeout(timer);
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
