import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limiter'
import { analyzeGuarded, type GuardedAnalysis } from '@/lib/geo/analyze-guarded'
import { fetchSitemapUrls, SitemapError } from '@/lib/geo/analyze/sitemap'
import type { AnalysisReport } from '@/lib/geo/types'

export const maxDuration = 120

const DEFAULT_SAMPLE = 5
const MAX_SAMPLE = 8

type ScoreKey = keyof AnalysisReport['scores']

// 사이트 단위 GEO 진단: sitemap.xml에서 페이지를 샘플링해 각각 분석하고 평균을 낸다.
// 레이트리밋은 진단 1건당 1회, 전역 캡은 분석되는 URL마다 소비(analyzeGuarded).
export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${limit.retryAfter}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const body = await req.json().catch(() => null)
  const domain = typeof body?.domain === 'string' ? body.domain.trim() : ''
  if (!domain) {
    return NextResponse.json({ error: 'domain이 필요합니다.' }, { status: 400 })
  }
  const size = Math.min(
    Math.max(1, Number(body?.sampleSize) || DEFAULT_SAMPLE),
    MAX_SAMPLE,
  )

  let urls: string[]
  try {
    urls = await fetchSitemapUrls(domain, size)
  } catch (err) {
    const msg =
      err instanceof SitemapError
        ? siteMapMessage(err.code)
        : 'sitemap을 가져오는 중 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const items = await Promise.all(urls.map((u) => analyzeGuarded(u)))
  const successes = items.filter(
    (it): it is Extract<GuardedAnalysis, { ok: true }> => it.ok,
  )

  let domainOrigin = domain
  try {
    domainOrigin = new URL(domain).origin
  } catch {
    /* keep raw */
  }

  return NextResponse.json({
    domain: domainOrigin,
    sampledUrls: urls,
    items,
    aggregate: aggregate(items, successes),
  })
}

function aggregate(
  items: GuardedAnalysis[],
  successes: Array<Extract<GuardedAnalysis, { ok: true }>>,
) {
  const passing = successes.filter((s) => s.report.gate.passed)
  const avg = (key: ScoreKey) =>
    passing.length === 0
      ? 0
      : Math.round(
          passing.reduce((sum, s) => sum + (s.report.scores[key] ?? 0), 0) /
            passing.length,
        )

  const overallVals = passing
    .map((s) => s.report.scores.overall)
    .filter((v): v is number => typeof v === 'number')

  return {
    averageOverall:
      overallVals.length === 0
        ? null
        : Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length),
    averages: {
      citability: avg('citability'),
      quotability: avg('quotability'),
      specificity: avg('specificity'),
      extractability: avg('extractability'),
    },
    passRate: items.length === 0 ? 0 : passing.length / items.length,
    sampled: items.length,
    succeeded: successes.length,
  }
}

function siteMapMessage(code: string): string {
  if (code === 'NOT_FOUND')
    return 'sitemap.xml을 찾을 수 없습니다. 도메인을 확인해 주세요.'
  if (code === 'EMPTY') return 'sitemap에 분석 가능한 URL이 없습니다.'
  if (code === 'BAD_URL') return '유효한 URL이 아닙니다.'
  return 'sitemap을 처리할 수 없습니다.'
}
