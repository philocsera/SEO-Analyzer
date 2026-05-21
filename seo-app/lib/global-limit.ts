// 전역 일일 비용 상한. IP별 레이트리밋(rate-limiter.ts)은 분산/위조 IP 공격에
// 대해 전체 지출을 못 막으므로, 모든 사용자 합산 분석 횟수에 하루 상한을 둔다.
// 실제 AI 호출(비용 발생)이 일어나는 캐시 미스에서만 호출해야 한다.
import { redis } from './redis'

// 기본 300건/일 (~$18/일). ANALYZE_DAILY_CAP 환경변수로 조정 가능.
const DAILY_CAP = Math.max(1, Number(process.env.ANALYZE_DAILY_CAP ?? '300'))

export interface GlobalLimitResult {
  allowed: boolean
  count: number
  cap: number
}

// 호출 시 당일 카운터를 1 증가시키고 상한 초과 여부를 반환한다(원자적 INCR).
// Redis가 없으면(로컬·미설정) 항상 허용. Redis 장애 시에도 분석을 막지 않는다.
export async function consumeGlobalDailyQuota(): Promise<GlobalLimitResult> {
  if (!redis) return { allowed: true, count: 0, cap: DAILY_CAP }

  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const key = `seo:global:analyze:${day}`
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      // 첫 증가 시에만 만료 설정(26h: 자정 경계 + 약간의 여유).
      await redis.expire(key, 60 * 60 * 26)
    }
    return { allowed: count <= DAILY_CAP, count, cap: DAILY_CAP }
  } catch {
    return { allowed: true, count: 0, cap: DAILY_CAP }
  }
}
