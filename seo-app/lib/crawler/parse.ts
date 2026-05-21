import * as cheerio from 'cheerio'
import { fetchHtml } from './fetch-html'
import { safeFetch } from '../safe-fetch'

export interface CrawlData {
  title: string
  metaDescription: string
  metaKeywords: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  canonical: string
  robots: string
  h1s: string[]
  h2s: string[]
  h3s: string[]
  images: { src: string; alt: string }[]
  internalLinks: number
  externalLinks: number
  nofollowLinks: number
  hasRobotsTxt: boolean
  hasSitemap: boolean
  isHttps: boolean
  hasViewportMeta: boolean
  viewportContent: string
  wordCount: number
  structuredData: boolean
  hreflang: boolean
  bodyText: string
  url: string
  // language (Lighthouse hreflang audit context)
  lang: string
  // Lighthouse `is-crawlable` audit
  metaRobotsNoindex: boolean
  // Lighthouse `plugins` audit (Flash, Silverlight, applet)
  pluginsDetected: boolean
  // Lighthouse `link-text` + `crawlable-anchors` audits
  linkStats: {
    total: number
    genericText: number    // "click here", "여기", "더보기" 등
    missingHref: number    // <a> with no href / href="#" / javascript:
  }
  // brand awareness signals
  snsLinks: string[]
  hasAboutPage: boolean
  hasLogo: boolean
  hasContactInfo: boolean
  hasOrganizationSchema: boolean
  hasTwitterCard: boolean
  // company name signals for DART lookup
  ogSiteName: string
  organizationName: string
}

// Lighthouse `link-text` audit의 영문 블랙리스트 + 한국어 일반 표현.
// 출처: https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/seo/link-text.js
const GENERIC_LINK_TEXTS = new Set([
  'click here', 'click this', 'click', 'go', 'here', 'this', 'start',
  'right here', 'more', 'learn more', 'tap here', 'read more',
  '여기', '더보기', '자세히', '자세히 보기', '클릭', '이동', '바로가기', '확인', '보기',
])

