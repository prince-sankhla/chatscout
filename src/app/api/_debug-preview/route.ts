import { NextResponse } from "next/server";

const URL = "https://ig.me/j/D1UJETnFFmQOFtWN/";

async function get(url: string, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
    });
    const text = await r.text();
    return { status: r.status, ok: r.ok, finalUrl: r.url, contentType: r.headers.get("content-type"), length: text.length, text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(result: Awaited<ReturnType<typeof get>>) {
  if ("error" in result) return result;
  const text = result.text;
  const images = [...text.matchAll(/https?:\/\/[^\s"'<>\])]+/gi)].map((m) => m[0]).filter((u) => /(?:scontent|fbcdn|cdninstagram)|\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(u)).slice(0, 10);
  return {
    status: result.status,
    ok: result.ok,
    finalUrl: result.finalUrl,
    contentType: result.contentType,
    length: result.length,
    titleTag: result.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
    images,
    snippet: text.slice(0, 12000),
  };
}

export async function GET() {
  const direct = await get(URL, { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", Referer: "https://www.instagram.com/" });
  const instagram = await get("https://www.instagram.com/j/D1UJETnFFmQOFtWN/", { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", Referer: "https://www.instagram.com/" });
  const jina = await get(`https://r.jina.ai/${URL}`, { Accept: "application/json,text/markdown,text/plain,*/*;q=0.8", "X-Engine": "browser", "X-Retain-Images": "true", "X-Bypass-Cache": "true", "X-Base": "true" });
  const microlink = await get(`https://api.microlink.io/?url=${encodeURIComponent(URL)}&meta=true&data.html.selector=body&ttl=0`, { Accept: "application/json,*/*;q=0.8", Referer: "https://microlink.io/" });

  let jinaParsed: unknown = null;
  try { if (!("error" in jina)) jinaParsed = JSON.parse(jina.text); } catch { jinaParsed = { parseError: true }; }
  let microlinkParsed: unknown = null;
  try { if (!("error" in microlink)) microlinkParsed = JSON.parse(microlink.text); } catch { microlinkParsed = { parseError: true }; }

  return NextResponse.json({
    testUrl: URL,
    direct: summarize(direct),
    instagram: summarize(instagram),
    jina: { ...summarize(jina), parsed: jinaParsed },
    microlink: { ...summarize(microlink), parsed: microlinkParsed },
  }, { headers: { "cache-control": "no-store" } });
}
