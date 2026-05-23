import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limiter'
import { analyzeGuarded } from '@/lib/geo/analyze-guarded'

export const maxDuration = 120

const MAX_URLS = 5

// 다중 URL GEO 비교. 단일 분석과 동일한 비용 가드를 공유하되, 레이트리밋은 비교
// 1건당 1회만 소비(검증 모드 미사용). 전역 일일 캡은 실제 AI 분석이 일어나는
// URL마다 analyzeGuarded 내부에서 소비해 총 지출을 막는다(캐시 히트는 미소비).
export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${limit.retryAfter}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const body = await req.json().catch(() => null)
  const rawUrls: unknown = body?.urls
  if (!Array.isArray(rawUrls)) {
    return NextResponse.json({ error: 'urls 배열이 필요합니다.' }, { status: 400 })
  }
  const urls = rawUrls
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter(Boolean)

  if (urls.length < 2) {
    return NextResponse.json(
      { error: '비교에는 2개 이상의 URL이 필요합니다.' },
      { status: 400 },
    )
  }
  if (urls.length > MAX_URLS) {
    return NextResponse.json(
      { error: `최대 ${MAX_URLS}개까지 비교할 수 있습니다.` },
      { status: 400 },
    )
  }

  const items = await Promise.all(urls.map((u) => analyzeGuarded(u)))
  return NextResponse.json({ items })
}