export async function crawlUrl(url: string): Promise<CrawlData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const origin = new URL(normalizedUrl).origin

  const html = await fetchHtml(normalizedUrl)
  const $ = cheerio.load(html)

  const images = $('img')
    .map((_, el) => ({
      src: $(el).attr('src') || '',
      alt: $(el).attr('alt') || '',
    }))
    .get()

  const links = $('a[href]').get()
  let internal = 0,
    external = 0,
    nofollow = 0
  links.forEach((el) => {
    const href = $(el).attr('href') || ''
    const rel = $(el).attr('rel') || ''
    if (rel.includes('nofollow')) nofollow++
    if (href.startsWith('/') || href.startsWith(origin)) internal++
    else if (href.startsWith('http')) external++
  })

  // Lighthouse link-text + crawlable-anchors signals
  const allAnchors = $('a').get()
  let genericText = 0
  let missingHref = 0
  for (const el of allAnchors) {
    const $a = $(el)
    const href = ($a.attr('href') || '').trim()
    const text = $a.text().replace(/\s+/g, ' ').trim().toLowerCase()

    if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) {
      missingHref++
    }
    if (text && GENERIC_LINK_TEXTS.has(text)) {
      genericText++
    }
  }
  const linkStats = { total: allAnchors.length, genericText, missingHref }

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length

  const [robotsRes, sitemapRes] = await Promise.allSettled([
    safeFetch(`${origin}/robots.txt`),
    safeFetch(`${origin}/sitemap.xml`),
  ])

  const hasRobotsTxt =
    robotsRes.status === 'fulfilled' && robotsRes.value.ok
  const hasSitemap =
    sitemapRes.status === 'fulfilled' && sitemapRes.value.ok

  // ── 브랜드 인지도 신호 수집 ────────────────────────────────────
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || ''
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || ''
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || ''

  const allHrefs = $('a[href]')
    .map((_, el) => $(el).attr('href') || '')
    .get()

  const SNS_PATTERNS = [
    { name: 'Instagram',  re: /instagram\.com/i },
    { name: 'YouTube',    re: /youtube\.com|youtu\.be/i },
    { name: 'Twitter/X',  re: /twitter\.com|x\.com/i },
    { name: '네이버블로그', re: /blog\.naver\.com/i },
    { name: '네이버포스트', re: /post\.naver\.com/i },
  ]
  const snsLinks = SNS_PATTERNS
    .filter((p) => allHrefs.some((href) => p.re.test(href)))
    .map((p) => p.name)

  const ABOUT_URL_PATTERNS = ['/about', '/company', '/introduce', 'about.html', 'company.html']
  const ABOUT_TEXT_KEYWORDS = ['회사소개', '소개', '브랜드스토리', '브랜드 스토리', 'about us']
  const hasAboutPage =
    allHrefs.some((href) =>
      ABOUT_URL_PATTERNS.some((p) => href.toLowerCase().includes(p))
    ) ||
    $('a')
      .filter((_, el) => {
        const text = $(el).text().toLowerCase()
        return ABOUT_TEXT_KEYWORDS.some((k) => text.includes(k))
      })
      .length > 0

  const hasLogo =
    $('img')
      .filter((_, el) => {
        const $el = $(el)
        const src = ($el.attr('src') || '').toLowerCase()
        const alt = ($el.attr('alt') || '').toLowerCase()
        const cls = ($el.attr('class') || '').toLowerCase()
        const id  = ($el.attr('id')    || '').toLowerCase()
        return (
          src.includes('logo') ||
          alt.includes('logo') ||
          alt.includes('로고') ||
          cls.includes('logo') ||
          id.includes('logo') ||
          $el.closest('[class*="logo"],[id*="logo"]').length > 0
        )
      })
      .length > 0 ||
    $('[class*="logo"],[id*="logo"]').length > 0 ||  // CSS 배경 이미지 로고
    !!ogImage

  const PHONE_RE = /01[0-9]-?\d{3,4}-?\d{4}|0[2-9][0-9]?-?\d{3,4}-?\d{4}/
  const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
  const ADDRESS_RE = /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/
  const hasContactInfo =
    PHONE_RE.test(bodyText) ||
    EMAIL_RE.test(bodyText) ||
    ADDRESS_RE.test(bodyText)

  const ogSiteName = $('meta[property="og:site-name"], meta[property="og:site_name"]').attr('content')?.trim() || ''

  let hasOrganizationSchema = false
  let organizationName = ''
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}')
      const type = (json['@type'] || '') as string
      if (/(Organization|LocalBusiness|Corporation|Store)/i.test(type)) {
        hasOrganizationSchema = true
        if (json.name && !organizationName) organizationName = String(json.name).trim()
      }
    } catch {
      // ignore invalid JSON-LD
    }
  })

  const hasTwitterCard = $('meta[name="twitter:card"]').length > 0

  const viewportContent = $('meta[name="viewport"]').attr('content')?.trim() || ''

  // Lighthouse `is-crawlable`: noindex / none directive 검출
  const robotsContent = $('meta[name="robots"]').attr('content') || ''
  const metaRobotsNoindex = /\b(noindex|none)\b/i.test(robotsContent)

  // Lighthouse `plugins`: Flash/Silverlight/applet. video/audio·iframe 제외
  const pluginsDetected =
    $('embed').length > 0 ||
    $('applet').length > 0 ||
    $('object').filter((_, el) => {
      const type = ($(el).attr('type') || '').toLowerCase()
      // PDF 등 일반 object 태그는 허용. Flash/Silverlight 명시적 차단
      return type.includes('flash') || type.includes('silverlight') ||
             type.includes('shockwave') || type === ''
    }).length > 0

  const lang = $('html').attr('lang')?.trim() || ''

  return {
    url: normalizedUrl,
    title: $('title').text().trim(),
    metaDescription:
      $('meta[name="description"]').attr('content')?.trim() || '',
    metaKeywords: $('meta[name="keywords"]').attr('content')?.trim() || '',
    ogTitle,
    ogDescription,
    ogImage,
    canonical: $('link[rel="canonical"]').attr('href')?.trim() || '',
    robots: $('meta[name="robots"]').attr('content')?.trim() || '',
    h1s: $('h1')
      .map((_, el) => $(el).text().trim())
      .get(),
    h2s: $('h2')
      .map((_, el) => $(el).text().trim())
      .get(),
    h3s: $('h3')
      .map((_, el) => $(el).text().trim())
      .get(),
    images,
    internalLinks: internal,
    externalLinks: external,
    nofollowLinks: nofollow,
    hasRobotsTxt,
    hasSitemap,
    isHttps: normalizedUrl.startsWith('https'),
    hasViewportMeta: viewportContent.length > 0,
    viewportContent,
    wordCount,
    structuredData: $('script[type="application/ld+json"]').length > 0,
    hreflang: $('link[rel="alternate"][hreflang]').length > 0,
    bodyText: bodyText.slice(0, 3000),
    lang,
    metaRobotsNoindex,
    pluginsDetected,
    linkStats,
    snsLinks,
    hasAboutPage,
    hasLogo,
    hasContactInfo,
    hasOrganizationSchema,
    hasTwitterCard,
    ogSiteName,
    organizationName,
  }
}
