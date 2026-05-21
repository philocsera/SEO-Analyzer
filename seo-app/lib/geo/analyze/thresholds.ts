import type { PageCategory } from "../types";

export const WEIGHTS = {
  citability: 0.45,
  quotability: 0.25,
  specificity: 0.2,
  extractability: 0.1,
} as const;

// 카테고리별 가중치
// docs/encyclopedia 같이 "지식 인용"이 본업인 페이지는 Citability(출처·통계) 비중을 높게,
// marketing/commerce처럼 자기 PR 페이지는 Specificity·Extractability(브랜드·가격·구조)를 더 본다.
// 모든 행의 합은 1.0 이며, 어떤 카테고리든 0이 되는 항목은 없어 정성적 메시지가 사라지진 않는다.
export const WEIGHTS_BY_CATEGORY: Record<
  PageCategory,
  { citability: number; quotability: number; specificity: number; extractability: number }
> = {
  docs: { citability: 0.4, quotability: 0.3, specificity: 0.2, extractability: 0.1 },
  encyclopedia: { citability: 0.45, quotability: 0.25, specificity: 0.2, extractability: 0.1 },
  blog: { citability: 0.4, quotability: 0.25, specificity: 0.2, extractability: 0.15 },
  news: { citability: 0.45, quotability: 0.25, specificity: 0.2, extractability: 0.1 },
  marketing: { citability: 0.25, quotability: 0.2, specificity: 0.3, extractability: 0.25 },
  commerce: { citability: 0.2, quotability: 0.2, specificity: 0.35, extractability: 0.25 },
  forum: { citability: 0.3, quotability: 0.35, specificity: 0.2, extractability: 0.15 },
  other: { citability: 0.35, quotability: 0.25, specificity: 0.25, extractability: 0.15 },
};

export const THRESHOLDS = {
  selfContained: { good: 0.6, ok: 0.4 },
  statSentences: { good: 5, ok: 1 },
  externalLinksPerHundredWords: { good: 0.2, ok: 0.05 },
  definitionalSentences: { good: 3, ok: 1 },
  longSentenceRatio: { goodMax: 0.2, okMax: 0.4 },
  namedEntityDensity: { good: 0.04, ok: 0.015 },
  versionDateNumberPerHundredWords: { good: 0.3, ok: 0.1 },
  htmlTextRatio: { good: 0.05, ok: 0.02 },
  responseMs: { goodMax: 3000, okMax: 8000 },
  contentBytesMin: 1500,
  contentBytesMax: 5_000_000,
} as const;

export const LLM_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
] as const;

export const RATE_LIMIT = {
  perIpPerDay: 2,
  windowSeconds: 24 * 60 * 60,
} as const;
