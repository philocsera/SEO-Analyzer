// SEO 체크리스트. 모든 항목은 공식 출처에 근거한다:
// - Lighthouse v12 SEO category audits (https://developer.chrome.com/docs/lighthouse/seo/)
// - Google Search Central documentation (https://developers.google.com/search/docs)
// - Naver 쇼핑검색 SEO 가이드 (스마트스토어 한정)
//
// 자의적 휴리스틱(본문 단어수, 내부 링크 개수, H1 1개, H2 2개+, nofollow 비율 등)은 제거됨.
// 출처가 모호한 항목을 다시 추가할 때는 반드시 공식 문서를 인용할 것.

import { SeoCheckItem, SeoStatus } from '@/types/analysis'
import type { CrawlData } from './parse'
import { SEO_THRESHOLDS as T } from '../seo-thresholds'

function check(
  label: string,
  condition: boolean,
  passVal: string,
  failVal: string,
  suggestion: string,
  warnCondition?: boolean,
  codeExample?: string
): SeoCheckItem {
  const status: SeoStatus = condition ? 'pass' : warnCondition ? 'warn' : 'fail'
  return {
    label,
    status,
    value: condition ? passVal : failVal,
    suggestion: condition ? undefined : suggestion,
    codeExample: condition ? undefined : codeExample,
  }
}

