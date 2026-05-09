import crypto from 'crypto'

interface KeywordStat {
  relKeyword: string
  monthlyPcQcCnt: string | number
  monthlyMobileQcCnt: string | number
  compIdx: string  // '높음' | '중간' | '낮음'
}

function makeHeaders(method: string, path: string): Record<string, string> {
  const apiKey = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID
  if (!apiKey || !secretKey || !customerId) throw new Error('Naver Ad API credentials not set')

  const timestamp = Date.now()
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}.${method}.${path}`)
    .digest('base64')

  return {
    'X-Timestamp': String(timestamp),
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature,
  }
}

function toNum(v: string | number): number {
  return typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, '')) || 0
}

async function queryKeywordList(hint: string): Promise<KeywordStat[]> {
  const path = '/keywordstool'
  const params = new URLSearchParams({ hintKeywords: hint, showDetail: '1' })
  const res = await fetch(`https://api.searchad.naver.com${path}?${params}`, {
    headers: makeHeaders('GET', path),
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    console.error(`[naver-ad] ${hint}: HTTP ${res.status}`)
    return []
  }
  const data = await res.json()
  return data.keywordList ?? []
}

function pickStat(list: KeywordStat[], keyword: string): KeywordStat | null {
  if (!list.length) return null
  return (
    list.find(k => k.relKeyword === keyword) ??
    list.find(k => k.relKeyword.includes(keyword) || keyword.includes(k.relKeyword)) ??
    list[0]
  )
}

function toResult(stat: KeywordStat): { searchVolume: string; competition: string } {
  const total = toNum(stat.monthlyPcQcCnt) + toNum(stat.monthlyMobileQcCnt)
  return {
    searchVolume:
      total >= 100000 ? '매우 높음' :
      total >= 30000  ? '높음' :
      total >= 5000   ? '보통' :
      total >= 1000   ? '낮음' : '매우 낮음',
    competition:
      stat.compIdx === '높음' ? '높음' :
      stat.compIdx === '중간' ? '보통' : '낮음',
  }
}

async function fetchKeywordStat(
  keyword: string,
): Promise<{ searchVolume: string; competition: string } | null> {
  try {
    // 1차: 원본 키워드
    const list = await queryKeywordList(keyword)
    const stat = pickStat(list, keyword)
    if (process.env.DEBUG_NAVER) {
      console.log(`[naver-ad] "${keyword}" 1차: list=${list.length}, hit=${stat?.relKeyword ?? 'none'}`)
    }
    if (stat) return toResult(stat)

    // 2차: 복합 키워드일 경우 앞 2단어로 재시도
    const words = keyword.split(/\s+/).filter(w => w.length >= 2)
    if (words.length >= 2) {
      const twoWord = words.slice(0, 2).join(' ')
      const list2 = await queryKeywordList(twoWord)
      const stat2 = pickStat(list2, twoWord)
      if (stat2) return toResult(stat2)
    }

    // 3차: 첫 단어만
    if (words.length >= 1) {
      const list3 = await queryKeywordList(words[0])
      const stat3 = pickStat(list3, words[0])
      if (stat3) return toResult(stat3)
    }

    return null
  } catch {
    return null
  }
}

/**
 * 키워드 배열을 병렬로 조회해 Map<keyword, {searchVolume, competition}>을 반환한다.
 * NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID 미설정 시 빈 Map 반환.
 */
export async function getKeywordStats(
  keywords: string[],
): Promise<Map<string, { searchVolume: string; competition: string }>> {
  if (
    !process.env.NAVER_AD_API_KEY ||
    !process.env.NAVER_AD_SECRET_KEY ||
    !process.env.NAVER_AD_CUSTOMER_ID
  ) {
    return new Map()
  }

  const entries = await Promise.all(
    keywords.map(async (kw): Promise<[string, { searchVolume: string; competition: string } | null]> => [
      kw,
      await fetchKeywordStat(kw),
    ]),
  )

  return new Map(
    entries
      .filter((e): e is [string, { searchVolume: string; competition: string }] => e[1] !== null)
  )
}
