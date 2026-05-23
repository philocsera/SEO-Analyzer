import { NextRequest, NextResponse } from 'next/server'
import { analyzeUrl } from '@/lib/geo/analyze/compose'
import { checkRateLimit } from '@/lib/rate-limiter'
import { consumeGlobalDailyQuota } from '@/lib/global-limit'
import { assertSafeUrl, SsrfError } from '@/lib/safe-fetch'
import {
  getCachedGeoReport,
  cacheGeoReport,
  publishGeoReport,
} from '@/lib/geo/result-store'
import type { AnalysisReport } from '@/lib/geo/types'

export const maxDuration = 120

const MAX_URLS = 5

export type CompareItem =
  | { ok: true; url: string; report: AnalysisReport }
  | { ok: false; url: string; error: string }

// 다중 URL GEO 비교. 단일 분석과 동일한 비용 가드를 공유하되, 레이트리밋은 비교
// 1건당 1회만 소비(검증 모드 미사용). 전역 일일 캡은 실제 AI 분석이 일어나는
// URL마다 소비해 총 지출을 막는다. 캐시 히트는 캡을 소비하지 않는다.
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

  const items = await Promise.all(urls.map((u) => analyzeOne(u)))
  return NextResponse.json({ items })
}

async function analyzeOne(rawUrl: string): Promise<CompareItem> {
  let normalizedUrl = rawUrl.trim()
  if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl

  try {
    await assertSafeUrl(normalizedUrl)
  } catch (e) {
    return {
      ok: false,
      url: rawUrl,
      error: e instanceof SsrfError ? e.message : '유효하지 않은 URL입니다.',
    }
  }

  // 캐시 히트면 재사용 (AI 비용·전역 캡 소비 없음)
  const cached = await getCachedGeoReport(normalizedUrl)
  if (cached) return { ok: true, url: rawUrl, report: cached }

  const quota = await consumeGlobalDailyQuota('geo')
  if (!quota.allowed) {
    return {
      ok: false,
      url: rawUrl,
      error: '오늘 GEO 분석 일일 한도에 도달했습니다.',
    }
  }

  try {
    const report = await analyzeUrl(normalizedUrl, { lang: 'ko', verification: false })
    if (report.llmReview !== null || !report.gate.passed) {
      await cacheGeoReport(report)
    }
    await publishGeoReport(report)
    return { ok: true, url: rawUrl, report }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '분석 실패'
    if (msg.startsWith('URL_GUARD:')) {
      return { ok: false, url: rawUrl, error: '분석할 수 없는 URL입니다.' }
    }
    if (msg.startsWith('FETCH_FAILED:')) {
      return { ok: false, url: rawUrl, error: '페이지를 가져올 수 없습니다.' }
    }
    return { ok: false, url: rawUrl, error: msg }
  }
}
