import type { CrawlData } from './crawler'
import type { DartLookupResult } from './dart'
import { RevenueEstimate } from '@/types/analysis'

// 업종 코드별 1인당 연매출 벤치마크 (억원, 통계청 기업활동조사 기준)
const REVENUE_PER_EMPLOYEE: Record<string, { min: number; max: number; label: string }> = {
  C: { min: 1.5, max: 3.0, label: '제조업' },
  F: { min: 1.2, max: 2.5, label: '건설업' },
  G: { min: 2.0, max: 5.0, label: '도소매업' },
  H: { min: 1.0, max: 2.0, label: '운수·창고업' },
  I: { min: 0.5, max: 1.0, label: '숙박·음식업' },
  J: { min: 1.0, max: 1.5, label: 'IT·정보통신업' },
  K: { min: 2.0, max: 5.0, label: '금융·보험업' },
  M: { min: 0.8, max: 1.5, label: '전문·과학·기술 서비스업' },
  N: { min: 0.5, max: 1.0, label: '사업지원 서비스업' },
}
const DEFAULT_BENCHMARK = { min: 0.8, max: 1.5, label: '서비스업' }

function getBenchmark(indutyCode: string) {
  const code = (indutyCode ?? '').trim().charAt(0).toUpperCase()
  return REVENUE_PER_EMPLOYEE[code] ?? DEFAULT_BENCHMARK
}

function parseKoreanAmount(numStr: string, unit: string): number | null {
  const n = parseFloat(numStr.replace(/,/g, ''))
  if (isNaN(n) || n <= 0) return null
  if (unit === '조') return n * 10000
  if (unit === '억') return n
  return null
}

// Stage 2a: 본문에서 매출 직접 언급 추출
function extractFromPageText(bodyText: string): RevenueEstimate | null {
  const patterns = [
    // "연매출 50억원", "매출액 약 200억", "연간 매출 1조원"
    /(?:연간?\s*)?매출(?:액)?\s*(?:규모\s*)?(?:약\s*)?([\d,]+(?:\.\d+)?)\s*(조|억)\s*원/,
    /(?:연간?\s*)?(?:총\s*)?매출(?:액)?\s*(?:약\s*)?([\d,]+(?:\.\d+)?)\s*(조|억)/,
    // "50억원 규모의 매출", "200억 매출 달성"
    /([\d,]+(?:\.\d+)?)\s*(조|억)\s*원?\s*(?:규모의?\s*)?(?:연간?\s*)?매출/,
    /([\d,]+(?:\.\d+)?)\s*(조|억)\s*원?\s*매출\s*(?:달성|기록|돌파)/,
  ]

  for (const pattern of patterns) {
    const match = bodyText.match(pattern)
    if (!match) continue
    const amount = parseKoreanAmount(match[1], match[2])
    // 0.1억(1000만원) ~ 50만억(500조) 범위만 유효
    if (amount && amount >= 0.1 && amount <= 500000) {
      return {
        amount,
        source: 'page_mention',
        confidence: 'medium',
        basis: '사이트 본문 공개 수치 기준',
      }
    }
  }
  return null
}

// Stage 2b: 직원 수 → 업종 벤치마크 적용
function estimateFromEmployees(
  count: number,
  indutyCode: string,
  countSource: 'dart' | 'page'
): RevenueEstimate {
  const bm = getBenchmark(indutyCode)
  const min = Math.round(count * bm.min)
  const max = Math.round(count * bm.max)
  const amount = Math.round((min + max) / 2)

  const sourceLabel = countSource === 'dart' ? 'DART 공시 직원 수' : '사이트 본문 직원 수'

  return {
    amount,
    range: { min, max },
    source: 'employee_benchmark',
    confidence: 'low',
    basis: `${sourceLabel} ${count.toLocaleString()}명 × ${bm.label} 1인당 ${bm.min}~${bm.max}억원 벤치마크`,
  }
}

// 본문에서 직원 수 추출
function extractEmployeeCountFromText(bodyText: string): number | null {
  const patterns = [
    /(?:임직원|직원|구성원)\s*(?:수\s*)?(?:약\s*)?([\d,]+)\s*명/,
    /약\s*([\d,]+)\s*명의?\s*(?:임직원|직원|구성원|팀원)/,
    /([\d,]+)\s*명\s*(?:규모의?\s*)?(?:임직원|직원|팀원)/,
  ]
  for (const pattern of patterns) {
    const match = bodyText.match(pattern)
    if (match) {
      const n = parseInt(match[1].replace(/,/g, ''), 10)
      if (n >= 2 && n <= 100000) return n
    }
  }
  return null
}

export function estimateRevenue(
  crawlData: CrawlData,
  dartInfo: DartLookupResult
): RevenueEstimate | null {
  // Stage 1: DART 실제 매출
  if (dartInfo.found && dartInfo.revenue) {
    return {
      amount: dartInfo.revenue,
      source: 'dart',
      confidence: 'high',
      basis: `DART 공시 매출액 (${dartInfo.corpName ?? '확인됨'})`,
    }
  }

  // Stage 2a: 본문 직접 언급
  const fromText = extractFromPageText(crawlData.bodyText)
  if (fromText) return fromText

  // Stage 2b-1: DART 직원 수 있는 경우 (매출은 없고 직원만 있는 경우)
  if (dartInfo.found && dartInfo.employees) {
    return estimateFromEmployees(dartInfo.employees, dartInfo.indutyCode ?? '', 'dart')
  }

  // Stage 2b-2: 본문에서 직원 수 추출
  const employeesFromText = extractEmployeeCountFromText(crawlData.bodyText)
  if (employeesFromText) {
    return estimateFromEmployees(employeesFromText, dartInfo.indutyCode ?? '', 'page')
  }

  return null
}
