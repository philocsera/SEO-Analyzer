import * as cheerio from "cheerio";
import type { PageSignals } from "../types";
import {
  splitSentences,
  isSelfContained,
  isDefinitional,
  hasStat,
  isLong,
  detectLang,
} from "./sentence";
import { extractNamedEntities, countVersionDateNumber } from "./entity";

const PAYWALL_HINTS = [
  /subscribe to (continue|read)/i,
  /sign in to read/i,
  /로그인 후 이용/i,
  /구독.{0,6}계속/i,
  /paywall/i,
  /class=["'][^"']*(paywall|subscribe-wall)/i,
];

export function parsePage(
  html: string,
  finalUrl: string,
  fetchInfo: { status: number; responseMs: number; bytes: number },
): PageSignals {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, template").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  const hasArticle = $("article").first().length > 0;
  const hasMain = $("main").first().length > 0;
  const mainEl = hasArticle
    ? $("article").first()
    : hasMain
    ? $("main").first()
    : $("body");

  // 본문 분석의 노이즈가 되는 chrome을 일관되게 제거.
  // article/main 안에도 nav/aside가 들어있는 경우(예: Wikipedia)가 있어 항상 제거.
  // footer/header는 body fallback에서만 제거 (article에 footer/header가 의도적으로 들어있을 수 있음).
  const cleanEl = mainEl.clone();
  cleanEl.find("nav, aside, [role='navigation'], [role='complementary'], [role='search']").remove();
  if (!hasArticle && !hasMain) {
    cleanEl.find("footer, header, [role='banner'], [role='contentinfo']").remove();
  }
  // 사이드바·메뉴·쿠키·툴바·TOC 같은 명시 클래스/ID는 항상 제거
  cleanEl
    .find(
      [
        '[class*="sidebar" i]',
        '[class*="menu" i]',
        '[class*="cookie" i]',
        '[class*="toolbar" i]',
        '[class*="breadcrumb" i]',
        '[id*="sidebar" i]',
        '[id*="toc" i]',
        '.mw-jump-link',
        '.mw-editsection',
        '.vector-toc',
        '.vector-menu',
      ].join(", "),
    )
    .remove();

  const visibleText = cleanEl.text().replace(/\s+/g, " ").trim();
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;

  const headings: PageSignals["headings"] = [];
  $("h1, h2, h3, h4").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const level = Number(tag.replace("h", ""));
    const text = $(el).text().trim();
    if (text) headings.push({ level, text });
  });

  const paragraphs = $("p").length;
  const lists = $("ul, ol").length;
  const tables = $("table").length;
  const blockquotes = $("blockquote").length;

  const externalLinks: PageSignals["externalLinks"] = [];
  try {
    const origin = new URL(finalUrl).origin;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      try {
        const abs = new URL(href, finalUrl);
        if (abs.origin !== origin && (abs.protocol === "http:" || abs.protocol === "https:")) {
          externalLinks.push({ href: abs.toString(), text: $(el).text().trim().slice(0, 80) });
        }
      } catch {}
    });
  } catch {}

  const sentences = splitSentences(visibleText);
  const lang = detectLang(visibleText);

  const selfContained = sentences.filter(isSelfContained).length;
  const selfContainedRatio = sentences.length ? selfContained / sentences.length : 0;
  const statSentences = sentences.filter(hasStat).slice(0, 30);
  const definitionalSentences = sentences.filter(isDefinitional).slice(0, 30);
  const longSentences = sentences.filter((s) => isLong(s, lang)).length;
  const longSentenceRatio = sentences.length ? longSentences / sentences.length : 0;

  const qaSections = countQaSections($);
  const hasTldr = detectTldr($, visibleText);

  const namedEntities = extractNamedEntities(visibleText.slice(0, 30_000));
  const versionDateNumberHits = countVersionDateNumber(visibleText.slice(0, 30_000));

  const authorVisible = extractAuthor($);
  const dateVisible = extractDate($, visibleText);

  const jsonLdTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      collectTypes(json, jsonLdTypes);
    } catch {}
  });

  const totalHtmlText = $.root().text().replace(/\s+/g, " ").length;
  const htmlBytes = fetchInfo.bytes || html.length;
  const htmlTextRatio = htmlBytes ? totalHtmlText / htmlBytes : 0;

  const paywallSuspected = PAYWALL_HINTS.some((re) => re.test(html));

  const testimonials = countTestimonials($);
  const priceMentions = countPriceMentions(visibleText);
  const comparisonTables = countComparisonTables($);
  const ctaButtons = countCtaButtons($);
  const caseStudies = countCaseStudies($, visibleText);
  const lastUpdatedLabel = extractLastUpdatedLabel($, visibleText);

  const ogType = metaContent($, 'meta[property="og:type"]');
  const ogSiteName = metaContent($, 'meta[property="og:site_name"]');
  const twitterCard = metaContent($, 'meta[name="twitter:card"]');
  const metaDescription =
    metaContent($, 'meta[name="description"]') ||
    metaContent($, 'meta[property="og:description"]');

  return {
    url: finalUrl,
    finalUrl,
    status: fetchInfo.status,
    responseMs: fetchInfo.responseMs,
    bytes: fetchInfo.bytes,
    title,
    visibleText,
    wordCount,
    sentenceCount: sentences.length,
    htmlTextRatio,
    headings,
    paragraphs,
    lists,
    tables,
    blockquotes,
    externalLinks,
    statSentences,
    selfContainedRatio,
    definitionalSentences,
    longSentenceRatio,
    qaSections,
    hasTldr,
    namedEntities,
    versionDateNumberHits,
    authorVisible,
    dateVisible,
    jsonLdTypes,
    paywallSuspected,
    testimonials,
    priceMentions,
    comparisonTables,
    ctaButtons,
    caseStudies,
    lastUpdatedLabel,
    ogType,
    ogSiteName,
    twitterCard,
    metaDescription,
  };
}

