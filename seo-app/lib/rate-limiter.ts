// 분석 엔드포인트(/api/analyze)는 1회당 Anthropic 비용(~$0.06)이 발생하므로
// 비용 어뷰징을 막아야 한다. Vercel 서버리스에서는 in-memory Map이 인스턴스마다·
// 콜드스타트마다 리셋되어 사실상 제한이 안 걸리므로, Upstash Redis로 인스턴스 간
// 공유 카운터를 둔다. Upstash 환경변수가 없으면(로컬·미설정 배포) in-memory로 폴백.
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const MINUTE_LIMIT = 3
const HOUR_LIMIT   = 10
const MINUTE_MS    = 60_000
const HOUR_MS      = 3_600_000

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // 초 단위
}

function extractIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function isLocalhost(req: Request): boolean {
  const host = req.headers.get('host') ?? ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
}

// ── Upstash Redis (durable, 서버리스 인스턴스 간 공유) ──────────────
// Vercel 마켓플레이스 Upstash 연결은 통합 종류에 따라 변수명이 다르다:
//  - 네이티브 Upstash 통합 → UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//  - KV 스타일 통합(upstash-kv) → KV_REST_API_URL / KV_REST_API_TOKEN
// 둘 다 지원하도록 폴백한다. (그래서 Redis.fromEnv() 대신 명시적 생성)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

const hasUpstash = !!redisUrl && !!redisToken

const redisLimiters = hasUpstash
  ? (() => {
      const redis = new Redis({ url: redisUrl!, token: redisToken! })
      return {
        minute: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(MINUTE_LIMIT, '1 m'),
          prefix: 'seo:rl:min',
        }),
        hour: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(HOUR_LIMIT, '1 h'),
          prefix: 'seo:rl:hr',
        }),
      }
    })()
  : null

if (!redisLimiters && process.env.NODE_ENV === 'production') {
  console.warn(
    '[rate-limiter] Upstash 변수(UPSTASH_REDIS_REST_URL/TOKEN 또는 KV_REST_API_URL/TOKEN) 미설정 — in-memory 폴백 사용 중. ' +
    '서버리스에서는 인스턴스마다 카운터가 리셋되어 비용 어뷰징 방어가 약합니다.',
  )
}

async function checkRedis(ip: string): Promise<RateLimitResult> {
  // 분당 제한 → 시간당 제한 순으로 검사. 허용된 요청만 두 카운터를 모두 소비한다.
  const min = await redisLimiters!.minute.limit(ip)
  if (!min.success) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((min.reset - Date.now()) / 1000)) }
  }
  const hr = await redisLimiters!.hour.limit(ip)
  if (!hr.success) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((hr.reset - Date.now()) / 1000)) }
  }
  return { allowed: true }
}

// ── in-memory 폴백 (단일 인스턴스 best-effort) ─────────────────────
const store = new Map<string, number[]>()

function checkInMemory(ip: string): RateLimitResult {
  const now = Date.now()
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < HOUR_MS)

  if (timestamps.length >= HOUR_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((timestamps[0] + HOUR_MS - now) / 1000) }
  }

  const lastMinute = timestamps.filter((t) => now - t < MINUTE_MS)
  if (lastMinute.length >= MINUTE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((lastMinute[0] + MINUTE_MS - now) / 1000) }
  }

  timestamps.push(now)
  store.set(ip, timestamps)
  return { allowed: true }
}

export async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  if (isLocalhost(req)) return { allowed: true }

  const ip = extractIp(req)

  if (redisLimiters) {
    try {
      return await checkRedis(ip)
    } catch (err) {
      // Redis 일시 장애로 분석을 전면 차단하지 않되, in-memory로라도 best-effort 제한.
      console.warn(
        '[rate-limiter] Upstash 호출 실패, in-memory 폴백:',
        err instanceof Error ? err.message : err,
      )
      return checkInMemory(ip)
    }
  }

  return checkInMemory(ip)
}
