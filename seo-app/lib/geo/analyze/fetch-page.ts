import { looksLikeMarkdown, markdownToHtml } from "./markdown";
import { guardUrl } from "./url-guard";

const USER_AGENT =
  "GEO-Optimizer/1.0 (+https://github.com/anthropics/claude-code)";

const MAX_BYTES = 5_000_000;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

type GuardedFetch =
  | { ok: true; res: Response; finalUrl: string }
  | { ok: false; status: number; finalUrl: string; error: string };

/**
 * fetch with manual redirect following, re-validating EVERY hop against the
 * SSRF guard. `redirect: "follow"` would let a public URL bounce (302) to an
 * internal host or the cloud metadata IP without re-checking — so we follow by
 * hand and re-run guardUrl on each Location before connecting.
 *
 * Residual limitation: guardUrl resolves DNS, then fetch resolves again, so a
 * DNS-rebinding attacker controlling both answers has a narrow TOCTOU window.
 * Closing that fully needs IP-pinned connects (custom dispatcher); the redirect
 * bypass closed here is the readily exploitable gap.
 */
async function guardedFetch(
  initialUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<GuardedFetch> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const guard = await guardUrl(currentUrl);
    if (!guard.ok) {
      return {
        ok: false,
        status: 0,
        finalUrl: currentUrl,
        error: `SSRF_BLOCKED:${guard.reason}:${guard.detail ?? ""}`,
      };
    }

    const res = await fetch(guard.url.toString(), {
      redirect: "manual",
      headers,
      signal,
    });

    if (!REDIRECT_STATUS.has(res.status)) {
      return { ok: true, res, finalUrl: res.url || guard.url.toString() };
    }

    // Redirect: drain the body to free the socket, then re-loop on the target.
    await res.body?.cancel().catch(() => {});
    const location = res.headers.get("location");
    if (!location) {
      return {
        ok: false,
        status: res.status,
        finalUrl: currentUrl,
        error: `Redirect ${res.status} without Location header`,
      };
    }
    try {
      currentUrl = new URL(location, guard.url).toString();
    } catch {
      return {
        ok: false,
        status: res.status,
        finalUrl: currentUrl,
        error: `Invalid redirect Location: ${location}`,
      };
    }
  }
  return {
    ok: false,
    status: 0,
    finalUrl: currentUrl,
    error: `Too many redirects (>${MAX_REDIRECTS})`,
  };
}

export type FetchResult = {
  ok: true;
  status: number;
  finalUrl: string;
  html: string;
  bytes: number;
  responseMs: number;
  contentType: string;
  servedAsMarkdown: boolean;
} | {
  ok: false;
  status: number;
  finalUrl: string;
  responseMs: number;
  error: string;
};

export async function fetchPage(url: string): Promise<FetchResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const fetched = await guardedFetch(
      url,
      {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en;q=0.9,ko;q=0.8",
      },
      controller.signal,
    );
    if (!fetched.ok) {
      return {
        ok: false,
        status: fetched.status,
        finalUrl: fetched.finalUrl,
        responseMs: Date.now() - start,
        error: fetched.error,
      };
    }
    const { res, finalUrl } = fetched;

    const contentType = res.headers.get("content-type") ?? "";
    // text/html · xhtml은 무조건 통과. plain/octet-stream/null은 본문을 받아서 매직 바이트로 검증.
    const allowedDirect =
      contentType.includes("text/html") || contentType.includes("application/xhtml");
    const allowedSniff =
      contentType.includes("text/plain") ||
      contentType.includes("application/octet-stream") ||
      contentType === "";
    if (!allowedDirect && !allowedSniff) {
      return {
        ok: false,
        status: res.status,
        finalUrl,
        responseMs: Date.now() - start,
        error: `Unsupported content-type: ${contentType}`,
      };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return {
        ok: false,
        status: res.status,
        finalUrl,
        responseMs: Date.now() - start,
        error: "No response body",
      };
    }

    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          controller.abort();
          return {
            ok: false,
            status: res.status,
            finalUrl,
            responseMs: Date.now() - start,
            error: `Response too large (>${MAX_BYTES} bytes)`,
          };
        }
        chunks.push(value);
      }
    }

    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    let body = buf.toString("utf-8");
    let servedAsMarkdown = false;

    if (!allowedDirect) {
      const head = body.slice(0, 1024).trimStart().toLowerCase();
      const looksHtml =
        head.startsWith("<!doctype html") ||
        head.startsWith("<html") ||
        head.startsWith("<head") ||
        head.startsWith("<body") ||
        head.startsWith("<?xml");
      if (!looksHtml) {
        // 페이지가 LLM 봇에게 markdown으로 응답하는 경우(Stripe Docs 등) — HTML로 변환해 파이프라인 유지.
        if (looksLikeMarkdown(body)) {
          body = markdownToHtml(body);
          servedAsMarkdown = true;
        } else {
          return {
            ok: false,
            status: res.status,
            finalUrl,
            responseMs: Date.now() - start,
            error: `Body does not look like HTML or Markdown (content-type: ${contentType || "unknown"})`,
          };
        }
      }
    }

    return {
      ok: true,
      status: res.status,
      finalUrl,
      html: body,
      bytes,
      responseMs: Date.now() - start,
      contentType,
      servedAsMarkdown,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      responseMs: Date.now() - start,
      error: msg,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(url: string, maxBytes = 200_000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const fetched = await guardedFetch(
      url,
      { "User-Agent": USER_AGENT },
      controller.signal,
    );
    if (!fetched.ok || !fetched.res.ok) return null;
    const text = await fetched.res.text();
    return text.slice(0, maxBytes);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
