// SSRF 방어 + 타임아웃을 갖춘 fetch 래퍼.
// 사용자가 입력한 URL을 서버가 대신 fetch하므로, 내부망·메타데이터 호스트로의
// 접근을 막아야 한다. 호스트 문자열 검사만으로는 (1) DNS 리바인딩(공개 도메인이
// 사설 IP로 resolve) (2) 리다이렉트(공개 URL → 내부 URL)를 막지 못하므로,
// 실제 resolve된 IP를 검사하고 리다이렉트도 매 홉마다 재검증한다.
import { lookup } from 'node:dns/promises'

const FETCH_TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 4

export class SsrfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SsrfError'
  }
}

// 호스트 "문자열"이 사설/예약 대역의 리터럴인지(빠른 1차 검사).
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fe80:|fc00:|fd[0-9a-f]{2}:)/i

export function isPrivateHostname(host: string): boolean {
  return PRIVATE_HOST_RE.test(host) || host === '::'
}

// resolve된 "IP"가 사설/예약/멀티캐스트 대역인지.
export function isPrivateIp(ip: string): boolean {
  const addr = ip.toLowerCase()
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  const v4 = mapped ? mapped[1] : addr

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4)) {
    const [a, b] = v4.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true      // link-local / metadata
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true                     // multicast / reserved
    return false
  }
  // IPv6
  if (addr === '::1' || addr === '::') return true
  if (/^(fe80:|fc|fd)/.test(addr)) return true
  return false
}

// URL을 검증한다(프로토콜 + 호스트 문자열 + DNS resolve된 IP). 위반 시 SsrfError.
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfError('유효하지 않은 URL입니다.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SsrfError('http/https URL만 분석할 수 있습니다.')
  }
  const host = parsed.hostname.toLowerCase()
  if (isPrivateHostname(host)) {
    throw new SsrfError('내부망·메타데이터 호스트는 분석할 수 없습니다.')
  }
  // DNS 리바인딩 방어: 모든 A/AAAA 레코드 중 하나라도 사설 대역이면 차단.
  try {
    const records = await lookup(host, { all: true })
    if (records.some((r) => isPrivateIp(r.address))) {
      throw new SsrfError('내부망으로 연결되는 호스트는 분석할 수 없습니다.')
    }
  } catch (e) {
    if (e instanceof SsrfError) throw e
    // resolve 실패(NXDOMAIN 등)는 여기서 막지 않는다 — 실제 fetch가 적절히 실패 처리.
  }
  return parsed
}

// SSRF 검증 + 타임아웃 + 리다이렉트 수동 추적(매 홉 재검증)을 수행하는 fetch.
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  let url = rawUrl

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(url)

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url, { ...init, redirect: 'manual', cache: 'no-store', signal: ctrl.signal })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('대상 사이트 응답 시간이 초과되었습니다 (타임아웃).')
      }
      throw e
    } finally {
      clearTimeout(timer)
    }

    // 3xx → Location을 절대 URL로 만들어 재검증 후 따라간다.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return res
      url = new URL(loc, url).toString()
      continue
    }
    return res
  }

  throw new Error('리다이렉트가 너무 많습니다.')
}
