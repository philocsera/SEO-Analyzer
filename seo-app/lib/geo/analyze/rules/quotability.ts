import type { Contributor, Finding, PageSignals } from "../../types";
import { THRESHOLDS } from "../thresholds";

export function scoreQuotability(s: PageSignals): {
  score: number;
  findings: Finding[];
  contributors: Contributor[];
} {
  const findings: Finding[] = [];
  const contributors: Contributor[] = [];
  let raw = 0;

  if (s.selfContainedRatio >= THRESHOLDS.selfContained.good) {
    raw += 35;
    contributors.push({
      label: `자족적 문장 ${pct(s.selfContainedRatio)}`,
      delta: 35,
      status: "positive",
    });
    findings.push({
      id: "quot.self.good",
      category: "quotability",
      severity: "info",
      title: "자족적 문장 비율 우수",
      detail: `전체 문장의 ${pct(s.selfContainedRatio)}가 대명사/지시어 의존 없이 단독으로 의미가 통합니다.`,
    });
  } else if (s.selfContainedRatio >= THRESHOLDS.selfContained.ok) {
    raw += 18;
    contributors.push({
      label: `자족적 문장 ${pct(s.selfContainedRatio)} (보통)`,
      delta: -17,
      status: "negative",
    });
    findings.push({
      id: "quot.self.ok",
      category: "quotability",
      severity: "warn",
      title: "자족적 문장 비율 미흡",
      detail: `${pct(s.selfContainedRatio)}만 단독 인용 가능. LLM은 문맥 의존 문장을 잘 인용하지 않습니다.`,
      fix: "‘이것은…’ → ‘GEO 점수는…’ 처럼 주어를 명시적으로 쓰세요.",
    });
  } else {
    contributors.push({
      label: `자족적 문장 ${pct(s.selfContainedRatio)} (부족)`,
      delta: -35,
      status: "negative",
    });
    findings.push({
      id: "quot.self.fail",
      category: "quotability",
      severity: "fail",
      title: "단독 인용 가능한 문장이 거의 없음",
      detail: `자족적 문장 비율 ${pct(s.selfContainedRatio)}. 대부분의 문장이 앞 문장 없이는 의미가 통하지 않습니다.`,
      fix: "지시어로 시작하는 문장을 명시적 주어로 다시 쓰세요.",
    });
  }

  if (s.definitionalSentences.length >= THRESHOLDS.definitionalSentences.good) {
    raw += 25;
    contributors.push({
      label: `정의형 문장 ${s.definitionalSentences.length}건`,
      delta: 25,
      status: "positive",
    });
    findings.push({
      id: "quot.def.good",
      category: "quotability",
      severity: "info",
      title: "정의형 문장 풍부",
      detail: `“X는 Y이다” 패턴 ${s.definitionalSentences.length}건.`,
      evidence: s.definitionalSentences[0],
    });
  } else if (s.definitionalSentences.length >= THRESHOLDS.definitionalSentences.ok) {
    raw += 12;
    contributors.push({
      label: `정의형 문장 ${s.definitionalSentences.length}건 (적음)`,
      delta: -13,
      status: "negative",
    });
    findings.push({
      id: "quot.def.ok",
      category: "quotability",
      severity: "warn",
      title: "정의형 문장 적음",
      detail: `${s.definitionalSentences.length}건. LLM은 정의형 문장을 답변에 그대로 삽입합니다.`,
      fix: "각 개념을 한 문장으로 정의하는 문장을 추가하세요.",
    });
  } else {
    contributors.push({
      label: "정의형 문장 거의 없음",
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "quot.def.fail",
      category: "quotability",
      severity: "fail",
      title: "정의형 문장 거의 없음",
      detail: "‘X는 ~이다’ 형태의 문장이 부족합니다. LLM은 이런 문장을 답변 도입부로 자주 인용합니다.",
      fix: "주요 용어 각각에 대해 단정형 정의 한 줄을 추가하세요.",
    });
  }

  if (s.qaSections > 0) {
    raw += 15;
    contributors.push({
      label: `Q&A/FAQ 섹션 ${s.qaSections}건`,
      delta: 15,
      status: "positive",
    });
    findings.push({
      id: "quot.qa.good",
      category: "quotability",
      severity: "info",
      title: "Q&A 섹션 존재",
      detail: `질문형 헤딩/FAQ ${s.qaSections}건.`,
    });
  } else {
    contributors.push({
      label: "Q&A 섹션 없음",
      delta: -15,
      status: "negative",
    });
    findings.push({
      id: "quot.qa.warn",
      category: "quotability",
      severity: "warn",
      title: "Q&A 섹션 없음",
      detail: "LLM 답변은 Q&A 구조에서 발췌하기가 쉽습니다.",
      fix: "‘자주 묻는 질문’ 섹션을 만들어 질문→짧은 답 형태로 정리하세요.",
    });
  }

  if (s.longSentenceRatio <= THRESHOLDS.longSentenceRatio.goodMax) {
    raw += 15;
    contributors.push({
      label: `긴 문장 비율 ${pct(s.longSentenceRatio)} (양호)`,
      delta: 15,
      status: "positive",
    });
  } else if (s.longSentenceRatio <= THRESHOLDS.longSentenceRatio.okMax) {
    raw += 7;
    contributors.push({
      label: `긴 문장 비율 ${pct(s.longSentenceRatio)} (많음)`,
      delta: -8,
      status: "negative",
    });
    findings.push({
      id: "quot.long.warn",
      category: "quotability",
      severity: "warn",
      title: "긴 문장이 다소 많음",
      detail: `${pct(s.longSentenceRatio)}의 문장이 임계값을 초과합니다.`,
      fix: "문장을 끊어 70자(영문 25단어) 이하로 다듬으세요.",
    });
  } else {
    contributors.push({
      label: `긴 문장 비율 ${pct(s.longSentenceRatio)} (과다)`,
      delta: -15,
      status: "negative",
    });
    findings.push({
      id: "quot.long.fail",
      category: "quotability",
      severity: "fail",
      title: "긴 문장 비율 과다",
      detail: `${pct(s.longSentenceRatio)}의 문장이 인용하기엔 너무 깁니다.`,
      fix: "한 문장 하나의 정보 단위로 분리하세요.",
    });
  }

  return { score: Math.min(100, raw * (100 / 90)), findings, contributors };
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
