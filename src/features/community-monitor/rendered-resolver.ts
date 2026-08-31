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
    .replace(/\\n/g, "\n")
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
  const normalized = name.replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase();
  if (/^(?:directgroup|directgrouplink|direct group link)$/.test(normalized)) return null;
  if (/^\d[\d,\.\s]*\s+members?$/i.test(name)) return null;
  return name;
}

function extractMembers(value: string) {
  const text = decode(value);
  const patterns = [
    /["']number_of_members_text["']\s*[:=]\s*["'](\d[\d,\.\s]*)\s+members?["']/i,
    /\b(\d[\d,\.\s]*)\s+members?\b/i,
    /\bmembers?\s*[:·-]\s*(\d[\d,\.\s]*)\b/i,
    /["'](?:member[_-]?count|memberCount|participants?)["']\s*[:=]\s*["']?(\d[\d,\.\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const n = Number(match[1].replace(/[^0-9]/g, ""));
    if (Number.isSafeInteger(n)) return n;
  }
  return null;
}

function extractQuotedField(text: string, field: string) {
  const pattern = new RegExp(`(?:["']|\\\\\\\"){field}(?:["']|\\\\\\\")\\s*[:=]\\s*(?:["']|\\\\\\\")((?:\\\\\\\\.|[^"'\\\\])*)(?:["']|\\\\\\\")`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1].replace(/"/g, '\\\\"')}"`);
  } catch {
    return decode(match[1]);
  }
}

function extractStructuredProps(raw: string) {
  const title = extractQuotedField(raw, "title");
  const membersText = extractQuotedField(raw, "number_of_members_text");
  const image = extractQuotedField(raw, "group_image_uri");
  return {
    title: cleanName(title),
    memberCount: extractMembers(membersText ?? "") ?? extractMembers(raw),
    imageUrl: image ? decode(image) : null,
  };
}

function extractName(html: string, memberCount: number | null, title: string | null, imageAlt: string | null) {
  const structured = extractStructuredProps(html);
  if (structured.title) return structured.title;

  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => cleanName(match[1]))
    .find((value): value is string => Boolean(value));
  if (headings) return headings;

  const text = plainText(html);
  if (memberCount !== null) {
    const compact = text.replace(/\s+/g, " ");
    const nearby = compact.match(/(.{2,120}?)\s+\d[\d,\.\s]*\s+members?/i)?.[1];
    const candidate = cleanName(nearby);
    if (candidate) return candidate;
  }

  const alt = cleanName(imageAlt);
  if (alt) return alt;
  return cleanName(title);
}

function isUsableImage(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return false;
    if (/(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(url.pathname)) return false;
    return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(value)
      || /(?:scontent|fbcdn|cdninstagram)/i.test(`${url.hostname}${url.pathname}`);
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

function firstUsableImageFromHtml(html: string, baseUrl: string) {
  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/i)?.[1] ?? null;
    const alt = attrs.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    const url = absolute(src, baseUrl);
    if (url && isUsableImage(url) && !/instagram\s+(?:logo|icon)|favicon|app\s+icon/i.test(alt)) return url;
  }
  for (const match of html.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi)) {
    const url = absolute(match[1], baseUrl);
    if (url && isUsableImage(url)) return url;
  }
  return null;
}

async function request(url: string, headers: HeadersInit = {}) {
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
        ...headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMicrolink(inviteUrl: string): Promise<Preview> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(inviteUrl)}&meta=true&data.html.selector=body`;
  const response = await request(endpoint, { Accept: "application/json" });
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
  const structured = extractStructuredProps(html);
  const memberCount = structured.memberCount ?? extractMembers(html);
  const name = structured.title ?? extractName(html, memberCount, data.title ?? null, null);

  const providerImage = absolute(data.image?.url, data.url ?? inviteUrl);
  const structuredImage = absolute(structured.imageUrl, data.url ?? inviteUrl);
  const htmlImage = firstUsableImageFromHtml(html, data.url ?? inviteUrl);
  const imageUrl = [providerImage, structuredImage, htmlImage].find((value): value is string => isUsableImage(value)) ?? null;

  return { name, memberCount, imageUrl, finalUrl: data.url ?? inviteUrl };
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

async function fetchInstagram(url: string): Promise<Preview> {
  const response = await request(url, {
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    Referer: "https://www.instagram.com/",
  });
  if (!response.ok) return EMPTY;
  const html = await response.text();
  const structured = extractStructuredProps(html);
  const memberCount = structured.memberCount ?? extractMembers(html);
  const name = structured.title ?? extractName(html, memberCount, null, null);
  const image = structured.imageUrl && isUsableImage(structured.imageUrl)
    ? structured.imageUrl
    : firstUsableImageFromHtml(html, response.url || url);
  return { name, memberCount, imageUrl: image, finalUrl: response.url || url };
}

export async function resolveRenderedCommunityPreview(inviteUrl: string): Promise<Preview> {
  try {
    const rendered = await fetchMicrolink(inviteUrl);
    if (rendered.name && rendered.memberCount !== null && rendered.imageUrl) return rendered;
  } catch {
    // Continue to the direct Instagram fallback.
  }

  const direct = instagramDirectUrl(inviteUrl);
  if (direct) {
    try {
      const renderedDirect = await fetchMicrolink(direct);
      if (renderedDirect.name || renderedDirect.memberCount !== null || renderedDirect.imageUrl) return renderedDirect;
    } catch {
      // Continue to direct HTML.
    }

    try {
      const directPreview = await fetchInstagram(direct);
      if (directPreview.name || directPreview.memberCount !== null || directPreview.imageUrl) return directPreview;
    } catch {
      // Return an empty preview only when all public sources fail.
    }
  }

  try {
    return await fetchInstagram(inviteUrl);
  } catch {
    return EMPTY;
  }
}
