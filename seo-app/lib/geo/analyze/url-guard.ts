import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const PRIVATE_V6 = [/^::1$/, /^fc/i, /^fd/i, /^fe80:/i, /^::ffff:/i];

export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; reason: "invalid" | "scheme" | "ssrf"; detail?: string };

export async function guardUrl(input: string): Promise<UrlGuardResult> {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }

  const host = parsed.hostname;
  if (!host) return { ok: false, reason: "invalid" };

  const lower = host.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".local")
  ) {
    return { ok: false, reason: "ssrf", detail: "localhost" };
  }

  if (isIP(lower)) {
    if (isPrivateAddr(lower)) {
      return { ok: false, reason: "ssrf", detail: `IP ${lower}` };
    }
    return { ok: true, url: parsed };
  }

  try {
    const records = await lookup(lower, { all: true });
    for (const r of records) {
      if (isPrivateAddr(r.address)) {
        return { ok: false, reason: "ssrf", detail: `resolves to ${r.address}` };
      }
    }
  } catch {
    return { ok: false, reason: "invalid", detail: "DNS lookup failed" };
  }

  return { ok: true, url: parsed };
}

function isPrivateAddr(addr: string): boolean {
  if (isIP(addr) === 4) {
    return PRIVATE_V4.some((re) => re.test(addr));
  }
  if (isIP(addr) === 6) {
    return PRIVATE_V6.some((re) => re.test(addr));
  }
  return false;
}