function metaContent($: cheerio.CheerioAPI, sel: string): string | null {
  const v = $(sel).first().attr("content");
  return v ? v.trim().slice(0, 500) : null;
}

const TESTIMONIAL_SEL =
  '[class*="testimonial" i], [class*="review" i], [class*="quote" i], [data-testid*="testimonial" i], blockquote[cite], figure.quote, [class*="customer-story" i]';

function countTestimonials($: cheerio.CheerioAPI): number {
  let n = $(TESTIMONIAL_SEL).length;
  $("section, div").each((_, el) => {
    const text = $(el).text().trim().slice(0, 400);
    if (
      /고객 후기|사용자 후기|이용 후기|고객 리뷰|customer (story|review|testimonial)/i.test(text)
    ) {
      n++;
    }
  });
  return n;
}

const PRICE_PATTERNS: RegExp[] = [
  /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s?(?:\/\s?(?:mo|month|yr|year|user|seat))?/gi,
  /€\s?\d{1,3}(?:[.,]\d{1,3})*(?:\s?\/\s?(?:mo|month|yr|year))?/gi,
  /£\s?\d{1,3}(?:[.,]\d{1,3})*(?:\s?\/\s?(?:mo|month|yr|year))?/gi,
  /₩\s?\d{1,3}(?:,\d{3})+/g,
  /\d{1,3}(?:,\d{3})*\s?원\s?(?:\/\s?(?:월|년|사용자|좌석))?/g,
  /월\s?\d{1,3}(?:,\d{3})*\s?(?:원|달러|USD)/g,
  /무료|Free(?:\s+forever|\s+plan|\s+tier)?/gi,
];

function countPriceMentions(text: string): number {
  let n = 0;
  const sample = text.slice(0, 30_000);
  for (const re of PRICE_PATTERNS) {
    const m = sample.match(re);
    if (m) n += m.length;
  }
  return n;
}

