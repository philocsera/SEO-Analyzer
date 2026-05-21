import type { Contributor, Finding, PageCategory, PageSignals } from "../../types";
import { THRESHOLDS } from "../thresholds";

const COMMERCIAL = new Set<PageCategory>(["marketing", "commerce"]);

export function scoreSpecificity(
  s: PageSignals,
  category: PageCategory = "other",
): {
  score: number;
  findings: Finding[];
  contributors: Contributor[];
} {
  const findings: Finding[] = [];
  const contributors: Contributor[] = [];
  let raw = 0;
  const isCommercial = COMMERCIAL.has(category);

  const wordCount = Math.max(s.wordCount, 1);
  const entityDensity = s.namedEntities.length / wordCount;
  if (entityDensity >= THRESHOLDS.namedEntityDensity.good) {
    raw += 50;
    contributors.push({
      label: `고유명사 밀도 우수 (${s.namedEntities.length}개)`,
      delta: 50,
      status: "positive",
    });
    findings.push({
      id: "spec.entity.good",
      category: "specificity",
      severity: "info",
      title: "고유명사·브랜드 밀도 우수",
      detail: `본문 1단어당 ${entityDensity.toFixed(3)} (식별된 엔티티 ${s.namedEntities.length}개)`,
      evidence: s.namedEntities.slice(0, 8).join(", "),
    });
  } else if (entityDensity >= THRESHOLDS.namedEntityDensity.ok) {
    raw += 25;
    contributors.push({
      label: `고유명사 밀도 보통 (${s.namedEntities.length}개)`,
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "spec.entity.ok",
      category: "specificity",
      severity: "warn",
      title: "고유명사 밀도 보통",
      detail: `구체적 명칭(제품·인명·지명)이 더 많을수록 답변에서 인용될 확률이 올라갑니다.`,
      fix: "‘업계 선두 기업’ → ‘Anthropic’, ‘작년’ → ‘2025년’ 처럼 구체화하세요.",
    });
  } else {
    contributors.push({
      label: "고유명사 부족",
      delta: -50,
      status: "negative",
    });
    findings.push({
      id: "spec.entity.fail",
      category: "specificity",
      severity: "fail",
      title: "고유명사가 부족합니다",
      detail: "추상 표현이 많아 LLM이 답변에 끼워넣을 ‘구체적 단서’가 부족합니다.",
      fix: "회사·제품·인명·지명·버전 명을 본문에 명시하세요.",
    });
  }

  const vdnPer100 = s.versionDateNumberHits / (s.wordCount / 100 || 1);
  if (vdnPer100 >= THRESHOLDS.versionDateNumberPerHundredWords.good) {
    raw += 30;
    contributors.push({
      label: `버전·날짜·수치 밀도 우수 (100단어당 ${vdnPer100.toFixed(2)})`,
      delta: 30,
      status: "positive",
    });
    findings.push({
      id: "spec.vdn.good",
      category: "specificity",
      severity: "info",
      title: "버전·날짜·수치 밀도 우수",
      detail: `본문 100단어당 ${vdnPer100.toFixed(2)}건의 구체적 식별자.`,
    });
  } else if (vdnPer100 >= THRESHOLDS.versionDateNumberPerHundredWords.ok) {
    raw += 15;
    contributors.push({
      label: `구체적 식별자 보통 (100단어당 ${vdnPer100.toFixed(2)})`,
      delta: -15,
      status: "negative",
    });
    findings.push({
      id: "spec.vdn.ok",
      category: "specificity",
      severity: "warn",
      title: "구체적 식별자(버전·날짜·수치) 보통",
      detail: "구체적 수치가 더 자주 등장하는 페이지가 인용에 유리합니다.",
    });
  } else {
    contributors.push({
      label: "구체적 식별자 부족",
      delta: -30,
      status: "negative",
    });
    findings.push({
      id: "spec.vdn.fail",
      category: "specificity",
      severity: "fail",
      title: "구체적 식별자 부족",
      detail: "버전·날짜·가격 같은 ‘바뀌면 의미가 달라지는’ 정보가 거의 없습니다.",
      fix: "‘최근’ → ‘2026-04’, ‘싸다’ → ‘월 $9’ 처럼 수치/날짜를 명시하세요.",
    });
  }

  if (s.tables > 0 || s.lists >= 3) {
    raw += 20;
    contributors.push({
      label: `표·리스트 구조화 (lists=${s.lists}, tables=${s.tables})`,
      delta: 20,
      status: "positive",
    });
    findings.push({
      id: "spec.struct.good",
      category: "specificity",
      severity: "info",
      title: "표·리스트로 구조화된 정보 있음",
      detail: `lists=${s.lists}, tables=${s.tables}`,
    });
  } else {
    contributors.push({
      label: "표·리스트 적음",
      delta: -20,
      status: "negative",
    });
    findings.push({
      id: "spec.struct.warn",
      category: "specificity",
      severity: "warn",
      title: "표·리스트가 적음",
      detail: "비교·열거 가능한 정보가 평문에 갇혀 있으면 LLM이 추출하기 어렵습니다.",
      fix: "비교 가능한 항목은 표로, 열거형 항목은 리스트로 변환하세요.",
    });
  }

  if (isCommercial) {
    if (s.priceMentions >= 3) {
      raw += 10;
      contributors.push({
        label: `가격 표기 ${s.priceMentions}건`,
        delta: 10,
        status: "positive",
      });
      findings.push({
        id: "spec.price.good",
        category: "specificity",
        severity: "info",
        title: "가격 정보가 명시되어 있습니다",
        detail: `본문에서 ${s.priceMentions}건의 가격 표기를 발견했습니다.`,
      });
    } else if (s.priceMentions === 0) {
      contributors.push({
        label: "가격 표기 없음",
        delta: -5,
        status: "negative",
      });
      findings.push({
        id: "spec.price.warn",
        category: "specificity",
        severity: "warn",
        title: "가격 정보가 본문에 없음",
        detail: "상업 페이지에서 가격은 LLM이 답변에 직접 인용하는 강한 신호입니다.",
        fix: "‘월 $X / 연 $Y’ 같은 구체적 가격을 본문에 노출하세요. ‘문의’만 있는 경우 비교 답변에서 제외되기 쉽습니다.",
      });
    }
    if (s.comparisonTables >= 1) {
      raw += 5;
      contributors.push({
        label: `기능 비교 표 ${s.comparisonTables}개`,
        delta: 5,
        status: "positive",
      });
      findings.push({
        id: "spec.compare.good",
        category: "specificity",
        severity: "info",
        title: "기능 비교 표 존재",
        detail: `LLM은 비교 표에서 항목별 답을 그대로 추출합니다.`,
      });
    }
  }

  return { score: Math.min(100, raw), findings, contributors };
}
