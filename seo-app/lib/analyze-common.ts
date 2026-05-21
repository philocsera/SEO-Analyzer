import { NextRequest, NextResponse } from 'next/server'
import { getKeywordStats } from './naver-ad'
import { checkRateLimit } from './rate-limiter'
import { assertSafeUrl, SsrfError } from './safe-fetch'

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

  const limit = await checkRateLimit(req)
  if (!limit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `요청이 너무 많습니다. ${limit.retryAfter}초 후 다시 시도해 주세요.` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      ),
    }
  }

  const body = await req.json().catch(() => null)
  const url = body?.url
  if (!url || typeof url !== 'string') {
    return { ok: false, response: NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 }) }
  }

  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // 프로토콜 + 내부망 + DNS 리바인딩 검증 (SSRF 방어)
  try {
    await assertSafeUrl(normalizedUrl)
  } catch (e) {
    const message = e instanceof SsrfError ? e.message : '유효하지 않은 URL입니다.'
    return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) }
  }

  return { ok: true, url: normalizedUrl }
}
