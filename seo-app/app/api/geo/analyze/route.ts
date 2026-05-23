import { NextRequest, NextResponse } from 'next/server'
import { analyzeUrl } from '@/lib/geo/analyze/compose'
import { checkRateLimit } from '@/lib/rate-limiter'
import { consumeGlobalDailyQuota } from '@/lib/global-limit'
import { assertSafeUrl, SsrfError } from '@/lib/safe-fetch'
import { getCachedGeoReport, cacheGeoReport, publishGeoReport } from '@/lib/geo/result-store'

export const maxDuration = 120

// GEO(생성형 검색엔진 최적화) 분석. SEO와 동일한 비용 방어 가드를 공유한다:
// 신뢰 IP 레이트리밋 → SSRF 검증 → GEO 전용 전역 일일 캡 → 분석(AI 비용 발생).
export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${limit.retryAfter}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const body = await req.json().catch(() => null)
  const rawUrl = body?.url
  if (!rawUrl || typeof rawUrl !== 'string') {
    return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
  }
  // MVP: 검증 모드는 기본 비활성(비용 큼). 후속 단계에서 토글 제공.
  const verification = body?.verification === true

  let normalizedUrl = rawUrl.trim()
  if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl

  // SSRF 사전 검증 (GEO 엔진도 내부 guardUrl로 재검증 — defense in depth)
  try {
    await assertSafeUrl(normalizedUrl)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof SsrfError ? e.message : '유효하지 않은 URL입니다.' },
      { status: 400 },
    )
  }

  // 같은 URL 최근 분석이 있으면 재사용 → AI 비용 절감 (전역 캡도 소비 안 함)
  const cached = await getCachedGeoReport(normalizedUrl)
  if (cached) return NextResponse.json(cached)

  // AI 분석 비용 발생 직전 전역 일일 캡(GEO 전용 카운터, SEO와 분리)
  const quota = await consumeGlobalDailyQuota('geo')
  if (!quota.allowed) {
    return NextResponse.json(
      { error: '오늘 GEO 분석 요청이 많아 일일 한도에 도달했습니다. 내일 다시 시도해 주세요.' },
      { status: 503 },
    )
  }

  try {
    const report = await analyzeUrl(normalizedUrl, { lang: 'ko', verification })
    // LLM 리뷰가 정상 생성됐거나(또는 게이트 차단으로 애초에 AI 불필요) 결정적인
    // 결과만 비용 캐시한다. 일시적 AI 실패로 빈약한 리포트가 24h 캐시되는 것을 방지.
    if (report.llmReview !== null || !report.gate.passed) {
      await cacheGeoReport(report)
    }
    // 공유 링크(/geo/result/[id])용 저장은 비용 캐시와 분리해 항상 수행한다.
    await publishGeoReport(report)
    return NextResponse.json(report)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '분석 실패'
    if (msg.startsWith('URL_GUARD:')) {
      return NextResponse.json({ error: '분석할 수 없는 URL입니다.' }, { status: 400 })
    }
    if (msg.startsWith('FETCH_FAILED:')) {
      return NextResponse.json(
        { error: '대상 페이지를 가져올 수 없습니다 (차단·오류·타임아웃).' },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
