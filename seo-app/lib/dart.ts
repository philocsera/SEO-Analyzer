import type { CrawlData } from './crawler'

const DART_BASE = 'https://opendart.fss.or.kr/api'

// 업종별 중소기업 기준 (중소기업기본법)
type IndustryType = 'manufacturing' | 'construction' | 'wholesale' | 'service'

const SME_THRESHOLDS: Record<IndustryType, { employees: number; revenue: number }> = {
  manufacturing: { employees: 300, revenue: 400 },
  construction: { employees: 300, revenue: 1000 },
  wholesale: { employees: 100, revenue: 1000 },
  service: { employees: 100, revenue: 200 },
}

export interface DartLookupResult {
  found: boolean
  corpName?: string
  employees?: number
  revenue?: number  // 억원 단위
  businessSize?: '소규모' | '중소기업' | '중견기업' | '대기업'
  basis?: string
  indutyCode?: string
}

// 페이지에서 회사명 추출 (우선순위순)
export function extractCompanyName(data: CrawlData): string {
  if (data.organizationName) return data.organizationName
  if (data.ogSiteName) return data.ogSiteName

  // footer 저작권 패턴: © 2024 회사명 / Copyright 2024 회사명
  const copyrightMatch = data.bodyText.match(
    /(?:©|copyright)\s*(?:\d{4}[-~]\s*\d{4}|\d{4})\s+([^.\n,·|]+)/i
  )
  if (copyrightMatch?.[1]) return copyrightMatch[1].trim()

  // 제목에서 추출: "페이지명 | 회사명" 또는 "회사명 - 페이지명"
  const titleParts = data.title.split(/\s*[|\-–—]\s*/)
  if (titleParts.length >= 2) {
    return titleParts.reduce((a, b) => (a.length <= b.length ? a : b)).trim()
  }

  return ''
}

function getIndustryType(indutyCode: string): IndustryType {
  const code = indutyCode.trim().toUpperCase()
  if (code.startsWith('C')) return 'manufacturing'
  if (code.startsWith('F')) return 'construction'
  if (code.startsWith('G')) return 'wholesale'
  return 'service'
}

function classifySize(
  employees: number | null,
  revenue: number | null,
  industryType: IndustryType
): { size: '소규모' | '중소기업' | '중견기업' | '대기업'; basis: string } {
  const thr = SME_THRESHOLDS[industryType]

  // 대기업: 직원 1000명 이상 또는 매출 5조(50000억) 이상
  if (employees !== null && employees >= 1000) {
    return { size: '대기업', basis: `직원 ${employees.toLocaleString()}명` }
  }
  if (revenue !== null && revenue >= 50000) {
    return { size: '대기업', basis: `매출 ${revenue.toLocaleString()}억원` }
  }

  // 중견기업: 중소기업 기준 초과 (자산 5조 미만 가정)
  const overByEmployees = employees !== null && employees >= thr.employees
  const overByRevenue = revenue !== null && revenue > thr.revenue
  if (overByEmployees || overByRevenue) {
    const basis = overByEmployees
      ? `직원 ${employees!.toLocaleString()}명 (${thr.employees}명 이상)`
      : `매출 ${revenue!.toLocaleString()}억원 (${thr.revenue}억 초과)`
    return { size: '중견기업', basis }
  }

  // 소규모: 직원 10명 미만 또는 매출 50억 미만
  if ((employees !== null && employees < 10) || (revenue !== null && revenue < 50)) {
    const basis = employees !== null ? `직원 ${employees}명` : `매출 ${revenue}억원`
    return { size: '소규모', basis }
  }

  const basis = employees !== null
    ? `직원 ${employees.toLocaleString()}명`
    : `매출 ${revenue!.toLocaleString()}억원`
  return { size: '중소기업', basis }
}

