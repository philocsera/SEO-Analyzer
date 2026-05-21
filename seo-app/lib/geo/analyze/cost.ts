import { PRICING, TOKEN_BUDGET, type ModelId } from "./pricing";
import type { CostBreakdown } from "../types";

export type EstimatePlan = {
  reviewModel: ModelId;
  verificationModels: ModelId[] | null;
};

export function estimateCost(plan: EstimatePlan): CostBreakdown {
  const items: CostBreakdown["byModel"] = [];

  const r = PRICING[plan.reviewModel];
  const reviewIn = TOKEN_BUDGET.review.input;
  const reviewOut = TOKEN_BUDGET.review.output;
  items.push({
    model: plan.reviewModel,
    inputTokens: reviewIn,
    outputTokens: reviewOut,
    usd: (reviewIn * r.inputPerM + reviewOut * r.outputPerM) / 1_000_000,
    actual: false,
  });

  if (plan.verificationModels) {
    for (const m of plan.verificationModels) {
      const p = PRICING[m];
      const inT =
        TOKEN_BUDGET.verificationPerQuestion.input *
        TOKEN_BUDGET.verificationQuestionsPerModel;
      const outT =
        TOKEN_BUDGET.verificationPerQuestion.output *
        TOKEN_BUDGET.verificationQuestionsPerModel;
      items.push({
        model: m,
        inputTokens: inT,
        outputTokens: outT,
        usd: (inT * p.inputPerM + outT * p.outputPerM) / 1_000_000,
        actual: false,
      });
    }
  }

  const total = items.reduce((s, i) => s + i.usd, 0);
  return {
    estimateUSD: round4(total),
    actualUSD: null,
    byModel: items,
  };
}

export function actualCost(
  usages: Array<{
    model: ModelId;
    inputTokens: number;
    outputTokens: number;
  }>,
): CostBreakdown {
  const items: CostBreakdown["byModel"] = usages.map((u) => {
    const p = PRICING[u.model];
    return {
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      usd:
        (u.inputTokens * p.inputPerM + u.outputTokens * p.outputPerM) /
        1_000_000,
      actual: true,
    };
  });
  const total = items.reduce((s, i) => s + i.usd, 0);
  return {
    estimateUSD: 0,
    actualUSD: round4(total),
    byModel: items,
  };
}

export function mergeCost(estimate: CostBreakdown, actual: CostBreakdown): CostBreakdown {
  return {
    estimateUSD: estimate.estimateUSD,
    actualUSD: actual.actualUSD,
    byModel: actual.byModel.length ? actual.byModel : estimate.byModel,
  };
}

function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

export function formatUSD(n: number) {
  if (n < 0.01) return `¢${(n * 100).toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}
