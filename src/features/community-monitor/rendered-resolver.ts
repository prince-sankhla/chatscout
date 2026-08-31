import "server-only";

const TIMEOUT_MS = 25_000;

type Preview = {
  name: string | null;
  memberCount: number | null;
  imageUrl: string | null;
  finalUrl: string | null;
};

const EMPTY: Preview = { name: null, memberCount: null, imageUrl: null, finalUrl: null };

function decode(value: string) {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u0022/g, '"')
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function plainText(html: string) {
  return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanName(value: string | null | undefined) {
  const name = plainText(value ?? "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^Image\s*\d+\s*:\s*/i, "")
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

function extractMembers(value: string) {
  const text = decode(value);
  for (const pattern of [
    /\b(\d[\d,\.\s]*)\s+members?\b/i,
    /["']number_of_members_text["']\s*[:=]\s*["'](\d[\d,\.\s]*)\s+members?["']/i,
    /["']member[_-]?count["']\s*[:=]\s*["']?(\d[\d,\.\s]*)/i,
    /["']participants?["']\s*[:=]\s*["']?(\d[\d,\.\s]*)/i,
  ]) {
    const match = text.match(pattern);
    if (!match) continue;
    const n = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(n)) return n;
  }
  return null;
}

function extractName(html: string, memberCount: number | null, title: string | null, imageAlt: string | null) {
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => cleanName(match[1]))
    .find((value): value is string => Boolean(value));
  if (headings) return headings;

  const text = plainText(html);
  if (memberCount !== null) {
    const nearby = text.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i)?.[1];
    const candidate = cleanName(nearby);
    if (candidate) return candidate;
  }

  const alt = cleanName(imageAlt);
  if (alt) return alt;

  const preferred = cleanName(title);
  return preferred;
}

function isUsableImage(url: string | null) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    if (/(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(parsed.pathname)) return false;
    return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url)
      || /(?:scontent|fbcdn|cdninstagram)/i.test(`${parsed.hostname}${parsed.pathname}`);
  } catch {
    return false;
  }
}

function absolute(value: string | null | undefined, baseUrl: string) {
  if (!value) return null;
  try {
    return new URL(decode(value), baseUrl).toString();
  } catch {
    return null;
  }
}

async function request(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMicrolink(inviteUrl: string): Promise<Preview> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(inviteUrl)}&meta=true&data.html.selector=body`;
  const response = await request(endpoint);
  if (!response.ok) return EMPTY;

  const payload = await response.json() as {
    data?: {
      html?: string;
      title?: string;
      url?: string;
      image?: { url?: string | null } | null;
    };
  };

  const data = payload.data;
  if (!data) return EMPTY;

  const html = data.html ?? "";
  const text = plainText(html);
  const memberCount = extractMembers(`${html}\n${text}`);
  const markdown = [...html.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi)]
    .map((match) => ({ alt: decode(match[1]), url: absolute(match[2], data.url ?? inviteUrl) }))
    .find((candidate) => isUsableImage(candidate.url));

  const imageFromProvider = absolute(data.image?.url, data.url ?? inviteUrl);
  const imageUrl = isUsableImage(imageFromProvider) ? imageFromProvider : markdown?.url ?? null;
  const name = extractName(html, memberCount, data.title ?? null, markdown?.alt ?? null);

  return {
    name,
    memberCount,
    imageUrl,
    finalUrl: data.url ?? inviteUrl,
  };
}

async function fetchInstagram(inviteUrl: string): Promise<Preview> {
  const response = await request(inviteUrl);
  if (!response.ok) return EMPTY;
  const html = await response.text();
  const memberCount = extractMembers(html);
  const name = extractName(html, memberCount, null, null);
  const image = [...html.matchAll(/<img\b([^>]+)>/gi)]
    .map((match) => match[1].match(/(?:src|data-src)=["']([^"']+)["']/i)?.[1] ?? null)
    .map((value) => absolute(value, response.url || inviteUrl))
    .find((value) => isUsableImage(value)) ?? null;

  return { name, memberCount, imageUrl: image, finalUrl: response.url || inviteUrl };
}

export async function resolveRenderedCommunityPreview(inviteUrl: string): Promise<Preview> {
  try {
    const rendered = await fetchMicrolink(inviteUrl);
    if (rendered.name || rendered.memberCount !== null || rendered.imageUrl) return rendered;
  } catch {
    // Fall back to direct Instagram HTML when the rendering provider is unavailable.
  }

  try {
    return await fetchInstagram(inviteUrl);
  } catch {
    return EMPTY;
  }
}