function countComparisonTables($: cheerio.CheerioAPI): number {
  let n = 0;
  $("table").each((_, el) => {
    const $t = $(el);
    const rows = $t.find("tr").length;
    const cols = $t.find("tr").first().find("th, td").length;
    const cellText = $t.text();
    const hasCheckmark = /[✓✔✗✘×○●◯⨯☑]|Yes|No|예|아니오|아니요/i.test(cellText);
    if (rows >= 3 && cols >= 2 && hasCheckmark) n++;
  });
  // 클래스명 매칭은 컨테이너 단위로만 1회씩 — 안에 자식이 많아도 1개의 비교 표로 카운트.
  // 부모-자식 모두 매칭되면 부모만 살린다.
  const $candidates = $(
    '[class*="pricing-table" i], [class*="compare" i], [class*="plan-grid" i], [class*="comparison" i]',
  );
  const matched = new Set<unknown>();
  $candidates.each((_, el) => {
    let parent = $(el).parent();
    let hasAncestorMatch = false;
    let guard = 30;
    while (parent.length && guard-- > 0) {
      const node = parent.get(0);
      if (!node || (node as { tagName?: string }).tagName === undefined) break;
      if (matched.has(node)) {
        hasAncestorMatch = true;
        break;
      }
      parent = parent.parent();
    }
    if (!hasAncestorMatch) {
      matched.add(el);
      n++;
    }
  });
  // 한 페이지 안에 비교 표가 10개 이상이면 비정상 — cap을 10으로.
  return Math.min(n, 10);
}

const CTA_TEXT_RE =
  /^(start (free|now|today)|get started|sign up|try (it )?free|book a demo|request (a )?demo|contact sales|buy now|add to cart|시작하기|무료로 시작|문의하기|지금 가입|체험하기|데모 신청|구매하기|장바구니)/i;

function countCtaButtons($: cheerio.CheerioAPI): number {
  let n = 0;
  $("a, button").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length <= 40 && CTA_TEXT_RE.test(text)) n++;
  });
  return n;
}

function countCaseStudies($: cheerio.CheerioAPI, visible: string): number {
  let n = $('[class*="case-stud" i], [class*="customer-stor" i], [href*="/case-stud" i], [href*="/customers/" i]').length;
  if (/case stud(?:y|ies)|customer success|사례 연구|고객 사례|도입 사례/i.test(visible.slice(0, 30_000))) {
    n++;
  }
  return n;
}

function extractLastUpdatedLabel(
  $: cheerio.CheerioAPI,
  visible: string,
): string | null {
  const m = visible.match(
    /(Last updated|Updated|Effective(?: date)?|Revised|최종 수정|마지막 업데이트|업데이트)[:\s]+\s?(20\d{2}[-./]\d{1,2}[-./]\d{1,2}|20\d{2}년\s?\d{1,2}월\s?\d{1,2}일|\w+\s+\d{1,2},?\s+20\d{2})/i,
  );
  if (m) return m[0];
  const labelled = $('[class*="updated" i], [class*="last-updated" i]').first().text().trim();
  if (labelled && labelled.length < 80 && /20\d{2}/.test(labelled)) return labelled;
  return null;
}

function countQaSections($: cheerio.CheerioAPI): number {
  let n = 0;
  $("h1, h2, h3, h4, summary").each((_, el) => {
    const t = $(el).text().trim();
    if (/\?$/.test(t) || /^(Q[:.]|질문)/i.test(t) || /FAQ|자주.{0,2}묻는|Q&A/i.test(t)) n++;
  });
  return n;
}

function detectTldr($: cheerio.CheerioAPI, visible: string): boolean {
  const head = visible.slice(0, 1500).toLowerCase();
  if (/\btl;?dr\b|요약[:\s]|summary[:\s]|한 줄/i.test(head)) return true;
  const firstStrong = $("strong, b").first().text().trim();
  if (firstStrong && /요약|summary|tl;dr/i.test(firstStrong)) return true;
  return false;
}

function extractAuthor($: cheerio.CheerioAPI): string | null {
  const byClass = $('[class*="author" i], [class*="byline" i], [rel="author"]')
    .first()
    .text()
    .trim();
  if (byClass && byClass.length < 80) return byClass;
  return null;
}

function extractDate($: cheerio.CheerioAPI, visible: string): string | null {
  const time = $("time[datetime]").first().attr("datetime");
  if (time) return time;
  const m = visible.match(
    /\b(20\d{2}[-./]\d{1,2}[-./]\d{1,2}|20\d{2}년\s?\d{1,2}월\s?\d{1,2}일|Updated\s+\w+\s+\d{1,2},?\s+20\d{2})/i,
  );
  return m ? m[0] : null;
}

function collectTypes(node: unknown, out: string[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out));
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") out.push(t);
    if (Array.isArray(t)) t.forEach((v) => typeof v === "string" && out.push(v));
    for (const v of Object.values(obj)) collectTypes(v, out);
  }
}
