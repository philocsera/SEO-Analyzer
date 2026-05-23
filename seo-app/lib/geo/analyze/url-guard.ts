import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateHostname, isPrivateIp } from "@/lib/safe-fetch";

// SSRF 판정 규칙(사설/예약 IP 대역·내부 호스트명)은 seo-app 공유 가드(safe-fetch)에
// 일원화돼 있다. 이 모듈은 GEO 엔진이 기대하는 결과 형태(UrlGuardResult)로 감싸기만 한다.
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

  const host = parsed.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "invalid" };

  // 리터럴 IP는 그 값 자체를 사설/예약/멀티캐스트 대역 함수로 검사(공인 IP는 통과).
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      return { ok: false, reason: "ssrf", detail: `IP ${host}` };
    }
    return { ok: true, url: parsed };
  }

  // localhost·.internal·.local 등 명시적 내부 호스트명 차단.
  if (isPrivateHostname(host)) {
    return { ok: false, reason: "ssrf", detail: host };
  }

  // DNS 리바인딩 방어: resolve된 모든 레코드 중 하나라도 사설이면 차단.
  try {
    const records = await lookup(host, { all: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        return { ok: false, reason: "ssrf", detail: `resolves to ${r.address}` };
      }
    }
  } catch {
    return { ok: false, reason: "invalid", detail: "DNS lookup failed" };
  }

  return { ok: true, url: parsed };
}
