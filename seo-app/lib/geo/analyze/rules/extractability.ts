import type { Contributor, Finding, PageSignals } from "../../types";

export function scoreExtractability(s: PageSignals): {
  score: number;
  findings: Finding[];
  contributors: Contributor[];
} {
  const findings: Finding[] = [];
  const contributors: Contributor[] = [];
  let raw = 0;

  if (s.hasTldr) {
    raw += 35;
    contributors.push({
      label: "TL;DR/요약 블록 존재",
      delta: 35,
      status: "positive",
    });
    findings.push({
      id: "ext.tldr.good",
      category: "extractability",
      severity: "info",
      title: "TL;DR/요약 블록 존재",
      detail: "페이지 상단에 요약이 있어 LLM이 핵심을 빠르게 추출합니다.",
    });
  } else {
    contributors.push({
      label: "상단 요약(TL;DR) 없음",
      delta: -35,
      status: "negative",
    });
    findings.push({
      id: "ext.tldr.warn",
      category: "extractability",
      severity: "warn",
      title: "상단 요약 없음",
      detail: "‘TL;DR’ 또는 ‘요약’ 단락을 페이지 상단에 두면 인용 확률이 올라갑니다.",
      fix: "본문 시작 직후 100단어 이내의 요약 단락을 추가하세요.",
    });
  }

  const meaningfulH2 = s.headings.filter(
    (h) => h.level === 2 && (/\?$/.test(h.text) || h.text.length >= 6),
  ).length;
  if (meaningfulH2 >= 3) {
    raw += 25;
    contributors.push({
      label: `의미 있는 H2 ${meaningfulH2}개`,
      delta: 25,
      status: "positive",
    });
    findings.push({
      id: "ext.h2.good",
      category: "extractability",
      severity: "info",
      title: "의미 있는 H2 앵커 다수",
      detail: `질문형 또는 명사구로 된 H2 ${meaningfulH2}개.`,
    });
  } else if (meaningfulH2 >= 1) {
    raw += 12;
    contributors.push({
      label: `H2 앵커 ${meaningfulH2}개 (부족)`,
      delta: -13,
      status: "negative",
    });
  } else {
    contributors.push({
      label: "앵커가 될 H2 없음",
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "ext.h2.warn",
      category: "extractability",
      severity: "warn",
      title: "앵커가 될 H2 부족",
      detail: "LLM은 헤딩을 답변 단위로 끊어 사용합니다.",
      fix: "각 섹션 제목을 짧은 질문형 또는 명사구로 작성하세요.",
    });
  }

  if (s.lists + s.tables >= 3) {
    raw += 25;
    contributors.push({
      label: `리스트·표 적극 활용 (${s.lists + s.tables}개)`,
      delta: 25,
      status: "positive",
    });
    findings.push({
      id: "ext.struct.good",
      category: "extractability",
      severity: "info",
      title: "리스트·표를 적극 활용",
      detail: `lists=${s.lists}, tables=${s.tables}`,
    });
  } else if (s.lists + s.tables >= 1) {
    raw += 12;
    contributors.push({
      label: `리스트·표 보통 (${s.lists + s.tables}개)`,
      delta: -13,
      status: "negative",
    });
  } else {
    contributors.push({
      label: "리스트·표 없음",
      delta: -25,
      status: "negative",
    });
    findings.push({
      id: "ext.struct.warn",
      category: "extractability",
      severity: "warn",
      title: "리스트·표 없음",
      detail: "구조 요소가 없으면 LLM이 평문을 통째로 읽고 요약해야 합니다.",
      fix: "열거 가능한 정보는 모두 ul/ol/table로 옮기세요.",
    });
  }

  if (s.qaSections > 0) {
    raw += 15;
    contributors.push({
      label: `Q&A 섹션 ${s.qaSections}건`,
      delta: 15,
      status: "positive",
    });
  }

  return { score: Math.min(100, raw), findings, contributors };
}
