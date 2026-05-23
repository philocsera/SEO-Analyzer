import { analyzeUrl } from './analyze/compose'
import { consumeGlobalDailyQuota } from '../global-limit'
import { assertSafeUrl, SsrfError } from '../safe-fetch'
import { getCachedGeoReport, cacheGeoReport, publishGeoReport } from './result-store'
import type { AnalysisReport } from './types'

export type GuardedAnalysis =
  | { ok: true; url: string; report: AnalysisReport }
  | { ok: false; url: string; error: string }

// 단일 URL을 비용 가드와 함께 분석한다(검증 모드 미사용). compare·site처럼 여러
// URL을 한 요청에서 분석하는 엔드포인트가 공유한다. 가드 순서는 단일 분석 라우트와
// 동일: SSRF 검증 → 캐시 히트 재사용 → 전역 일일 캡 소비 → 분석 → 비용캐시·공유 저장.
// `url`은 호출 측 식별을 위해 입력 원본을 그대로 돌려준다.
export async function analyzeGuarded(rawUrl: string): Promise<GuardedAnalysis> {
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

  const cached = await getCachedGeoReport(normalizedUrl)
  if (cached) return { ok: true, url: rawUrl, report: cached }

  const quota = await consumeGlobalDailyQuota('geo')
  if (!quota.allowed) {
    return { ok: false, url: rawUrl, error: '오늘 GEO 분석 일일 한도에 도달했습니다.' }
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
