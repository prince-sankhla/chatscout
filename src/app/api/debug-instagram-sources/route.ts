import { NextResponse } from "next/server";

const TEST_URL = "https://ig.me/j/D1UJETnFFmQOFtWN/";

async function inspect(url: string, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
    });
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      length: text.length,
      text,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function snippets(text: string, term: string, count = 6) {
  const out: string[] = [];
  let from = 0;
  while (out.length < count) {
    const index = text.toLowerCase().indexOf(term.toLowerCase(), from);
    if (index < 0) break;
    out.push(text.slice(Math.max(0, index - 1000), Math.min(text.length, index + term.length + 1800)));
    from = index + term.length;
  }
  return out;
}

function summarize(result: Awaited<ReturnType<typeof inspect>>) {
  if ("error" in result) return result;
  return {
    status: result.status,
    ok: result.ok,
    finalUrl: result.finalUrl,
    contentType: result.contentType,
    length: result.length,
    title: result.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
    imageUrls: [...result.text.matchAll(/https?:\/\/[^\s"'<>\])]+/gi)]
      .map((m) => m[0])
      .filter((v) => /(?:scontent|fbcdn|cdninstagram)|\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(v))
      .slice(0, 25),
    brainCells: snippets(result.text, "Brain Cells"),
    members: snippets(result.text, "members"),
    groupNameKeys: snippets(result.text, "group_name").concat(snippets(result.text, "thread_name"), snippets(result.text, "member_count")),
  };
}

export async function GET() {
  const direct = await inspect(TEST_URL, {
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    Referer: "https://www.instagram.com/",
  });
  const instagram = await inspect("https://www.instagram.com/j/D1UJETnFFmQOFtWN/", {
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    Referer: "https://www.instagram.com/",
  });
  const jina = await inspect(`https://r.jina.ai/${TEST_URL}`, {
    Accept: "application/json",
    "X-Retain-Images": "true",
    "X-No-Cache": "true",
    "X-With-Generated-Alt": "true",
  });
  return NextResponse.json({ testUrl: TEST_URL, direct: summarize(direct), instagram: summarize(instagram), jina: summarize(jina) }, { headers: { "cache-control": "no-store" } });
}
