import { NextRequest, NextResponse } from 'next/server'
import { getKeywordStats } from './naver-ad'
import { checkRateLimit } from './rate-limiter'

const FALLBACK_VOLUME      = ['매우 높음', '높음', '보통', '낮음', '매우 낮음']
const FALLBACK_COMPETITION = ['높음', '보통', '낮음', '낮음', '매우 낮음']

export async function buildKeywords(recommendations: string[]) {
  const stats = await getKeywordStats(recommendations)
  return recommendations.map((kw, i) => {
    const s = stats.get(kw)
    return {
      keyword: kw,
      searchVolume:  s?.searchVolume  ?? FALLBACK_VOLUME[i]      ?? '보통',
      competition:   s?.competition   ?? FALLBACK_COMPETITION[i] ?? '보통',
      topProducts: [] as [],
    }
  })
}

const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fe80:|fc00:|fd[0-9a-f]{2}:)/i

export type GuardOk = { ok: true; url: string }
export type GuardFail = { ok: false; response: NextResponse }

// 환경변수 + 레이트리밋 + URL 정규화 + SSRF 가드를 한 번에 처리한다.
// 통과 시 정규화된 URL을 반환, 실패 시 NextResponse를 반환.
export async function guardAnalyzeRequest(req: NextRequest): Promise<GuardOk | GuardFail> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '서버 설정 오류: ANTHROPIC_API_KEY 미설정. 관리자에게 문의하세요.' },
        { status: 503 },
      ),
    }
  }

  const limit = checkRateLimit(req)
  if (!limit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `요청이 너무 많습니다. ${limit.retryAfter}초 후 다시 시도해 주세요.` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      ),
    }
  }

  const { url } = await req.json()
  if (!url) {
    return { ok: false, response: NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 }) }
  }

  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  let parsed: URL
  try {
    parsed = new URL(normalizedUrl)
  } catch {
    return { ok: false, response: NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 }) }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, response: NextResponse.json({ error: 'http/https URL만 분석할 수 있습니다.' }, { status: 400 }) }
  }

  const host = parsed.hostname.toLowerCase()
  if (PRIVATE_HOST_RE.test(host) || host === '::') {
    return { ok: false, response: NextResponse.json({ error: '내부망·메타데이터 호스트는 분석할 수 없습니다.' }, { status: 400 }) }
  }

  return { ok: true, url: normalizedUrl }
}
