import { BrandAwarenessScore } from '@/types/analysis'

const SNS_PATTERNS = [
  { name: 'Instagram',  re: /instagram\.com/i },
  { name: 'YouTube',    re: /youtube\.com|youtu\.be/i },
  { name: 'Twitter/X',  re: /twitter\.com|x\.com\/[a-zA-Z0-9_]{1,}/i },
  { name: '네이버블로그', re: /blog\.naver\.com/i },
  { name: '네이버포스트', re: /post\.naver\.com/i },
]

const PHONE_RE   = /01[0-9]-?\d{3,4}-?\d{4}|0[2-9][0-9]?-?\d{3,4}-?\d{4}/
const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
const ADDRESS_RE = /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/

interface SearchItem {
  title: string
  link: string
  description: string
}

async function naverSearch(
  query: string,
  type: 'webkr' | 'blog',
  clientId: string,
  clientSecret: string,
  display = 10,
): Promise<SearchItem[]> {
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}`,
      {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []) as SearchItem[]
  } catch {
    return []
  }
}

async function naverImageCount(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<number> {
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/image.json?query=${encodeURIComponent(query)}&display=5`,
      {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return 0
    const data = await res.json()
    return (data.items ?? []).length
  } catch {
    return 0
  }
}

function itemsToText(items: SearchItem[]): string {
  return items.map(i => `${i.link} ${i.title} ${i.description}`).join(' ')
}

/**
 * 크롤링 없이 Naver 검색/이미지 API로 수집 가능한 브랜드 인지도 신호를 반환한다.
 *
 * 측정 방법:
 * - SNS 채널    : 웹/블로그 검색 결과에서 각 플랫폼 URL 패턴 탐지 (Instagram, YouTube, X 등)
 * - 로고        : Naver 이미지 검색("{brandName} 로고")으로 브랜드 이미지 존재 여부 확인
 * - About 페이지 : 웹 검색 결과 링크/제목에서 소개·about 패턴 탐지
 * - 연락처      : 웹/블로그 검색 결과에서 전화·이메일·지역명 탐지
 * - HTTPS       : URL에서 직접 판단
 * - OG 태그     : 공식 외부 웹사이트 존재 여부를 프록시로 사용
 * - Twitter Card: Twitter/X 계정 탐지를 프록시로 사용
 * - Organization Schema: HTML 없이 측정 불가 → 0점
 */
export async function buildBrandAwarenessFromSearch(
  normalizedUrl: string,
  brandName: string,
  clientId: string,
  clientSecret: string,
): Promise<BrandAwarenessScore> {
  const isHttps = normalizedUrl.startsWith('https')
  const httpsScore = isHttps ? 10 : 0

  // 4개 검색을 병렬 실행
  const [snsWebItems, blogItems, aboutWebItems, logoCount] = await Promise.all([
    // (1) SNS/공식 계정 탐지: 각 플랫폼명 포함한 넓은 쿼리
    naverSearch(
      `${brandName} 인스타그램 유튜브 트위터 X 페이스북 카카오 채널 공식`,
      'webkr', clientId, clientSecret, 10
    ),
    // (2) 블로그 후기: SNS 링크, 연락처, 지역 정보 포함 가능성 높음
    naverSearch(brandName, 'blog', clientId, clientSecret, 10),
    // (3) 소개/연락처 전용 쿼리: about 페이지·연락처 탐지
    naverSearch(
      `${brandName} 소개 회사 연락처 이메일 전화번호`,
      'webkr', clientId, clientSecret, 10
    ),
    // (4) 이미지 검색: 브랜드 로고 존재 여부
    naverImageCount(`${brandName} 로고`, clientId, clientSecret),
  ])

  const snsText     = itemsToText(snsWebItems)
  const blogText    = itemsToText(blogItems)
  const aboutText   = itemsToText(aboutWebItems)
  const combined    = snsText + ' ' + blogText + ' ' + aboutText

  // ── SNS 채널 탐지 ────────────────────────────────────────────
  const foundPlatforms = SNS_PATTERNS
    .filter(p => p.re.test(combined))
    .map(p => p.name)
  const snsScore = Math.min(foundPlatforms.length * 10, 30)

  // ── 로고: Naver 이미지 검색 결과 존재 여부 ───────────────────
  const hasLogo  = logoCount > 0
  const logoScore = hasLogo ? 20 : 0

  // ── About 페이지: 링크/제목에서 소개·about 패턴 ─────────────
  const ABOUT_LINK_RE  = /\/about|\/company|\/introduce|about\.html|소개|brand-story/i
  const ABOUT_TITLE_RE = /회사\s*소개|브랜드\s*소개|브랜드\s*스토리|about\s*us/i
  const hasAbout = [...snsWebItems, ...aboutWebItems].some(
    r => ABOUT_LINK_RE.test(r.link) || ABOUT_TITLE_RE.test(r.title)
  )
  const aboutScore = hasAbout ? 30 : 0

  // ── 연락처: 전화·이메일·지역명 탐지 ─────────────────────────
  const hasContact =
    PHONE_RE.test(combined) || EMAIL_RE.test(combined) || ADDRESS_RE.test(combined)
  const contactScore = hasContact ? 20 : 0

  const score = snsScore + aboutScore + logoScore + contactScore

  return {
    score,
    details: {
      snsPresence: { score: snsScore,    platforms: foundPlatforms },
      aboutPage:   { score: aboutScore,  detected: hasAbout },
      logo:        { score: logoScore,   detected: hasLogo },
      contactInfo: { score: contactScore,detected: hasContact },
    },
  }
}
