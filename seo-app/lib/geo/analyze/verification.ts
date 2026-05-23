import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { isReasoningModel, type ModelId } from "./pricing";
import type { LlmReview, VerificationResult } from "../types";

export type VerificationModelUsage = {
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
};

export async function runVerification(
  pageUrl: string,
  review: LlmReview,
  models: ModelId[],
): Promise<{ result: VerificationResult; usages: VerificationModelUsage[] }> {
  const origin = safeOrigin(pageUrl);
  const questions = review.simulatedQAs.map((q) => q.question).slice(0, 3);

  const usages: VerificationModelUsage[] = [];
  const runsByModel: VerificationResult["runs"] = [];

  for (const model of models) {
    const modelRuns: VerificationResult["runs"][number]["runs"] = [];
    let inT = 0;
    let outT = 0;
    const reasoning = isReasoningModel(model);
    for (const question of questions) {
      const { text, usage } = await generateText({
        // 프로바이더 prefix(openai/...)를 제거하고 OpenAI 프로바이더로 직접 호출.
        model: openai(model.replace(/^[a-z]+\//, "")),
        prompt: question,
        // 추론 모델은 temperature 커스텀 미지원 → 비-추론 모델일 때만 지정.
        ...(reasoning ? {} : { temperature: 0.2 }),
      });
      inT += usage?.inputTokens ?? 0;
      outT += usage?.outputTokens ?? 0;
      const cited = origin
        ? text.includes(origin) || text.includes(stripScheme(origin))
        : false;
      const citedUrls = extractUrls(text);
      modelRuns.push({
        question,
        answer: text.slice(0, 1500),
        citedThisDomain: cited,
        citedUrls,
      });
    }
    runsByModel.push({ model, runs: modelRuns });
    usages.push({ model, inputTokens: inT, outputTokens: outT });
  }

  return {
    result: { enabled: true, models, runs: runsByModel },
    usages,
  };
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function stripScheme(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"')]+/g;
  return Array.from(new Set(text.match(re) ?? [])).slice(0, 10);
}
