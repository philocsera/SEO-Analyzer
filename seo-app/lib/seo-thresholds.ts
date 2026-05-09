// SEO 체크리스트 임계치. 모든 값은 공식 문서·표준에 근거한다.
//
// 출처:
// - Lighthouse v12 SEO category: https://developer.chrome.com/docs/lighthouse/seo/
// - Google Search Central: https://developers.google.com/search/docs
// - Naver 쇼핑검색 SEO 가이드 (스마트스토어): https://help.sell.smartstore.naver.com/

export const SEO_THRESHOLDS = {
  // ── Lighthouse SEO 정통 항목 ────────────────────────────────────
  // 대부분 binary(존재/부재) 검사라 임계치 불필요. 비율 기반만 여기 정의.

  // image-alt: Lighthouse는 100% 요구. 80%로 완화는 실용적 절충
  imgAltRatio:        { passPct: 100, warnPct: 80 },

  // link-text: "click here", "여기" 등 일반어 비율. 5% 이상이면 경고
  // 출처: Lighthouse audit `link-text` (descriptive link text)
  genericLinkText:    { failMaxPct: 10, warnMaxPct: 5 },

  // crawlable-anchors: href 속성 누락 비율
  // 출처: Lighthouse audit `crawlable-anchors`
  nonCrawlableAnchor: { failMaxPct: 10, warnMaxPct: 5 },

  // ── 스마트스토어 (Naver 쇼핑검색 SEO 가이드 기반) ────────────────
  // 출처: Naver 쇼핑검색 SEO 가이드 + C-rank 알고리즘 공개 정보

  // 카테고리 등록률: Naver 공식 — 카테고리 누락 시 검색 노출에서 제외
  smartstoreCategoryRatio: { passPct: 100, warnPct: 90 },

  // 가격 등록률: Naver 공식 — 가격 미등록 시 가격 비교 노출 제외
  smartstorePriceRatio:    { passPct: 95, warnPct: 80 },

  // 브랜드 등록률: Naver 공식 — 브랜드 필터 노출 조건
  smartstoreBrandRatio:    { passPct: 60, warnPct: 30 },

  // 카테고리 전문성(집중도): Naver C-rank — 특정 카테고리 전문 스토어 우대
  smartstoreCategoryFocus: { passPct: 60, warnPct: 40 },

  // 키워드 나열 패턴: Naver 공식 — 키워드 나열 금지(노출 페널티)
  smartstoreKeywordStuff:  { failMaxPct: 20, warnMaxPct: 10 },
} as const
