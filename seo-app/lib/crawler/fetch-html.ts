// HTML fetch + 문자셋 디코딩 + HTTP 에러 → 한국어 메시지 변환.
// 429 응답 시 지수 백오프로 최대 retries회 재시도.
// 네트워크 요청은 safeFetch로 보내 SSRF(내부망/리다이렉트/DNS 리바인딩)와
// 무응답(타임아웃)을 방어한다.
import { safeFetch } from '../safe-fetch'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
}

function toHttpError(status: number): string {
  if (status === 429) return `요청이 너무 많습니다 (HTTP 429). 잠시 후 다시 시도해주세요.`
  if (status === 403 || status === 401) return `해당 사이트가 외부 크롤러 접근을 차단하고 있습니다 (HTTP ${status}).`
  if (status >= 500) return `대상 사이트 서버 오류 (HTTP ${status}). 잠시 후 다시 시도해주세요.`
  return `사이트 접근 실패 (HTTP ${status}).`
}

export async function fetchHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await safeFetch(url, { headers: FETCH_HEADERS })

    if (res.ok) {
      const buf = await res.arrayBuffer()

      // Content-Type 헤더에서 charset 추출
      let charset = res.headers.get('content-type')?.match(/charset=([^\s;]+)/i)?.[1]

      // 헤더에 없으면 HTML 앞부분(latin1로 읽어 ASCII 안전)에서 meta charset 탐지
      // 2048바이트보다 작은 페이지(예: example.com)는 byteLength로 클램프 — 그렇지 않으면
      // new Uint8Array(buf, 0, 2048)이 RangeError("Invalid typed array length")로 분석을 죽인다.
      if (!charset) {
        const headLen = Math.min(2048, buf.byteLength)
        const head = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, headLen))
        charset =
          head.match(/<meta[^>]+charset=["']?\s*([^\s"';>]+)/i)?.[1] ??
          head.match(/<meta[^>]+content=["'][^"']*charset=([^\s"';>]+)/i)?.[1]
      }

      const encoding = (charset ?? 'utf-8').toLowerCase().replace(/_/g, '-')
      try {
        return new TextDecoder(encoding).decode(buf)
      } catch {
        return new TextDecoder('utf-8').decode(buf)
      }
    }

    if (res.status === 429 && attempt < retries) {
      const retryAfter = res.headers.get('Retry-After')
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * 2 ** attempt, 10000) // 2s, 4s, 8s … max 10s
      await new Promise((r) => setTimeout(r, delay))
      continue
    }

    throw new Error(toHttpError(res.status))
  }

  throw new Error(toHttpError(429))
}
