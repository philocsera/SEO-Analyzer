// Vercel 서버리스 환경에서는 인스턴스 재기동 시 초기화됨.
// 단일 인스턴스 내에서의 기본적인 어뷰징 방지 용도로 사용.
const store = new Map<string, number[]>()

const MINUTE_LIMIT = 3
const HOUR_LIMIT   = 10
const MINUTE_MS    = 60_000
const HOUR_MS      = 3_600_000

function extractIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

function isLocalhost(req: Request): boolean {
  const host = req.headers.get('host') ?? ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // 초 단위
}

export function checkRateLimit(req: Request): RateLimitResult {
  if (isLocalhost(req)) return { allowed: true }

  const ip  = extractIp(req)
  const now = Date.now()

  // 1시간 이상 지난 항목 정리
  const timestamps = (store.get(ip) ?? []).filter(t => now - t < HOUR_MS)

  // 시간당 제한 검사
  if (timestamps.length >= HOUR_LIMIT) {
    const retryAfter = Math.ceil((timestamps[0] + HOUR_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // 분당 제한 검사
  const lastMinute = timestamps.filter(t => now - t < MINUTE_MS)
  if (lastMinute.length >= MINUTE_LIMIT) {
    const retryAfter = Math.ceil((lastMinute[0] + MINUTE_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }

  timestamps.push(now)
  store.set(ip, timestamps)
  return { allowed: true }
}
