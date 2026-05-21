// GEO 리포트를 정규화 URL 키로 Redis에 캐시한다. 같은 URL 재분석 시 캐시 히트로
// AI(LLM 리뷰) 비용을 절감한다. Redis 없으면(로컬·미설정) 비활성.
import { redis } from '../redis'
import type { AnalysisReport } from './types'

const TTL_SECONDS = 24 * 60 * 60 // 24시간
const keyFor = (url: string) => `geo:result:${url}`

export async function getCachedGeoReport(url: string): Promise<AnalysisReport | null> {
  if (!redis) return null
  try {
    return (await redis.get<AnalysisReport>(keyFor(url))) ?? null
  } catch {
    return null
  }
}

export async function cacheGeoReport(report: AnalysisReport): Promise<void> {
  if (!redis) return
  try {
    await redis.set(keyFor(report.url), report, { ex: TTL_SECONDS })
  } catch {
    // 캐시 저장 실패는 결과 반환을 막지 않는다.
  }
}
