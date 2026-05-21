import type {
  CategoryBreakdown,
  Finding,
  PageCategory,
  PageSignals,
  Scores,
} from "../types";
import { WEIGHTS_BY_CATEGORY } from "./thresholds";
import { scoreCitability } from "./rules/citability";
import { scoreQuotability } from "./rules/quotability";
import { scoreSpecificity } from "./rules/specificity";
import { scoreExtractability } from "./rules/extractability";

export function runRules(
  signals: PageSignals,
  gatePassed: boolean,
  category: PageCategory,
): {
  scores: Scores;
  findings: Finding[];
  breakdown: CategoryBreakdown;
  weights: { citability: number; quotability: number; specificity: number; extractability: number };
} {
  const c = scoreCitability(signals, category);
  const q = scoreQuotability(signals);
  const sp = scoreSpecificity(signals, category);
  const ex = scoreExtractability(signals);

  const w = WEIGHTS_BY_CATEGORY[category];

  // 게이트 통과해도 본문이 거의 없으면(SSR 거의 안 됨) overall 점수는 의미 없음 → null.
  // 카테고리별 점수는 유지(시그널 일부는 분류·메타 기반이라 정보가치 있음).
  const MIN_OVERALL_WORDS = 50;
  const hasEnoughForOverall = signals.wordCount >= MIN_OVERALL_WORDS;
  const overall = gatePassed && hasEnoughForOverall
    ? Math.round(
        c.score * w.citability +
          q.score * w.quotability +
          sp.score * w.specificity +
          ex.score * w.extractability,
      )
    : null;

  return {
    scores: {
      overall,
      citability: Math.round(c.score),
      quotability: Math.round(q.score),
      specificity: Math.round(sp.score),
      extractability: Math.round(ex.score),
    },
    findings: [...c.findings, ...q.findings, ...sp.findings, ...ex.findings],
    breakdown: {
      citability: c.contributors,
      quotability: q.contributors,
      specificity: sp.contributors,
      extractability: ex.contributors,
    },
    weights: w,
  };
}
