const SITEMAP_TIMEOUT_MS = 8000;
const USER_AGENT = "GEO-Optimizer/1.0";

export class SitemapError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function fetchSitemapUrls(
  rawUrl: string,
  max: number,
  depth = 0,
): Promise<string[]> {
  if (depth > 2) throw new SitemapError("DEPTH", "sitemap index 중첩이 너무 깊습니다");

  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    throw new SitemapError("BAD_URL", "유효한 URL이 아닙니다");
  }

  const candidates =
    depth === 0
      ? [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`]
      : [rawUrl];

  let xml: string | null = null;
  let lastStatus = 0;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
        redirect: "follow",
      });
      lastStatus = res.status;
      if (res.ok) {
        xml = await res.text();
        break;
      }
    } catch {
      // try next
    }
  }
  if (!xml) {
    throw new SitemapError("NOT_FOUND", `sitemap을 찾을 수 없음 (HTTP ${lastStatus || "?"})`);
  }

  const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi))
    .map((m) => m[1].trim())
    .filter((u) => /^https?:\/\//i.test(u));

  if (locs.length === 0) {
    throw new SitemapError("EMPTY", "sitemap에 URL이 없습니다");
  }

  const looksLikeIndex =
    /<sitemapindex/i.test(xml) || locs.every((u) => u.toLowerCase().endsWith(".xml"));

  if (looksLikeIndex) {
    const collected: string[] = [];
    for (const idx of locs.slice(0, 3)) {
      try {
        const sub = await fetchSitemapUrls(idx, max, depth + 1);
        collected.push(...sub);
        if (collected.length >= max * 4) break;
      } catch {
        // skip
      }
    }
    if (collected.length === 0) {
      throw new SitemapError("EMPTY_INDEX", "sitemap index에서 URL을 수집하지 못했습니다");
    }
    return sampleEvenly(collected, max);
  }

  return sampleEvenly(locs, max);
}

function sampleEvenly(arr: string[], n: number): string[] {
  if (arr.length <= n) return arr.slice();
  const step = arr.length / n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}
