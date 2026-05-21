import { NextRequest, NextResponse } from 'next/server'
import { getCachedResult } from '@/lib/server-result-store'

// 결과 공유/재방문용 읽기 전용 조회. 비용이 없으므로 레이트리밋 없음.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 })
  }
  const result = await getCachedResult(url)
  if (!result) {
    return NextResponse.json({ error: '결과를 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json(result)
}
