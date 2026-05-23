// 분석 결과를 Redis에 정규화된 URL 키로 저장한다. 두 가지 효과:
//  1) 같은 URL 재분석 시 캐시 히트 → OpenAI(AI) 비용 절감
//  2) 결과 페이지를 다른 브라우저/사용자가 열어도 서버에서 조회 가능 → 공유 링크
// 분석 대상은 공개 웹사이트이므로 URL 키 공유에 프라이버시 문제는 없다.
import { redis } from './redis'
import type { AnalysisResult } from '@/types/analysis'

const TTL_SECONDS = 24 * 60 * 60 // 24시간
const keyFor = (url: string) => `seo:result:${url}`

export async function getCachedResult(url: string): Promise<AnalysisResult | null> {
  if (!redis) return null
  try {
    return (await redis.get<AnalysisResult>(keyFor(url))) ?? null
  } catch {
    return null
  }
}

export async function cacheResult(result: AnalysisResult): Promise<void> {
  if (!redis) return
  try {
    await redis.set(keyFor(result.url), result, { ex: TTL_SECONDS })
  } catch {
    // 캐시 저장 실패는 분석 결과 반환을 막지 않는다.
  }
}
