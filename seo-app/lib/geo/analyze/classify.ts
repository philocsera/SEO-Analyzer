import type { PageClassification, PageSignals } from "../types";

const ENCYCLOPEDIA_HOSTS = /(wikipedia\.org|britannica\.com|namu\.wiki|fandom\.com)/i;
const FORUM_HOSTS =
  /(reddit\.com|stackoverflow\.com|stackexchange\.com|discourse\.|quora\.com|news\.ycombinator\.com|clien\.net|dcinside\.com)/i;
const NEWS_HOSTS =
  /(nytimes|cnn|bbc|reuters|bloomberg|hani\.|chosun|joins|donga|press\.|yna\.co\.kr|hankyung\.|mk\.co\.kr)/i;
const BLOG_HOSTS =
  /(medium\.com|substack\.com|hashnode\.|dev\.to|velog\.io|tistory\.com|brunch\.|note\.com|qiita\.com)/i;

// 블로그 플랫폼의 루트 도메인 자체는 플랫폼 마케팅 사이트지 개별 블로그가 아님.
// 개별 블로그는 보통 subdomain 또는 path에 사용자명을 갖는다.
const BLOG_PLATFORM_ROOTS = new Set([
  "medium.com",
  "www.medium.com",
  "substack.com",
  "www.substack.com",
  "dev.to",
  "www.dev.to",
  "velog.io",
  "www.velog.io",
  "tistory.com",
  "www.tistory.com",
  "note.com",
  "www.note.com",
  "qiita.com",
  "www.qiita.com",
]);
const DOCS_HOSTS = /^(docs|developer|developers|api|help|support)\./i;

const MARKETING_PATH =
  /(^|\/)(pricing|plans?|features?|solutions?|use-cases?|customers?|case-studies?|why-[a-z0-9-]+|product|platform|services?)(\/|$)/i;
const COMMERCE_PATH =
  /(^|\/)(product|products|item|items|sku|p|cart|checkout|buy|shop|store|collections?|catalog)(\/|$)/i;

// i18n prefix: /ko, /en, /ja, /zh-CN, /ko-KR, /pt-BR 등
const I18N_PREFIX = /^\/([a-z]{2}(?:-[A-Za-z]{2,4})?)(\/|$)/i;

function stripLocalePrefix(path: string): string {
  const m = path.match(I18N_PREFIX);
  if (!m) return path;
  const stripped = path.slice(m[0].length - (m[2] === "/" ? 1 : 0));
  return stripped.length ? stripped : "/";
}

