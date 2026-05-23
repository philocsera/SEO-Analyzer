import type { AnalysisReport, PageSignals } from "../types";
import { guardUrl } from "./url-guard";
import { fetchPage } from "./fetch-page";
import { parsePage } from "./parse-page";
import { runGate } from "./gate";
import { runRules } from "./score";
import { classifyPage } from "./classify";
import { runLLMReview } from "./llm-review";
import { runVerification } from "./verification";
import { actualCost, estimateCost, mergeCost } from "./cost";
import {
  DEFAULT_REVIEW_MODEL,
  DEFAULT_VERIFICATION_MODELS,
  type ModelId,
} from "./pricing";

export type AnalyzeOptions = {
  lang: "ko" | "en";
  verification: boolean;
  reviewModel?: ModelId;
  verificationModels?: ModelId[];
};

export async function analyzeUrl(
  rawUrl: string,
  opts: AnalyzeOptions,
): Promise<AnalysisReport> {
  const guard = await guardUrl(rawUrl);
  if (!guard.ok) {
    throw new Error(`URL_GUARD:${guard.reason}:${guard.detail ?? ""}`);
  }

  const fetched = await fetchPage(guard.url.toString());
  if (!fetched.ok) {
    throw new Error(`FETCH_FAILED:${fetched.status}:${fetched.error}`);
  }

  const signals: PageSignals = parsePage(fetched.html, fetched.finalUrl, {
    status: fetched.status,
    responseMs: fetched.responseMs,
    bytes: fetched.bytes,
  });

  const gate = await runGate(signals, fetched.finalUrl, fetched.servedAsMarkdown);
  const classification = classifyPage(signals);
  const { scores, findings, breakdown } = runRules(
    signals,
    gate.passed,
    classification.category,
  );

  // 점수 신뢰도: 본문이 너무 적으면 시그널 추출이 빈약해 점수 자체가 신뢰하기 어렵다.
  // 단어가 500 미만이면 문장 수도 확인 — 마케팅 페이지는 짧은 hero 카피로 sentence가 적을 수 있어
  // wc가 충분히 크면 sentence 조건은 면제한다.
  const MIN_HIGH_CONF_WORDS = 200;
  const SENTENCE_REQ_WORDS = 500;
  const MIN_HIGH_CONF_SENTENCES = 8;
  const tooShort = signals.wordCount < MIN_HIGH_CONF_WORDS;
  const tooSparse =
    signals.wordCount < SENTENCE_REQ_WORDS && signals.sentenceCount < MIN_HIGH_CONF_SENTENCES;
  const scoreConfidence =
    tooShort || tooSparse
      ? {
          level: "low" as const,
          reason: `본문이 매우 적습니다 (${signals.wordCount}단어 · ${signals.sentenceCount}문장). 점수는 표면 신호 기반의 추정이며 본문 SSR 보강 후 재분석을 권장합니다.`,
        }
      : { level: "high" as const, reason: "본문이 충분히 추출되어 점수 신뢰도가 높습니다." };

  const reviewModel = opts.reviewModel ?? DEFAULT_REVIEW_MODEL;
  const verificationModels = opts.verification
    ? opts.verificationModels ?? DEFAULT_VERIFICATION_MODELS
    : null;

  const estimate = estimateCost({ reviewModel, verificationModels });

  let llmReview: AnalysisReport["llmReview"] = null;
  let verification: AnalysisReport["verification"] = null;
  const usages: Array<{ model: ModelId; inputTokens: number; outputTokens: number }> = [];

  if (gate.passed && signals.wordCount >= 50) {
    try {
      const result = await runLLMReview(signals, opts.lang, reviewModel);
      llmReview = result.review;
      usages.push(result.usage);

      if (opts.verification && verificationModels && verificationModels.length) {
        const v = await runVerification(fetched.finalUrl, result.review, verificationModels);
        verification = v.result;
        usages.push(...v.usages);
      }
    } catch (err) {
      console.error("LLM review failed:", err);
    }
  }

  const cost = usages.length ? mergeCost(estimate, actualCost(usages)) : estimate;

  return {
    url: rawUrl,
    fetchedAt: new Date().toISOString(),
    lang: opts.lang,
    fetch: {
      status: fetched.status,
      responseMs: fetched.responseMs,
      finalUrl: fetched.finalUrl,
      bytes: fetched.bytes,
    },
    gate,
    scores,
    scoreConfidence,
    breakdown,
    classification,
    findings,
    signals: {
      title: signals.title,
      wordCount: signals.wordCount,
      sentenceCount: signals.sentenceCount,
      headings: signals.headings.slice(0, 30),
      lists: signals.lists,
      tables: signals.tables,
      blockquotes: signals.blockquotes,
      statSentences: signals.statSentences.slice(0, 5),
      selfContainedRatio: signals.selfContainedRatio,
      definitionalSentences: signals.definitionalSentences.slice(0, 5),
      longSentenceRatio: signals.longSentenceRatio,
      qaSections: signals.qaSections,
      hasTldr: signals.hasTldr,
      namedEntities: signals.namedEntities.slice(0, 30),
      versionDateNumberHits: signals.versionDateNumberHits,
      authorVisible: signals.authorVisible,
      dateVisible: signals.dateVisible,
      jsonLdTypes: signals.jsonLdTypes,
      testimonials: signals.testimonials,
      priceMentions: signals.priceMentions,
      comparisonTables: signals.comparisonTables,
      ctaButtons: signals.ctaButtons,
      caseStudies: signals.caseStudies,
      lastUpdatedLabel: signals.lastUpdatedLabel,
      ogType: signals.ogType,
      ogSiteName: signals.ogSiteName,
      twitterCard: signals.twitterCard,
      metaDescription: signals.metaDescription,
    },
    llmReview,
    verification,
    cost,
  };
}
