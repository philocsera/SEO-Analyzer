// 분석 엔드포인트(/api/analyze)는 1회당 Anthropic 비용(~$0.06)이 발생하므로
// 비용 어뷰징을 막아야 한다. Vercel 서버리스에서는 in-memory Map이 인스턴스마다·
// 콜드스타트마다 리셋되어 사실상 제한이 안 걸리므로, Upstash Redis로 인스턴스 간
// 공유 카운터를 둔다. Redis가 없으면(로컬·미설정 배포) in-memory로 폴백.
import { Ratelimit } from '@upstash/ratelimit'
import { ipAddress } from '@vercel/functions'
import { redis } from './redis'

const MINUTE_LIMIT = 3
const HOUR_LIMIT   = 10
const MINUTE_MS    = 60_000
const HOUR_MS      = 3_600_000

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // 초 단위
}

// 레이트리밋 키로 쓸 클라이언트 IP. x-forwarded-for의 맨 앞 값은 클라이언트가
// 임의로 위조할 수 있어(매 요청 다른 IP → 제한 우회) 신뢰하지 않는다. Vercel이
// 셋팅하는 신뢰값을 @vercel/functions의 ipAddress()로 얻고, 없으면 x-real-ip로 폴백.
function extractIp(req: Request): string {
  const vercelIp = ipAddress(req)
  if (vercelIp) return vercelIp
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  // 비-Vercel 환경 폴백: XFF의 마지막 값(가장 가까운 신뢰 프록시가 덧붙인 값).
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return 'unknown'
}

function isLocalhost(req: Request): boolean {
  const host = req.headers.get('host') ?? ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
}

// ── Upstash Redis (durable, 서버리스 인스턴스 간 공유) ──────────────
const redisLimiters = redis
  ? {
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
  : null

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
  // localhost 우회는 개발 편의용이다. 프로덕션에서는 Host 헤더가 위조 가능하므로
  // (예: Host: localhost) 비프로덕션 환경에서만 우회를 허용한다.
  if (process.env.NODE_ENV !== 'production' && isLocalhost(req)) return { allowed: true }

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
