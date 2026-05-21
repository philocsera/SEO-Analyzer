import { CruxData, CruxMetric } from '@/types/analysis'

const CRUX_API = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord'

interface CruxHistogramBin {
  start: number
  end?: number
  density: number
}

interface CruxApiMetric {
  histogram: CruxHistogramBin[]
  percentiles: { p75: number | string }
}

interface CruxApiResponse {
  record?: {
    metrics?: Record<string, CruxApiMetric>
    collectionPeriod?: {
      firstDate: { year: number; month: number; day: number }
      lastDate: { year: number; month: number; day: number }
    }
  }
  error?: { code: number; message: string }
}

function parseMetric(raw: CruxApiMetric | undefined): CruxMetric | undefined {
  if (!raw) return undefined

  const p75 = parseFloat(String(raw.percentiles.p75))
  if (isNaN(p75)) return undefined

  // histogram bins: [good, needs_improvement, poor]
  const [bin0, bin1, bin2] = raw.histogram
  const good = Math.round((bin0?.density ?? 0) * 100)
  const needsImprovement = Math.round((bin1?.density ?? 0) * 100)
  const poor = 100 - good - needsImprovement

  return { p75, good, needsImprovement, poor: Math.max(0, poor) }
}

function formatDate(d: { year: number; month: number; day: number }): string {
  return `${d.year}.${String(d.month).padStart(2, '0')}.${String(d.day).padStart(2, '0')}`
}

export async function fetchCruxData(url: string): Promise<CruxData | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!apiKey) return null

  const origin = new URL(url).origin

  try {
    const res = await fetch(`${CRUX_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin }),
      next: { revalidate: 3600 },
    })

    const data: CruxApiResponse = await res.json()

    // 404 = 해당 origin의 트래픽이 적어 CrUX 표본이 없음(정상, 조용히 미표시).
    // 그 외(403=API 비활성/키 권한, 400=잘못된 요청, 429 등)는 설정 문제이므로 로깅해
    // 운영자가 "왜 항상 데이터가 안 나오는지" 진단할 수 있게 한다.
    if (!res.ok || data.error) {
      if (res.status !== 404) {
        console.warn(
          `[CrUX] 호출 실패 (status=${res.status}): ${data.error?.message ?? '알 수 없는 오류'} — ` +
          `Chrome UX Report API 활성화 및 GOOGLE_PAGESPEED_API_KEY 권한을 확인하세요. (origin=${origin})`,
        )
      }
      return null
    }
    if (!data.record?.metrics) return null

    const m = data.record.metrics
    const period = data.record.collectionPeriod
    const collectionPeriod = period
      ? `${formatDate(period.firstDate)} ~ ${formatDate(period.lastDate)}`
      : ''

    const cls = parseMetric(m['cumulative_layout_shift'])
    // CLS p75는 소수점 값이므로 표시용으로 그대로 유지 (0.12 등)

    return {
      collectionPeriod,
      lcp: parseMetric(m['largest_contentful_paint']),
      fcp: parseMetric(m['first_contentful_paint']),
      inp: parseMetric(m['interaction_to_next_paint']),
      cls,
      ttfb: parseMetric(m['experimental_time_to_first_byte']),
    }
  } catch {
    return null
  }
}
