import "server-only";

const FETCH_TIMEOUT_MS = 25_000;

export type MicrolinkCommunityPreview = {
  name: string | null;
  memberCount: number | null;
  imageUrl: string | null;
  finalUrl: string | null;
};

const EMPTY: MicrolinkCommunityPreview = {
  name: null,
  memberCount: null,
  imageUrl: null,
  finalUrl: null,
};

function decode(value: string) {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u0022/g, '"')
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    });
}

function textFromHtml(html: string) {
  return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanName(value: string | null | undefined) {
  const name = textFromHtml(value ?? "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^Image\s*\d+\s*:\s*/i, "")
    .replace(/^\s*[>*`•·|:-]+\s*/, "")
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
  const normalized = decode(text);
  for (const pattern of [
    /\b(\d[\d,\.\s]*)\s+members?\b/i,
    /\bmembers?\s*[:·-]\s*(\d[\d,\.\s]*)\b/i,
    /["'](?:number_of_members_text|member_count|memberCount|participants?)["']\s*[:=]\s*["']?(\d[\d,\.\s]*)/i,
  ]) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const n = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(n)) return n;
  }
  return null;
}

function extractName(html: string, memberCount: number | null, title: string | null, imageAlt: string | null) {
  const lines = textFromHtml(html)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const memberIndex = lines.findIndex((line) => memberCount !== null && new RegExp(`\\b${memberCount}\\s+members?\\b`, "i").test(line));
  if (memberIndex >= 0) {
    for (let offset = 1; offset <= 3; offset += 1) {
      const candidate = cleanName(lines[memberIndex - offset]);
      if (candidate) return candidate;
    }
  }

  const heading = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => cleanName(m[1]))
    .find((value): value is string => Boolean(value));
  if (heading) return heading;

  if (memberCount !== null) {
    const compact = textFromHtml(html).replace(/\s+/g, " ");
    const match = compact.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i);
    const candidate = cleanName(match?.[1]);
    if (candidate) return candidate;
  }

  const alt = cleanName(imageAlt);
  if (alt) return alt;

  const preferred = cleanName(title);
  if (preferred) return preferred;
  return null;
}

function absolute(value: string | null | undefined, baseUrl: string) {
  if (!value) return null;
  try {
    return new URL(decode(value), baseUrl).toString();
  } catch {
    return null;
  }
}

function isUsableImage(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return false;
    if (/(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(url.pathname)) return false;
    return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url) || /(?:scontent|fbcdn|cdninstagram)/i.test(url.hostname + url.pathname);
  } catch {
    return false;
  }
}

async function fetchMicrolink(inviteUrl: string) {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(inviteUrl)}&meta=true&data.html.selector=body`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChatScout/1.0 (+https://chatscout-ten.vercel.app)",
      },
    });
    if (!response.ok) return null;
    return await response.json() as {
      data?: {
        html?: string;
        title?: string;
        url?: string;
        image?: { url?: string | null } | null;
      };
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveCommunityPreviewWithMicrolink(inviteUrl: string): Promise<MicrolinkCommunityPreview> {
  try {
    const payload = await fetchMicrolink(inviteUrl);
    const data = payload?.data;
    if (!data) return EMPTY;

    const html = data.html ?? "";
    const plainText = textFromHtml(html);
    const memberCount = extractMembers(`${html}\n${plainText}`);
    const imageFromMeta = absolute(data.image?.url, data.url ?? inviteUrl);

    const markdownImage = [...html.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi)]
      .map((match) => ({ alt: match[1], url: absolute(match[2], data.url ?? inviteUrl) }))
      .find((candidate) => isUsableImage(candidate.url));

    const name = extractName(html, memberCount, data.title ?? null, markdownImage?.alt ?? null);
    const imageUrl = isUsableImage(imageFromMeta) ? imageFromMeta : markdownImage?.url ?? null;

    return {
      name,
      memberCount,
      imageUrl,
      finalUrl: data.url ?? inviteUrl,
    };
  } catch {
    return EMPTY;
  }
}
