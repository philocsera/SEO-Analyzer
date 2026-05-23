// GEO 리포트를 정규화 URL 키로 Redis에 캐시한다. 같은 URL 재분석 시 캐시 히트로
// AI(LLM 리뷰) 비용을 절감한다. Redis 없으면(로컬·미설정) 비활성.
import { redis } from '../redis'
import type { AnalysisReport } from './types'

const TTL_SECONDS = 24 * 60 * 60 // 24시간 (비용 캐시)
const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7일 (공유 링크)
const keyFor = (url: string) => `geo:result:${url}`
const shareKeyFor = (url: string) => `geo:share:${url}`

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

// 공유 링크용 저장. 비용 캐시(cacheGeoReport)와 키·TTL을 분리한다 — 비용 캐시는
// LLM 리뷰 성공 시에만 저장해 일시적 AI 실패가 24h 재사용되는 걸 막지만, 공유는
// 휴리스틱만 나온 리포트도 링크로 열 수 있어야 하므로 분석 성공이면 항상 저장한다.
export async function publishGeoReport(report: AnalysisReport): Promise<void> {
  if (!redis) return
  try {
    await redis.set(shareKeyFor(report.url), report, { ex: SHARE_TTL_SECONDS })
  } catch {
    // 저장 실패는 결과 반환을 막지 않는다(공유 링크만 비활성).
  }
}

// 공유 링크 조회. 공유 저장본 우선, 없으면 비용 캐시본으로 폴백.
export async function getSharedGeoReport(url: string): Promise<AnalysisReport | null> {
  if (!redis) return null
  try {
    const shared = await redis.get<AnalysisReport>(shareKeyFor(url))
    if (shared) return shared
    return (await redis.get<AnalysisReport>(keyFor(url))) ?? null
  } catch {
    return null
  }
}
