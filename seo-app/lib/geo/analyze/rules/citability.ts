import type { Contributor, Finding, PageCategory, PageSignals } from "../../types";
import { THRESHOLDS } from "../thresholds";

const COMMERCIAL = new Set<PageCategory>(["marketing", "commerce"]);

export function scoreCitability(
  s: PageSignals,
  category: PageCategory = "other",
): {
  score: number;
  findings: Finding[];
  contributors: Contributor[];
} {
  const isCommercial = COMMERCIAL.has(category);
  const findings: Finding[] = [];
  const contributors: Contributor[] = [];
  let score = 0;

  const wpc = s.wordCount / 100 || 1;
  const externalDensity = s.externalLinks.length / wpc;
  if (externalDensity >= THRESHOLDS.externalLinksPerHundredWords.good) {
    score += 25;
    contributors.push({
      label: `외부 출처 링크 풍부 (100단어당 ${externalDensity.toFixed(2)})`,
      delta: 25,
      status: "positive",
    });
    findings.push({
      id: "cit.sources.good",
      category: "citability",
      severity: "info",
      title: "외부 출처 링크가 충분합니다",
      detail: `본문 100단어당 ${externalDensity.toFixed(2)}개의 외부 링크를 가지고 있습니다.`,
    });
  } else if (externalDensity >= THRESHOLDS.externalLinksPerHundredWords.ok) {
    score += 12;
    contributors.push({
      label: `외부 출처 링크 부족 (100단어당 ${externalDensity.toFixed(2)})`,
      delta: -13,
      status: "negative",
    });
    findings.push({
      id: "cit.sources.ok",
      category: "citability",
      severity: "warn",
      title: "외부 출처 링크가 부족합니다",
      detail: `본문 100단어당 ${externalDensity.toFixed(2)}개. 권위 있는 1차 출처로의 아웃링크를 늘리면 인용가능성이 올라갑니다.`,
      fix: "주장 옆에 출처(논문·공식문서·뉴스) 링크를 명시적으로 부착하세요.",
    });
  } else {
    contributors.push({
      label: "외부 출처 링크 거의 없음",
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "cit.sources.fail",
      category: "citability",
      severity: "fail",
      title: "외부 출처 링크 거의 없음",
      detail: `외부 링크가 본문 대비 매우 적습니다. LLM은 출처가 있는 페이지를 강하게 선호합니다 (Aggarwal 2024: +40.6%).`,
      fix: "핵심 주장마다 권위 있는 출처 링크를 부착하세요.",
    });
  }

  if (s.statSentences.length >= THRESHOLDS.statSentences.good) {
    score += 25;
    contributors.push({
      label: `구체적 수치 풍부 (${s.statSentences.length}건)`,
      delta: 25,
      status: "positive",
    });
    findings.push({
      id: "cit.stats.good",
      category: "citability",
      severity: "info",
      title: "구체적 수치가 풍부합니다",
      detail: `통계·수치 포함 문장 ${s.statSentences.length}건.`,
      evidence: s.statSentences[0],
    });
  } else if (s.statSentences.length >= THRESHOLDS.statSentences.ok) {
    score += 12;
    contributors.push({
      label: `구체적 수치 부족 (${s.statSentences.length}건)`,
      delta: -13,
      status: "negative",
    });
    findings.push({
      id: "cit.stats.ok",
      category: "citability",
      severity: "warn",
      title: "구체적 수치가 부족합니다",
      detail: `통계 포함 문장 ${s.statSentences.length}건. 5건 이상이 권장됩니다.`,
      fix: "추상적 주장을 ‘몇 %·몇 건·몇 명’ 형태로 바꿔보세요.",
    });
  } else {
    contributors.push({
      label: "수치·통계 거의 없음",
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "cit.stats.fail",
      category: "citability",
      severity: "fail",
      title: "수치·통계가 거의 없습니다",
      detail: "LLM은 인용할 때 구체적 수치를 선호합니다 (Aggarwal 2024: +37.3%).",
      fix: "‘많은 사용자가’ → ‘월간 활성 사용자 12만 명’ 같이 수치화하세요.",
    });
  }

  if (s.blockquotes > 0) {
    score += 10;
    contributors.push({
      label: `권위자 인용문 ${s.blockquotes}건`,
      delta: 10,
      status: "positive",
    });
    findings.push({
      id: "cit.quotes.good",
      category: "citability",
      severity: "info",
      title: "권위자 인용문이 있습니다",
      detail: `<blockquote> ${s.blockquotes}건.`,
    });
  } else if (isCommercial && s.testimonials >= 1) {
    score += 7;
    contributors.push({
      label: `고객 후기(testimonial) ${s.testimonials}건`,
      delta: 7,
      status: "positive",
    });
    findings.push({
      id: "cit.testimonial.good",
      category: "citability",
      severity: "info",
      title: "고객 후기로 인용 신호 확보",
      detail: `고객/사용자 후기 ${s.testimonials}건이 권위자 인용문을 대체합니다.`,
      fix: "후기를 <blockquote cite=...> 또는 schema.org/Review 구조로 마크업하면 점수가 더 올라갑니다.",
    });
  } else {
    contributors.push({
      label: "인용문(quote) 없음",
      delta: -10,
      status: "negative",
    });
    findings.push({
      id: "cit.quotes.warn",
      category: "citability",
      severity: "warn",
      title: "인용문(quote) 없음",
      detail: isCommercial
        ? "권위자 인용 또는 고객 후기 블록이 LLM에 강한 인용 신호로 작동합니다 (Aggarwal 2024: +41%)."
        : "권위자/원문 인용은 인용가능성을 크게 높입니다 (Aggarwal 2024: +41%).",
      fix: isCommercial
        ? "고객 후기/사례 인용을 <blockquote> 또는 schema.org/Review 구조로 노출하세요."
        : "전문가 코멘트나 1차 자료를 <blockquote>로 묶어 노출하세요.",
    });
  }

  if (s.authorVisible) {
    score += 5;
    contributors.push({
      label: "본문에 저자 노출",
      delta: 5,
      status: "positive",
    });
    findings.push({
      id: "cit.author.good",
      category: "citability",
      severity: "info",
      title: "저자가 본문에 노출됨",
      detail: s.authorVisible,
    });
  } else if (
    isCommercial &&
    (s.jsonLdTypes.includes("Organization") || s.jsonLdTypes.includes("WebSite"))
  ) {
    score += 3;
    contributors.push({
      label: "Organization 스키마로 발화자 식별",
      delta: 3,
      status: "positive",
    });
    findings.push({
      id: "cit.org.good",
      category: "citability",
      severity: "info",
      title: "Organization 스키마로 발화자 식별",
      detail: "법인 명의가 본문 byline을 대체합니다.",
    });
  } else {
    contributors.push({
      label: "본문에 노출된 저자 없음",
      delta: -5,
      status: "negative",
    });
    findings.push({
      id: "cit.author.warn",
      category: "citability",
      severity: "warn",
      title: "본문에 노출된 저자가 없습니다",
      detail: isCommercial
        ? "발화자(브랜드 명·작성자)가 명확하지 않으면 LLM이 인용 주체를 식별하기 어렵습니다."
        : "메타태그가 아니라 byline/본문에서 식별 가능한 저자가 신뢰 신호로 작동합니다.",
      fix: isCommercial
        ? "schema.org/Organization 마크업을 본문 헤더에 추가하거나, 회사 이름을 푸터/저자 표기로 노출하세요."
        : "본문 상단에 ‘작성자: 홍길동’ 같은 byline을 추가하세요.",
    });
  }

  if (s.dateVisible) {
    score += 5;
    contributors.push({
      label: "발행/갱신 일자 노출",
      delta: 5,
      status: "positive",
    });
    findings.push({
      id: "cit.date.good",
      category: "citability",
      severity: "info",
      title: "발행/갱신 일자가 노출됨",
      detail: s.dateVisible,
    });
  } else if (s.lastUpdatedLabel) {
    score += 5;
    contributors.push({
      label: "Last updated 라벨 노출",
      delta: 5,
      status: "positive",
    });
    findings.push({
      id: "cit.lastupdated.good",
      category: "citability",
      severity: "info",
      title: "‘Last updated’ 라벨 노출",
      detail: s.lastUpdatedLabel,
    });
  } else {
    contributors.push({
      label: "본문에 노출된 일자 없음",
      delta: -5,
      status: "negative",
    });
    findings.push({
      id: "cit.date.warn",
      category: "citability",
      severity: "warn",
      title: "본문에 노출된 일자 없음",
      detail: "LLM이 최신성을 판단할 단서가 부족합니다.",
      fix: isCommercial
        ? "푸터 또는 헤더에 ‘Last updated: 2026-05-15’ 또는 ‘마지막 업데이트’ 라벨을 노출하세요."
        : "본문에 ‘2026-05-15 업데이트’ 형태로 가시 일자를 노출하세요.",
    });
  }

  return { score: Math.min(100, score * (100 / 70)), findings, contributors };
}
