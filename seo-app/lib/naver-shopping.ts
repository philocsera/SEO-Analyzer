import { SmartStoreProduct } from '@/types/analysis'

const log = (msg: string) => {
  if (process.env.DEBUG_NAVER) console.log(msg)
}

interface NaverShopItem {
  title: string
  link: string
  image: string
  lprice: string
  hprice: string
  mallName: string
  productId: string
  maker: string
  brand: string
  category1: string
  category2: string
  category3: string
}

interface NaverShopResponse {
  total: number
  items: NaverShopItem[]
}

interface NaverWebItem {
  title: string
  link: string
  description: string
}

interface NaverWebResponse {
  total: number
  items: NaverWebItem[]
}

const BIG_MARKETPLACES = new Set([
  '옥션', 'G마켓', '11번가', '쿠팡', '위메프', '티몬', 'GS SHOP', '롯데ON',
  'SSG닷컴', '인터파크', '스마일클럽', 'AK몰', '현대H몰', 'CJ온스타일',
])

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function inferStoreName(items: NaverShopItem[], fallback: string): string {
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (!BIG_MARKETPLACES.has(item.mallName)) {
      counts[item.mallName] = (counts[item.mallName] || 0) + 1
    }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : fallback
}

function extractKeywords(text: string): string[] {
  const stopwords = ['및', '의', '를', '이', '가', '은', '는', '에', '로', '으로', '을', '와', '과', '세트', '상품', '정품']
  return [...new Set(
    text.split(/[\s,\-\/\[\]\(\)\+_]+/)
      .filter((w) => w.length >= 2 && !stopwords.includes(w))
  )].slice(0, 8)
}