async function searchCorpCode(name: string): Promise<{ corpCode: string; corpName: string } | null> {
  const key = process.env.DART_API_KEY
  if (!key) return null

  const year = new Date().getFullYear()
  const url = new URL(`${DART_BASE}/list.json`)
  url.searchParams.set('crtfc_key', key)
  url.searchParams.set('corp_name', name)
  url.searchParams.set('bgn_de', `${year - 1}0101`)
  url.searchParams.set('end_de', `${year}1231`)
  url.searchParams.set('pblntf_ty', 'A')  // 정기공시만
  url.searchParams.set('page_count', '5')

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  const data = await res.json()

  if (data.status !== '000' || !data.list?.length) return null

  // 정확히 일치하는 법인명만 매칭. 부분 일치는 제외 — 무관한 회사로 잘못 매칭되어
  // 매출/직원수가 엉뚱하게 잡히는 사고를 방지.
  interface DartListItem { corp_code: string; corp_name: string }
  const list = data.list as DartListItem[]
  const exact = list.find(
    (item) =>
      item.corp_name === name ||
      item.corp_name === `${name}(주)` ||
      item.corp_name === `(주)${name}` ||
      item.corp_name === `주식회사 ${name}` ||
      item.corp_name === `${name} 주식회사`
  )
  if (!exact) return null

  return { corpCode: exact.corp_code, corpName: exact.corp_name }
}

async function getIndustryCode(corpCode: string): Promise<string> {
  const key = process.env.DART_API_KEY
  if (!key) return ''

  try {
    const url = `${DART_BASE}/company.json?crtfc_key=${key}&corp_code=${corpCode}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    return data.status === '000' ? (data.induty_code ?? '') : ''
  } catch {
    return ''
  }
}

async function getEmployeeCount(corpCode: string): Promise<number | null> {
  const key = process.env.DART_API_KEY
  if (!key) return null

  const currentYear = new Date().getFullYear()

  for (const year of [currentYear - 1, currentYear - 2]) {
    try {
      const url = `${DART_BASE}/empSttus.json?crtfc_key=${key}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`
      const res = await fetch(url, { next: { revalidate: 86400 } })
      const data = await res.json()

      if (data.status !== '000' || !data.list?.length) continue

      const toNum = (v: unknown) =>
        parseInt(String(v ?? '0').replace(/,/g, ''), 10) || 0

      let total = 0
      for (const item of data.list) {
        // 정규직(남+여) + 기간제(남+여) 기말인원 합산
        total += toNum(item.fo_bbm) + toNum(item.nm_bbm) + toNum(item.fo_ct) + toNum(item.nm_ct)
      }

      if (total > 0) return total
    } catch {
      continue
    }
  }

  return null
}

async function getRevenue(corpCode: string): Promise<number | null> {
  const key = process.env.DART_API_KEY
  if (!key) return null

  const currentYear = new Date().getFullYear()

  for (const year of [currentYear - 1, currentYear - 2]) {
    for (const fsDiv of ['CFS', 'OFS'] as const) {
      try {
        const url = `${DART_BASE}/fnlttSinglAcnt.json?crtfc_key=${key}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=${fsDiv}&sj_div=IS`
        const res = await fetch(url, { next: { revalidate: 86400 } })
        const data = await res.json()

        if (data.status !== '000' || !data.list?.length) continue

        interface DartFinanceItem { account_nm: string; thstrm_amount: string }
        const list = data.list as DartFinanceItem[]
        const revenueItem = list.find(
          (item) =>
            item.account_nm === '매출액' || item.account_nm === '수익(매출액)'
        )

        if (revenueItem?.thstrm_amount) {
          const won = parseInt(String(revenueItem.thstrm_amount).replace(/,/g, ''), 10) || 0
          const billion = Math.round(won / 100_000_000)
          if (billion > 0) return billion
        }
      } catch {
        continue
      }
    }
  }

  return null
}

export async function lookupBusinessSize(companyName: string): Promise<DartLookupResult> {
  if (!process.env.DART_API_KEY || !companyName.trim()) {
    return { found: false }
  }

  try {
    const corp = await searchCorpCode(companyName.trim())
    if (!corp) return { found: false }

    const [indutyCode, employees, revenue] = await Promise.all([
      getIndustryCode(corp.corpCode),
      getEmployeeCount(corp.corpCode),
      getRevenue(corp.corpCode),
    ])

    if (employees === null && revenue === null) {
      return { found: true, corpName: corp.corpName }
    }

    const industryType = getIndustryType(indutyCode)
    const { size, basis } = classifySize(employees, revenue, industryType)

    return {
      found: true,
      corpName: corp.corpName,
      employees: employees ?? undefined,
      revenue: revenue ?? undefined,
      businessSize: size,
      basis,
      indutyCode,
    }
  } catch {
    return { found: false }
  }
}
