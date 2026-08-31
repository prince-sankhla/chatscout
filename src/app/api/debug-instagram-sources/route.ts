import { NextResponse } from "next/server";

const TEST_URL = "https://ig.me/j/D1UJETnFFmQOFtWN/";

async function inspect(url: string, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",
        Accept: "application/json,text/markdown,text/plain,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
    });
    const text = await response.text();
    const imageUrls = [...text.matchAll(/https?:\/\/[^\s"'<>\])]+/gi)]
      .map((m) => m[0])
      .filter((v) => /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(v) || /(?:scontent|fbcdn|cdninstagram)/i.test(v))
      .slice(0, 20);
    return {
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      length: text.length,
      title: text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
      first: text.slice(0, 2500),
      imageUrls,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const direct = await inspect(TEST_URL, { Referer: "https://www.instagram.com/" });
  const instagram = await inspect("https://www.instagram.com/j/D1UJETnFFmQOFtWN/", { Referer: "https://www.instagram.com/" });
  const jina = await inspect(`https://r.jina.ai/${TEST_URL}`, {
    Accept: "application/json,text/markdown,text/plain,*/*;q=0.8",
    "X-Engine": "browser",
    "X-Base": "true",
    "X-Respond-With": "reader",
    "X-Retain-Images": "true",
    "X-With-Images-Summary": "true",
    "X-Bypass-Cache": "true",
  });
  const microlink = await inspect(`https://api.microlink.io/?url=${encodeURIComponent(TEST_URL)}&meta=true&screenshot=false&data.html.selector=body&ttl=0`, {
    Referer: "https://microlink.io/",
  });
  return NextResponse.json({ testUrl: TEST_URL, direct, instagram, jina, microlink }, { headers: { "cache-control": "no-store" } });
}