async function fetchNaverShopItems(
  query: string,
  clientId: string,
  clientSecret: string,
  display = 100,
): Promise<NaverShopItem[]> {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`,
    {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      next: { revalidate: 0 },
    }
  )
  if (!res.ok) throw new Error(`Naver API 오류: HTTP ${res.status}`)
  const data: NaverShopResponse = await res.json()
  return data.items
}

/**
 * Naver 웹 검색 API로 스토어 URL을 검색해 실제 스토어명을 취득한다.
 */
async function resolveStoreNameViaWebSearch(
  storeSlug: string,
  isBrandStore: boolean,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const storeUrl = isBrandStore
    ? `brand.naver.com/${storeSlug}`
    : `smartstore.naver.com/${storeSlug}`
  const slugLower = storeSlug.toLowerCase()

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(storeUrl)}&display=5`,
      {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null

    const data: NaverWebResponse = await res.json()
    if (!data.items?.length) return null

    // 링크 또는 설명에 slug가 포함된 항목만 사용 (무관한 첫 항목 fallback 금지)
    // — 엉뚱한 검색 1순위 결과로 스토어명 오염되는 사고 방지
    const matchingItem = data.items.find(item =>
      item.link.toLowerCase().includes(slugLower) ||
      stripHtml(item.description).toLowerCase().includes(slugLower)
    )
    if (!matchingItem) return null

    // 제목에서 스토어명 추출 (괄호·콜론·파이프 이전 부분)
    const name = stripHtml(matchingItem.title).split(/\s*[(|:]\s*/)[0].trim()
    if (!name || name.toLowerCase() === slugLower || name.length < 2) return null

    return name
  } catch {
    return null
  }
}

/**
 * Naver 블로그 검색으로 슬러그 관련 리뷰/후기에서 스토어명을 추출한다.
 * 웹 검색으로 찾지 못했을 때 사용하는 폴백.
 */
async function resolveStoreNameViaBlogSearch(
  storeSlug: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(storeSlug)}&display=10`,
      {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null
    const data: NaverWebResponse = await res.json()
    if (!data.items?.length) return null

    // 블로그 제목에서 첫 번째 한국어 단어를 스토어명 후보로 수집
    const candidates: string[] = []
    for (const item of data.items) {
      const clean = stripHtml(item.title)
      const parts = clean.split(/[\s,\[\]()·\-]+/)
      for (const part of parts) {
        if (/^[가-힣]{2,8}$/.test(part)) {
          candidates.push(part)
          break
        }
      }
    }
    if (!candidates.length) return null

    // 빈도순 정렬
    const freq: Record<string, number> = {}
    for (const c of candidates) freq[c] = (freq[c] || 0) + 1
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)

    // 상위 후보를 쇼핑 API로 검색해서 실제 상품이 있는 키워드를 반환
    for (const name of sorted.slice(0, 3)) {
      const items = await fetchNaverShopItems(name, clientId, clientSecret)
      if (items.some(i => !BIG_MARKETPLACES.has(i.mallName))) {
        return name
      }
    }
    return sorted[0] || null
  } catch {
    return null
  }
}

// 1단계: 공식 검색 API로만 실제 스토어명을 취득 (slug 검색은 무관한 상품을 반환할 수 있음).
// 웹검색 → 블로그검색 순서. 모바일 페이지 직접 호출은 robots.txt 위반이라 사용하지 않음.
async function resolveStoreName(
  storeSlug: string,
  isBrandStore: boolean,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const fromWeb = await resolveStoreNameViaWebSearch(storeSlug, isBrandStore, clientId, clientSecret)
  log(`[Naver] 웹검색 스토어명: "${fromWeb}"`)
  if (fromWeb) return fromWeb

  const fromBlog = await resolveStoreNameViaBlogSearch(storeSlug, clientId, clientSecret)
  log(`[Naver] 블로그검색 스토어명: "${fromBlog}"`)
  return fromBlog
}

// 2단계: 결정된 스토어명으로 쇼핑 API에서 상품 목록을 가져온다. mallName 정확 매칭 우선.
async function fetchStoreItems(
  resolvedName: string | null,
  storeSlug: string,
  isBrandStore: boolean,
  clientId: string,
  clientSecret: string,
): Promise<{ storeName: string; storeItems: NaverShopItem[] }> {
  if (resolvedName) {
    const nameItems = await fetchNaverShopItems(resolvedName, clientId, clientSecret, 100)
    log(`[Naver] 스토어명 "${resolvedName}" 검색결과: ${nameItems.length}개`)

    const exactItems = nameItems.filter(i => i.mallName === resolvedName)
    let storeItems = exactItems.length > 0 ? exactItems : nameItems

    // 스토어명 검색으로도 상품이 없으면 slug로 fallback
    if (storeItems.length === 0) {
      const slugItems = await fetchNaverShopItems(storeSlug, clientId, clientSecret, 100)
      log(`[Naver] slug "${storeSlug}" fallback 검색결과: ${slugItems.length}개`)
      const fallbackName = inferStoreName(slugItems, storeSlug)
      storeItems = slugItems.filter(i => i.mallName === fallbackName)
      if (storeItems.length === 0) storeItems = slugItems
      return { storeName: fallbackName, storeItems }
    }
    return { storeName: resolvedName, storeItems }
  }

  // 이름 취득 실패 → slug로 검색 후 mallName 빈도 추론
  const slugItems = await fetchNaverShopItems(storeSlug, clientId, clientSecret, 100)
  log(`[Naver] slug "${storeSlug}" 검색결과: ${slugItems.length}개`)

  const inferredName = inferStoreName(slugItems, storeSlug)
  log(`[Naver] 추론된 스토어명: "${inferredName}"`)

  // "네이버" = 카탈로그 상품 → 한 번 더 이름 취득 시도 (공식 검색 API만)
  if (inferredName === '네이버') {
    const nameFromCatalog =
      await resolveStoreNameViaWebSearch(storeSlug, isBrandStore, clientId, clientSecret) ??
      await resolveStoreNameViaBlogSearch(storeSlug, clientId, clientSecret)
    log(`[Naver] 카탈로그 상품 감지, 실제 스토어명: "${nameFromCatalog}"`)
    if (nameFromCatalog) {
      const nameItems = await fetchNaverShopItems(nameFromCatalog, clientId, clientSecret, 100)
      const exactItems = nameItems.filter(i => i.mallName === nameFromCatalog)
      const storeItems = exactItems.length > 0 ? exactItems : nameItems.length > 0 ? nameItems : slugItems
      return { storeName: nameFromCatalog, storeItems }
    }
    return { storeName: storeSlug, storeItems: slugItems }
  }

  const storeItems = slugItems.filter(i => i.mallName === inferredName)
  return {
    storeName: inferredName,
    storeItems: storeItems.length > 0 ? storeItems : slugItems,
  }
}

// 3단계: NaverShopItem → SmartStoreProduct 매핑.
function mapToSmartStoreProduct(item: NaverShopItem): SmartStoreProduct {
  const name = stripHtml(item.title)
  const price = item.lprice ? `${parseInt(item.lprice).toLocaleString()}원` : '가격 없음'
  const keywords = extractKeywords(name)
  const category = [item.category1, item.category2, item.category3].filter(Boolean).join(' > ')

  return {
    name,
    price,
    originalPrice: item.hprice ? `${parseInt(item.hprice).toLocaleString()}원` : undefined,
    keywords,
    brand: item.brand?.trim() || undefined,
    category: category || undefined,
    imageUrl: item.image || undefined,
  }
}

export async function fetchStoreProducts(storeSlug: string, isBrandStore = false): Promise<{
  storeName: string
  products: SmartStoreProduct[]
  categories: string[]
}> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.')
  }

  const resolvedName = await resolveStoreName(storeSlug, isBrandStore, clientId, clientSecret)
  const { storeName, storeItems } = await fetchStoreItems(
    resolvedName, storeSlug, isBrandStore, clientId, clientSecret,
  )

  log(`[Naver] 최종 스토어명: "${storeName}", 상품: ${storeItems.length}개`)

  const products = storeItems.map(mapToSmartStoreProduct)

  const categories = [...new Set(
    storeItems
      .flatMap((i) => [i.category1, i.category2, i.category3])
      .filter(Boolean)
  )].slice(0, 5)

  return { storeName, products, categories }
}
