export type Category =
  | "citability"
  | "quotability"
  | "specificity"
  | "extractability";

export type Severity = "info" | "warn" | "fail";

export type Finding = {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix?: string;
};

export type GateCheckId = "robots" | "render" | "paywall" | "status";

export type GateCheck = {
  id: GateCheckId;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type GateResult = {
  passed: boolean;
  checks: GateCheck[];
  llmsTxt: { present: boolean; url?: string };
  blockedBots: string[];
  servedAsMarkdown: boolean;
};

export type Scores = {
  overall: number | null;
  citability: number;
  quotability: number;
  specificity: number;
  extractability: number;
};

export type Contributor = {
  label: string;
  delta: number;
  status: "positive" | "negative" | "neutral";
};

export type CategoryBreakdown = Record<Category, Contributor[]>;

export type PageCategory =
  | "docs"
  | "blog"
  | "marketing"
  | "news"
  | "commerce"
  | "encyclopedia"
  | "forum"
  | "other";

export type PageClassification = {
  category: PageCategory;
  confidence: number;
  reason: string;
};

export type PageSignals = {
  url: string;
  finalUrl: string;
  status: number;
  responseMs: number;
  bytes: number;
  title: string;
  visibleText: string;
  wordCount: number;
  sentenceCount: number;
  htmlTextRatio: number;

  headings: { level: number; text: string }[];
  paragraphs: number;
  lists: number;
  tables: number;

  externalLinks: { href: string; text: string }[];
  blockquotes: number;

  statSentences: string[];
  selfContainedRatio: number;
  definitionalSentences: string[];
  longSentenceRatio: number;
  qaSections: number;
  hasTldr: boolean;

  namedEntities: string[];
  versionDateNumberHits: number;

  authorVisible: string | null;
  dateVisible: string | null;

  jsonLdTypes: string[];
  paywallSuspected: boolean;

  testimonials: number;
  priceMentions: number;
  comparisonTables: number;
  ctaButtons: number;
  caseStudies: number;
  lastUpdatedLabel: string | null;

  ogType: string | null;
  ogSiteName: string | null;
  twitterCard: string | null;
  metaDescription: string | null;
};

export type LlmReview = {
  summary: string;
  rewrites: Array<{
    where: string;
    before: string;
    after: string;
    why: string;
  }>;
  simulatedQAs: Array<{
    question: string;
    likelyAnswer: string;
    usesThisPage: boolean;
  }>;
};

export type VerificationRun = {
  question: string;
  answer: string;
  citedThisDomain: boolean;
  citedUrls: string[];
};

export type VerificationResult = {
  enabled: true;
  models: string[];
  runs: Array<{
    model: string;
    runs: VerificationRun[];
  }>;
};

export type CostBreakdown = {
  estimateUSD: number;
  actualUSD: number | null;
  byModel: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    usd: number;
    actual: boolean;
  }>;
};

export type ScoreConfidence = {
  level: "high" | "low";
  reason: string;
};

export type AnalysisReport = {
  url: string;
  fetchedAt: string;
  lang: "ko" | "en";
  fetch: {
    status: number;
    responseMs: number;
    finalUrl: string;
    bytes: number;
  };
  gate: GateResult;
  scores: Scores;
  scoreConfidence: ScoreConfidence;
  breakdown: CategoryBreakdown;
  classification: PageClassification;
  findings: Finding[];
  signals: Pick<
    PageSignals,
    | "title"
    | "wordCount"
    | "sentenceCount"
    | "headings"
    | "lists"
    | "tables"
    | "blockquotes"
    | "statSentences"
    | "selfContainedRatio"
    | "definitionalSentences"
    | "longSentenceRatio"
    | "qaSections"
    | "hasTldr"
    | "namedEntities"
    | "versionDateNumberHits"
    | "authorVisible"
    | "dateVisible"
    | "jsonLdTypes"
    | "testimonials"
    | "priceMentions"
    | "comparisonTables"
    | "ctaButtons"
    | "caseStudies"
    | "lastUpdatedLabel"
    | "ogType"
    | "ogSiteName"
    | "twitterCard"
    | "metaDescription"
  >;
  llmReview: LlmReview | null;
  verification: VerificationResult | null;
  cost: CostBreakdown;
};
