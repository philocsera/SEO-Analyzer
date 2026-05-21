import { NextRequest, NextResponse } from 'next/server'
import { crawlUrl, buildSeoChecklist, buildSmartStoreSeoChecklist } from '@/lib/crawler'
import { isSmartStore, parseSmartStore, extractStoreSlug } from '@/lib/smartstore'
import { analyzeWithAI, analyzeSmartStoreWithAI } from '@/lib/ai-analyzer'
import { calcTechnicalScore, calcOverallScore, calcBrandAwarenessScore } from '@/lib/seo-scorer'
import { lookupBusinessSize, extractCompanyName } from '@/lib/dart'
import { fetchCruxData } from '@/lib/crux'
import { estimateRevenue } from '@/lib/revenue-estimator'
import { buildBrandAwarenessFromSearch } from '@/lib/brand-search'
import { AnalysisResult } from '@/types/analysis'
import { buildKeywords, guardAnalyzeRequest } from '@/lib/analyze-common'
import { getCachedResult, cacheResult } from '@/lib/server-result-store'
import { consumeGlobalDailyQuota } from '@/lib/global-limit'
import { randomUUID } from 'crypto'

export const maxDuration = 120

// 클라이언트 입력 문제(예: 스토어 식별자 누락)를 500이 아닌 400으로 내려주기 위한 마커.
class BadRequestError extends Error {}

const SMARTSTORE_DATA_LIMITATIONS = [
  '리뷰 수·평점·판매량은 네이버 공식 API에서 제공하지 않아 분석에서 제외됩니다.',
  '검색 결과 내 노출 순위는 별도의 키워드 추적 도구가 필요하므로 측정하지 않습니다.',
  '페이지 메타데이터(title/description) 및 이미지 alt는 robots.txt 정책상 수집하지 않습니다.',
  '본 분석은 네이버 검색 API(쇼핑·웹·블로그) 및 검색광고 API의 공식 데이터만을 사용합니다.',
]

async function analyzeSmartStoreFlow(normalizedUrl: string): Promise<AnalysisResult> {
  const slug = extractStoreSlug(normalizedUrl)
  if (!slug) {
    throw new BadRequestError('스마트스토어 URL에서 스토어 식별자를 찾을 수 없습니다.')
  }

  const smartstore = await parseSmartStore(normalizedUrl)
  const seoItems = buildSmartStoreSeoChecklist(smartstore.products, slug)
  const technicalScore = calcTechnicalScore(seoItems)

  const clientId = process.env.NAVER_CLIENT_ID ?? ''
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? ''

  const [ai, brandAwarenessBase] = await Promise.all([
    analyzeSmartStoreWithAI(slug, smartstore),
    clientId && clientSecret
      ? buildBrandAwarenessFromSearch(normalizedUrl, smartstore.storeName, clientId, clientSecret)
      : Promise.resolve(undefined),
  ])

  const keywords = await buildKeywords(ai.seoRecommendations)
  // 스마트스토어 종합 점수 = Naver 공식 가이드 기반 체크리스트 점수.
  // 기존의 자의적 keywordScore 가중(0.6)은 출처가 불명확해 제거됨.
  const overallScore = technicalScore

  const result: AnalysisResult = {
    id: randomUUID(),
    url: normalizedUrl,
    analyzedAt: new Date().toISOString(),
    overallScore,
    technical: { score: technicalScore, items: seoItems },
    smartstore: {
      storeName: smartstore.storeName,
      products: smartstore.products,
      categories: smartstore.categories,
      dataLimitations: SMARTSTORE_DATA_LIMITATIONS,
    },
    ai,
    keywords,
    brandAwareness: brandAwarenessBase
      ? { ...brandAwarenessBase, aiLabels: ai.brandAwarenessLabels }
      : undefined,
  }

  return result
}

async function analyzeWebsiteFlow(normalizedUrl: string): Promise<AnalysisResult> {
  const crawlData = await crawlUrl(normalizedUrl)

  const seoItems = buildSeoChecklist(crawlData)
  const technicalScore = calcTechnicalScore(seoItems)
  const brandAwareness = calcBrandAwarenessScore(crawlData)
  const overallScore = calcOverallScore(technicalScore, brandAwareness.score)

  const [dartInfo, crux] = await Promise.all([
    lookupBusinessSize(extractCompanyName(crawlData)),
    fetchCruxData(normalizedUrl),
  ])

  const ai = await analyzeWithAI(crawlData, seoItems, dartInfo)
  const keywords = await buildKeywords(ai.seoRecommendations)

  const result: AnalysisResult = {
    id: randomUUID(),
    url: normalizedUrl,
    analyzedAt: new Date().toISOString(),
    overallScore,
    technical: { score: technicalScore, items: seoItems },
    ai,
    keywords,
    brandAwareness: { ...brandAwareness, aiLabels: ai.brandAwarenessLabels },
    crux: crux ?? undefined,
    revenueEstimate: estimateRevenue(crawlData, dartInfo) ?? undefined,
  }

  return result
}

export async function POST(req: NextRequest) {
  const guard = await guardAnalyzeRequest(req)
  if (!guard.ok) return guard.response

  // 같은 URL 최근 분석이 있으면 재사용 → AI 비용 절감 + 결과 공유 링크 지원.
  const cached = await getCachedResult(guard.url)
  if (cached) return NextResponse.json(cached)

  // 실제 AI 분석(비용 발생) 직전에 전역 일일 상한 확인.
  const quota = await consumeGlobalDailyQuota()
  if (!quota.allowed) {
    return NextResponse.json(
      { error: '오늘 분석 요청이 많아 일일 한도에 도달했습니다. 내일 다시 시도해 주세요.' },
      { status: 503 },
    )
  }

  try {
    const result = isSmartStore(guard.url)
      ? await analyzeSmartStoreFlow(guard.url)
      : await analyzeWebsiteFlow(guard.url)
    await cacheResult(result)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : '분석 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