export function buildSeoChecklist(data: CrawlData): SeoCheckItem[] {
  // image-alt 비율 (Lighthouse: image-alt audit)
  const missingAltImages = data.images.filter((i) => !i.alt)
  const imagesWithoutAlt = missingAltImages.length
  const imgAltRatio =
    data.images.length > 0
      ? ((data.images.length - imagesWithoutAlt) / data.images.length) * 100
      : 100
  const firstMissingSrc = missingAltImages[0]?.src || ''
  const truncatedSrc = firstMissingSrc.length > 60
    ? firstMissingSrc.slice(0, 57) + '...'
    : firstMissingSrc

  // link-text 일반어 비율 (Lighthouse: link-text audit)
  const genericTextPct = data.linkStats.total > 0
    ? (data.linkStats.genericText / data.linkStats.total) * 100
    : 0

  // crawlable-anchors 누락 비율 (Lighthouse: crawlable-anchors audit)
  const missingHrefPct = data.linkStats.total > 0
    ? (data.linkStats.missingHref / data.linkStats.total) * 100
    : 0

  // structured-data Schema.org 코드 예시
  const orgName = data.organizationName || data.ogSiteName || data.title || '브랜드명'
  const orgUrl = data.url || 'https://example.com'
  const schemaJsonLd = [
    '<script type="application/ld+json">',
    '{',
    '  "@context": "https://schema.org",',
    '  "@type": "Organization",',
    `  "name": "${orgName}",`,
    `  "url": "${orgUrl}"${data.ogImage ? ',' : ''}`,
    ...(data.ogImage ? [`  "logo": "${data.ogImage}"`] : []),
    '}',
    '</script>',
  ].join('\n')

  return [
    // ── Lighthouse SEO audits ──────────────────────────────────────
    // Lighthouse audit: document-title
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/document-title/
    check(
      '페이지 제목',
      data.title.length > 0,
      `"${data.title}"`,
      '제목 없음',
      '검색엔진과 사용자가 페이지 주제를 식별할 수 있도록 <title> 요소를 작성하세요. (Lighthouse: document-title)',
      undefined,
      `<title>${orgName} - 페이지 제목</title>`,
    ),

    // Lighthouse audit: meta-description
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/meta-description/
    check(
      'Meta Description',
      data.metaDescription.length > 0,
      `${data.metaDescription.length}자 등록됨`,
      '없음',
      '<meta name="description"> 태그를 추가해 SERP 스니펫에 노출될 설명을 제공하세요. (Lighthouse: meta-description)',
      undefined,
      `<meta name="description" content="페이지를 한두 문장으로 요약하는 설명">`,
    ),

    // Lighthouse audit: viewport
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/viewport/
    check(
      'Viewport 메타',
      data.hasViewportMeta && !data.viewportContent.includes('user-scalable=no'),
      data.viewportContent || 'width=device-width, initial-scale=1',
      data.hasViewportMeta
        ? `${data.viewportContent} (user-scalable=no — 접근성 위반)`
        : '없음',
      data.hasViewportMeta
        ? 'user-scalable=no를 제거하세요. WCAG 1.4.4 (Resize text) 위반입니다.'
        : '<meta name="viewport"> 태그를 추가하세요. Google 모바일 퍼스트 인덱싱 필수. (Lighthouse: viewport)',
      data.hasViewportMeta,
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ),

    // Lighthouse audit: canonical
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/canonical/
    check(
      'Canonical 태그',
      !!data.canonical,
      data.canonical,
      '없음',
      '<link rel="canonical">을 추가해 중복 콘텐츠 시그널을 통합하세요. (Lighthouse: canonical)',
      undefined,
      `<link rel="canonical" href="${data.url}" />`,
    ),

    // Lighthouse audit: image-alt
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/image-alt/
    // Lighthouse는 100% 요구. 80%+ 는 warn으로 완화 적용.
    check(
      '이미지 alt 속성',
      imgAltRatio >= T.imgAltRatio.passPct,
      `${data.images.length}개 모두 등록`,
      `${imagesWithoutAlt}개 누락 (${Math.round(imgAltRatio)}%) — 예: ${truncatedSrc || '(src 없음)'}`,
      '모든 <img> 요소에 alt 속성을 추가하세요. 장식용 이미지는 빈 alt(alt="")로 명시. (Lighthouse: image-alt)',
      imgAltRatio >= T.imgAltRatio.warnPct,
    ),

    // Lighthouse audit: is-crawlable
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/is-crawlable/
    check(
      '검색엔진 색인 허용',
      !data.metaRobotsNoindex,
      '색인 가능',
      `<meta name="robots" content="${data.robots}"> — 색인 차단됨`,
      'robots 메타에서 noindex/none을 제거하세요. 검색 결과에 노출되지 않습니다. (Lighthouse: is-crawlable)',
    ),

    // Lighthouse audit: robots-txt (existence + valid)
    // 우리는 200 응답 여부만 확인 (구문 검증은 미구현)
    check(
      'robots.txt',
      data.hasRobotsTxt,
      '존재함',
      '없음',
      `사이트 루트(${new URL(data.url).origin}/robots.txt)에 파일을 생성하세요. 크롤러가 접근 정책과 sitemap 위치를 인식합니다. (Lighthouse: robots-txt)`,
      undefined,
      `User-agent: *\nAllow: /\n\nSitemap: ${new URL(data.url).origin}/sitemap.xml`,
    ),

    // Lighthouse audit: link-text
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/link-text/
    check(
      '의미 있는 링크 텍스트',
      genericTextPct < T.genericLinkText.warnMaxPct,
      data.linkStats.total === 0
        ? '링크 없음'
        : `${data.linkStats.total}개 중 일반어 ${data.linkStats.genericText}개 (${genericTextPct.toFixed(1)}%)`,
      `"여기/click here/더보기" 등 일반어 링크 ${data.linkStats.genericText}개 (${genericTextPct.toFixed(1)}%)`,
      '링크 텍스트가 목적지의 내용을 설명하도록 작성하세요. "여기"·"click here" 같은 일반 표현은 SEO·접근성에 모두 불리합니다. (Lighthouse: link-text)',
      genericTextPct < T.genericLinkText.failMaxPct,
    ),

    // Lighthouse audit: crawlable-anchors
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/crawlable-anchors/
    check(
      '크롤 가능한 앵커',
      missingHrefPct < T.nonCrawlableAnchor.warnMaxPct,
      data.linkStats.total === 0
        ? '링크 없음'
        : `${data.linkStats.total}개 중 ${data.linkStats.missingHref}개 (${missingHrefPct.toFixed(1)}%) 누락`,
      `${data.linkStats.missingHref}개 (${missingHrefPct.toFixed(1)}%)가 href 속성 없음 또는 javascript: 핸들러`,
      '<a> 요소는 유효한 URL을 가리키는 href 속성을 가져야 합니다. JS onclick으로만 동작하는 링크는 크롤러가 따라가지 못합니다. (Lighthouse: crawlable-anchors)',
      missingHrefPct < T.nonCrawlableAnchor.failMaxPct,
    ),

    // Lighthouse audit: plugins
    // 출처: https://developer.chrome.com/docs/lighthouse/seo/plugins/
    check(
      '플러그인 미사용',
      !data.pluginsDetected,
      '없음',
      'Flash/Silverlight/Applet 등 사용 감지',
      'Flash, Silverlight, Java Applet은 모바일과 검색엔진에서 지원되지 않습니다. HTML5/CSS/JS로 대체하세요. (Lighthouse: plugins)',
    ),

    // ── Google Search Central 권장사항 ──────────────────────────────
    // 출처: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
    check(
      'HTTPS 보안',
      data.isHttps,
      'HTTPS 적용됨',
      'HTTP (미보안)',
      'SSL 인증서를 설치하고 HTTPS로 전환하세요. Google이 2014년부터 명시한 랭킹 시그널입니다.',
    ),

    // 출처: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
    check(
      'sitemap.xml',
      data.hasSitemap,
      '존재함',
      '없음',
      `사이트 루트(${new URL(data.url).origin}/sitemap.xml)에 사이트맵을 생성하고 Search Console에 등록하세요. 인덱싱 속도가 향상됩니다.`,
      undefined,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${new URL(data.url).origin}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`,
    ),

    // 출처: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
    check(
      '구조화 데이터 (Schema.org)',
      data.structuredData,
      '적용됨',
      '없음',
      'JSON-LD 형식으로 Schema.org 마크업을 추가하세요. 검색 결과 리치 스니펫(평점·이미지·FAQ 등)의 사전 조건입니다.',
      undefined,
      schemaJsonLd,
    ),
  ]
}

// ──────────────────────────────────────────────────────────────────
// 스마트스토어 체크리스트 (Naver 쇼핑검색 SEO 가이드 + C-rank 알고리즘 기반)
// ──────────────────────────────────────────────────────────────────
// 자의적 휴리스틱(상품명 길이, 키워드 평균 개수, 키워드 다양성 등)은 제거됨.
// 모든 항목은 Naver 공식 가이드에 근거한다.

// Naver 공식 — 키워드 나열 패턴: 같은 단어 반복 또는 과도한 구분자 사용
function isKeywordStuffed(name: string): boolean {
  // 패턴 A: 의미 있는 단어(2자+) 중 하나가 3회 이상 반복
  const words = name.split(/[\s\-_/|,()[\]]+/).filter((w) => w.length >= 2)
  const counts: Record<string, number> = {}
  for (const w of words) counts[w] = (counts[w] || 0) + 1
  if (Object.values(counts).some((c) => c >= 3)) return true

  // 패턴 B: 콤마/슬래시/파이프 구분자가 5개 이상 — 키워드 나열 가능성
  const sepCount = (name.match(/[,|\/]/g) || []).length
  if (sepCount >= 5) return true

  return false
}

export function buildSmartStoreSeoChecklist(
  products: { name: string; price: string; keywords: string[]; brand?: string; category?: string }[],
  storeSlug: string,
): SeoCheckItem[] {
  if (!products.length) {
    return [{
      label: '상품 데이터',
      status: 'fail',
      value: '네이버 쇼핑에서 스토어 상품을 찾을 수 없습니다.',
      suggestion: '스토어가 네이버 쇼핑에 등록되어 있는지 확인하거나, 잠시 후 다시 시도해 주세요.',
    }]
  }

  const total = products.length
  const categoryRatio = products.filter((p) => p.category && p.category.length > 0).length / total * 100
  const priceRatio    = products.filter((p) => p.price && p.price !== '가격 없음').length / total * 100
  const brandRatio    = products.filter((p) => p.brand && p.brand.length > 0).length / total * 100
  const stuffedCount  = products.filter((p) => isKeywordStuffed(p.name)).length
  const stuffedRatio  = (stuffedCount / total) * 100

  // 카테고리 전문성 — 1차 카테고리 점유율
  const topCategoryCounts: Record<string, number> = {}
  for (const p of products) {
    const head = p.category?.split(' > ')[0]?.trim()
    if (head) topCategoryCounts[head] = (topCategoryCounts[head] || 0) + 1
  }
  const topCategoryShare = Object.values(topCategoryCounts).length
    ? (Math.max(...Object.values(topCategoryCounts)) / total) * 100
    : 0
  const topCategoryName = Object.entries(topCategoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '미분류'

  return [
    // 출처: Naver 쇼핑검색 SEO 가이드 — "카테고리 누락 상품은 검색 결과에 노출되지 않음"
    check(
      '카테고리 분류 등록',
      categoryRatio >= T.smartstoreCategoryRatio.passPct,
      `${total}개 모두 등록됨 (URL: smartstore.naver.com/${storeSlug})`,
      `${Math.round(categoryRatio)}% 등록됨 — 누락 상품은 노출 제외`,
      '모든 상품에 정확한 카테고리를 분류하세요. 카테고리가 없는 상품은 네이버 쇼핑 검색 결과에 노출되지 않습니다. (Naver 쇼핑검색 SEO 가이드)',
      categoryRatio >= T.smartstoreCategoryRatio.warnPct,
    ),

    // 출처: Naver 쇼핑검색 SEO 가이드 — "가격 미등록 시 가격 비교 노출 제외"
    check(
      '가격 정보 등록',
      priceRatio >= T.smartstorePriceRatio.passPct,
      `${Math.round(priceRatio)}% 등록됨`,
      `${Math.round(priceRatio)}% 등록됨 (${T.smartstorePriceRatio.passPct}% 이상 권장)`,
      '모든 상품에 명확한 판매가를 등록하세요. 가격이 없으면 네이버 쇼핑 가격 비교 노출에서 제외됩니다. (Naver 쇼핑검색 SEO 가이드)',
      priceRatio >= T.smartstorePriceRatio.warnPct,
    ),

    // 출처: Naver 쇼핑검색 SEO 가이드 — "브랜드 필터 노출 조건"
    check(
      '브랜드 정보 등록',
      brandRatio >= T.smartstoreBrandRatio.passPct,
      `${Math.round(brandRatio)}% 등록됨`,
      `${Math.round(brandRatio)}% 등록됨 (${T.smartstoreBrandRatio.passPct}% 이상 권장)`,
      '주요 상품에 브랜드/제조사 정보를 등록하세요. 네이버 쇼핑의 브랜드 필터 노출 조건이며 검색 신뢰도가 향상됩니다. (Naver 쇼핑검색 SEO 가이드)',
      brandRatio >= T.smartstoreBrandRatio.warnPct,
    ),

    // 출처: Naver C-rank 알고리즘 — "특정 카테고리 전문 스토어 우대"
    check(
      '카테고리 전문성',
      topCategoryShare >= T.smartstoreCategoryFocus.passPct,
      `"${topCategoryName}" ${Math.round(topCategoryShare)}% 집중`,
      `"${topCategoryName}" ${Math.round(topCategoryShare)}% (${T.smartstoreCategoryFocus.passPct}% 이상 권장)`,
      '한 카테고리에 60% 이상 집중된 스토어가 네이버 C-rank 알고리즘에서 전문성 시그널로 평가받아 노출에 유리합니다. 너무 산만하면 키워드 경쟁력이 분산됩니다. (Naver C-rank 알고리즘)',
      topCategoryShare >= T.smartstoreCategoryFocus.warnPct,
    ),

    // 출처: Naver 쇼핑검색 SEO 가이드 — "키워드 나열 금지 (노출 페널티)"
    check(
      '상품명 키워드 나열 미사용',
      stuffedRatio < T.smartstoreKeywordStuff.warnMaxPct,
      `${total}개 중 ${stuffedCount}개 의심 (${stuffedRatio.toFixed(1)}%)`,
      `${stuffedCount}개 (${stuffedRatio.toFixed(1)}%) 상품에서 키워드 나열 패턴 감지`,
      '상품명에 같은 단어를 반복하거나 콤마·슬래시로 키워드를 나열하지 마세요. 네이버는 이런 패턴을 어뷰징으로 판단해 검색 노출에 페널티를 부과합니다. (Naver 쇼핑검색 SEO 가이드)',
      stuffedRatio < T.smartstoreKeywordStuff.failMaxPct,
    ),
  ]
}
