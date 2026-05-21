import { Redis } from '@upstash/redis'

// Vercel 마켓플레이스 Upstash 연결은 통합 종류에 따라 변수명이 다르다:
//  - 네이티브 Upstash 통합 → UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//  - KV 스타일 통합(upstash-kv) → KV_REST_API_URL / KV_REST_API_TOKEN
// 둘 다 지원하고, 둘 다 없으면(로컬·미설정) null을 노출해 호출부가 폴백하게 한다.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

export const redis = url && token ? new Redis({ url, token }) : null
export const hasRedis = !!redis

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn(
    '[redis] Upstash 변수(UPSTASH_REDIS_REST_URL/TOKEN 또는 KV_REST_API_URL/TOKEN) 미설정 — ' +
    '레이트리밋·전역 상한·결과 캐시가 폴백/비활성으로 동작합니다.',
  )
}
