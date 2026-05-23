import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { LlmReview, PageSignals } from "../types";
import { DEFAULT_REVIEW_MODEL, type ModelId } from "./pricing";

// 리뷰 모델은 항상 Claude("anthropic/..."). Vercel AI Gateway(카드 필요) 대신
// @ai-sdk/anthropic로 직접 호출한다(SEO와 동일하게 ANTHROPIC_API_KEY 사용 → 카드 불필요).
function reviewModel(id: ModelId) {
  return anthropic(id.replace(/^anthropic\//, ""));
}

const ReviewSchema = z.object({
  summary: z.string().max(800),
  rewrites: z
    .array(
      z.object({
        where: z.string().max(120),
        before: z.string().max(500),
        after: z.string().max(500),
        why: z.string().max(300),
      }),
    )
    .min(1)
    .max(5),
  simulatedQAs: z
    .array(
      z.object({
        question: z.string().max(200),
        likelyAnswer: z.string().max(500),
        usesThisPage: z.boolean(),
      }),
    )
    .min(2)
    .max(3),
});

export type LlmReviewResult = {
  review: LlmReview;
  usage: { inputTokens: number; outputTokens: number; model: ModelId };
};

export async function runLLMReview(
  signals: PageSignals,
  lang: "ko" | "en",
  model: ModelId = DEFAULT_REVIEW_MODEL,
): Promise<LlmReviewResult> {
  // 입력을 12k자로 제한: 무거운 페이지에서도 리뷰가 빨리 끝나 Hobby 60s 함수 한도를
  // 넘기지 않도록(넘기면 응답이 잘려 클라이언트 JSON 파싱이 깨진다).
  const bodyExcerpt = signals.visibleText.slice(0, 12_000);
  const sigSummary = {
    title: signals.title,
    wordCount: signals.wordCount,
    sentenceCount: signals.sentenceCount,
    selfContainedRatio: Number(signals.selfContainedRatio.toFixed(2)),
    longSentenceRatio: Number(signals.longSentenceRatio.toFixed(2)),
    externalLinks: signals.externalLinks.length,
    statSentenceCount: signals.statSentences.length,
    definitionalSentenceCount: signals.definitionalSentences.length,
    qaSections: signals.qaSections,
    hasTldr: signals.hasTldr,
    namedEntities: signals.namedEntities.slice(0, 20),
    authorVisible: signals.authorVisible,
    dateVisible: signals.dateVisible,
    blockquotes: signals.blockquotes,
    versionDateNumberHits: signals.versionDateNumberHits,
  };

  const sysKo = `당신은 GEO(Generative Engine Optimization) 전문가입니다.
사용자는 자신의 페이지가 ChatGPT/Claude/Perplexity 같은 LLM 답변에 인용되길 원합니다.

규칙:
1) 페이지 시그널과 본문 발췌를 보고 *구체적인 문장 단위*로 before/after 개선안을 만드세요.
   - "where"는 어느 부분인지 한 줄로 명시 (예: "본문 2번째 단락", "첫 H2 직전")
   - before/after는 실제 문장이어야 합니다 (메타 설명 X)
2) 이 페이지가 자신 있게 답할 수 있는 사용자 질문을 2~3개 만드세요.
   각 질문에 대해 LLM이 이 페이지를 인용할지(usesThisPage) 예측하세요.
3) summary는 4~6문장으로, 인용가능성에 영향을 주는 3대 약점을 콕 집어주세요.

근거 없는 일반론을 피하세요. SEO 조언(메타 디스크립션, OG 등)은 절대 하지 마세요.`;

  const sysEn = `You are a GEO (Generative Engine Optimization) expert.
The user wants their page cited by LLM answers (ChatGPT/Claude/Perplexity).

Rules:
1) Produce *sentence-level* before/after rewrites grounded in the page excerpt.
   - "where" must locate it concisely (e.g., "2nd body paragraph", "before first H2")
   - before/after must be real sentences, not meta-descriptions
2) Generate 2-3 user questions this page could answer.
   For each, predict whether the LLM would cite this page (usesThisPage).
3) summary should be 4-6 sentences pinpointing the top 3 weaknesses for citation.

Avoid generic advice. Never give SEO advice (meta description, OG, etc.).`;

  const userPrompt = `# Page signals (heuristic)
${JSON.stringify(sigSummary, null, 2)}

# Body excerpt (truncated)
${bodyExcerpt}`;

  const { object, usage } = await generateObject({
    model: reviewModel(model),
    schema: ReviewSchema,
    system: lang === "ko" ? sysKo : sysEn,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 4096,
    // 리뷰가 길어져 함수 한도(Hobby 60s)를 위협하지 않도록 30s에서 중단.
    // 중단되면 compose의 try/catch가 잡아 llmReview=null로 휴리스틱 리포트만 정상 반환.
    abortSignal: AbortSignal.timeout(30_000),
  });

  return {
    review: object,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      model,
    },
  };
}