export function classifyPage(s: PageSignals): PageClassification {
  const url = s.finalUrl;
  let host = "";
  let rawPath = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    rawPath = u.pathname;
  } catch {
    return { category: "other", confidence: 0.2, reason: "URL 파싱 실패" };
  }
  // 로케일 prefix는 분류 판단에서 제거: /ko/pricing → /pricing, /ko → /
  const path = stripLocalePrefix(rawPath);

  if (ENCYCLOPEDIA_HOSTS.test(host)) {
    return { category: "encyclopedia", confidence: 0.95, reason: "백과사전 도메인" };
  }
  if (FORUM_HOSTS.test(host)) {
    return { category: "forum", confidence: 0.9, reason: "포럼/Q&A 도메인" };
  }
  if (s.jsonLdTypes.includes("NewsArticle") || NEWS_HOSTS.test(host) || /\/news\//.test(path)) {
    return { category: "news", confidence: 0.85, reason: "뉴스 도메인 또는 NewsArticle 스키마" };
  }
  if (
    DOCS_HOSTS.test(host) ||
    /(^|\/)(docs|documentation|reference|guide|api|manual)(\/|$)/.test(path) ||
    s.jsonLdTypes.includes("TechArticle") ||
    s.jsonLdTypes.includes("APIReference")
  ) {
    return { category: "docs", confidence: 0.85, reason: "URL/구조가 문서형" };
  }
  // 마케팅 경로(/pricing, /features 등)는 가격·비교표가 많아도 marketing이 맞음.
  // D2C commerce 추정보다 먼저 잡아야 Slack pricing 같은 케이스가 marketing으로 정확히 분류됨.
  if (MARKETING_PATH.test(path)) {
    return {
      category: "marketing",
      confidence: 0.85,
      reason: `마케팅 경로 (${path})`,
    };
  }
  if (
    s.jsonLdTypes.includes("Product") ||
    s.jsonLdTypes.includes("ItemList") ||
    s.jsonLdTypes.includes("Offer") ||
    s.jsonLdTypes.includes("ProductGroup") ||
    COMMERCE_PATH.test(path)
  ) {
    return { category: "commerce", confidence: 0.85, reason: "상품/커머스 페이지" };
  }
  // D2C 브랜드 루트도메인: 가격·비교표가 많고 testimonial이 적으면 commerce로 추정.
  if (s.priceMentions >= 5 && s.comparisonTables >= 3 && s.testimonials < 3) {
    return {
      category: "commerce",
      confidence: 0.7,
      reason: `D2C 추정 (가격 ${s.priceMentions}건, 비교 표 ${s.comparisonTables}개)`,
    };
  }
  const isBlogPlatformRoot = BLOG_PLATFORM_ROOTS.has(host.toLowerCase()) && (path === "/" || path === "");
  if (
    !isBlogPlatformRoot &&
    (BLOG_HOSTS.test(host) ||
      /(^|\/)(blog|posts?|articles?)(\/|$)/.test(path) ||
      s.jsonLdTypes.includes("BlogPosting"))
  ) {
    return { category: "blog", confidence: 0.75, reason: "블로그 도메인/URL" };
  }

  const marketingSignals = countMarketingSignals(s, path);
  if (marketingSignals.score >= 2) {
    return {
      category: "marketing",
      confidence: Math.min(0.9, 0.5 + marketingSignals.score * 0.1),
      reason: marketingSignals.reason,
    };
  }

  // 가격 표기가 매우 많으면 단독으로도 상업 페이지로 추정.
  // 콘텐츠 마켓플레이스(series.naver.com 등)는 메타·스키마 부실해도 가격 밀도로 잡힘.
  if (s.priceMentions >= 15) {
    const isListPath = /(^|\/)(list|category|search|catalog|browse|collections?)(\/|$)/i.test(path);
    return {
      category: isListPath || s.priceMentions >= 30 ? "commerce" : "marketing",
      confidence: 0.6,
      reason: `가격 표기 ${s.priceMentions}건이 본문에 밀집`,
    };
  }

  return { category: "other", confidence: 0.4, reason: "분류 단서 부족" };
}

function countMarketingSignals(
  s: PageSignals,
  path: string,
): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  if (MARKETING_PATH.test(path)) {
    score += 2;
    reasons.push("마케팅성 경로");
  }
  if (path === "/" || path === "") {
    score += 1;
    reasons.push("루트 도메인");
  }
  if (s.jsonLdTypes.includes("Organization") || s.jsonLdTypes.includes("WebSite")) {
    score += 1;
    reasons.push("Organization/WebSite 스키마");
  }
  // OG/Twitter 메타: SPA로 본문이 비어 있어도 분류가 가능하도록 표면 메타도 점수화.
  if (s.ogType === "website" || s.ogType === "product") {
    score += 1;
    reasons.push(`og:type=${s.ogType}`);
  }
  if (s.ogSiteName) {
    score += 1;
    reasons.push(`og:site_name=${s.ogSiteName}`);
  }
  if (s.twitterCard === "summary_large_image" || s.twitterCard === "summary") {
    score += 0.5;
  }
  if (s.priceMentions >= 1) {
    score += 1;
    reasons.push(`가격 표기 ${s.priceMentions}건`);
  }
  if (s.testimonials >= 1) {
    score += 1;
    reasons.push(`testimonial ${s.testimonials}건`);
  }
  if (s.ctaButtons >= 2) {
    score += 1;
    reasons.push(`CTA 버튼 ${s.ctaButtons}개`);
  }
  if (s.comparisonTables >= 1) {
    score += 1;
    reasons.push("기능 비교 표");
  }
  if (
    s.wordCount < 800 &&
    s.lists < 4 &&
    s.headings.filter((h) => h.level === 1).length >= 1
  ) {
    score += 1;
    reasons.push("짧은 본문 + 강한 H1");
  }

  return { score, reason: reasons.length ? reasons.join(", ") : "" };
}

export const CATEGORY_LABELS: Record<PageClassification["category"], string> = {
  docs: "기술 문서",
  blog: "블로그",
  marketing: "마케팅/랜딩",
  news: "뉴스",
  commerce: "커머스",
  encyclopedia: "백과사전",
  forum: "포럼/Q&A",
  other: "기타",
};
