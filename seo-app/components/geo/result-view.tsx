"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  ExternalLink,
  Calendar,
  FileText,
  Quote,
} from "lucide-react";
import { ScoreGauge } from "@/components/geo/score-gauge";
import { Section } from "@/components/geo/section";
import type {
  AnalysisReport,
  Category,
  Contributor,
  Finding,
  GateCheck,
  PageClassification,
  Severity,
} from "@/lib/geo/types";
import { WEIGHTS_BY_CATEGORY } from "@/lib/geo/analyze/thresholds";
import { CATEGORY_LABELS } from "@/lib/geo/analyze/classify";

// 서버액션 대신 /api/geo/analyze fetch 결과를 담는 타입 (page.tsx에서 생성).
export type GeoAnalyzeResult =
  | { ok: true; report: AnalysisReport; remaining?: number }
  | { ok: false; error: string; remaining?: number };

const CATEGORY_LABEL: Record<Category, string> = {
  citability: "Citability — 인용가능성",
  quotability: "Quotability — 문장 인용성",
  specificity: "Specificity — 구체성",
  extractability: "Extractability — 추출성",
};

const CATEGORY_DESC: Record<Category, string> = {
  citability: "출처·통계·인용·저자·일자",
  quotability: "자족적 문장·정의형·Q&A·문장 길이",
  specificity: "고유명사·버전·날짜·수치",
  extractability: "TL;DR·리스트·표·앵커",
};

export function ResultView({ result }: { result: GeoAnalyzeResult }) {
  if (!result.ok) return <ErrorAlert error={result.error} />;

  const r = result.report;
  const hostname = hostnameOf(r.fetch.finalUrl);
  const analyzedAt = new Date(r.fetchedAt).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {!r.gate.passed && <GateFailBanner checks={r.gate.checks} />}

      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-2xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white mb-1 truncate">
              {r.signals.title || hostname}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">{hostname}</span>
              <a
                href={r.fetch.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-700">·</span>
              <Calendar className="w-3 h-3" />
              <span>{analyzedAt}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <ScoreGauge score={r.scores.overall} label="종합 점수" size={180} />
          <ScoreGauge score={r.scores.citability} label="Citability" size={120} />
          <ScoreGauge score={r.scores.quotability} label="Quotability" size={120} />
          <ScoreGauge score={r.scores.specificity} label="Specificity" size={120} />
          <ScoreGauge
            score={r.scores.extractability}
            label="Extractability"
            size={120}
          />
        </div>

        {r.scoreConfidence.level === "low" && r.gate.passed && (
          <div className="mt-4 mx-auto max-w-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-base rounded-xl px-4 py-3">
            <strong className="font-semibold">⚠ 점수 신뢰도 낮음</strong>
            <p className="mt-1 text-amber-100/80 leading-relaxed">
              {r.scoreConfidence.reason}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <CategoryBadge classification={r.classification} />
          <PillBadge>
            본문 {r.signals.wordCount.toLocaleString()} 단어
          </PillBadge>
          <PillBadge>문장 {r.signals.sentenceCount}</PillBadge>
          <PillBadge>
            {r.fetch.responseMs}ms · HTTP {r.fetch.status}
          </PillBadge>
          {r.gate.llmsTxt.present && <PillBadge variant="success">llms.txt 발견</PillBadge>}
          {r.gate.servedAsMarkdown && (
            <PillBadge variant="success">LLM 봇에 Markdown 응답</PillBadge>
          )}
          {r.signals.hasTldr && <PillBadge variant="success">TL;DR 있음</PillBadge>}
          {r.signals.jsonLdTypes.length > 0 && (
            <PillBadge>JSON-LD: {r.signals.jsonLdTypes.slice(0, 2).join(", ")}</PillBadge>
          )}
        </div>

        {r.gate.passed && <BreakdownGrid breakdown={r.breakdown} />}
      </div>

      <Section title="크롤러 게이트 결과" defaultOpen={!r.gate.passed}>
        <ul className="space-y-2 text-sm">
          {r.gate.checks.map((c) => (
            <GateCheckRow key={c.id} check={c} />
          ))}
        </ul>
      </Section>

      {(["citability", "quotability", "specificity", "extractability"] as Category[]).map(
        (cat) => {
          const cf = r.findings.filter((f) => f.category === cat);
          const score = r.scores[cat];
          const weights = WEIGHTS_BY_CATEGORY[r.classification.category];
          return (
            <Section
              key={cat}
              title={CATEGORY_LABEL[cat]}
              defaultOpen={cat === "citability"}
              accessory={
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    가중치 {Math.round(weights[cat] * 100)}%
                  </span>
                  <span className="text-lg font-bold tabular-nums text-violet-300">
                    {score}
                  </span>
                </div>
              }
            >
              <p className="text-sm text-slate-500 mb-3">{CATEGORY_DESC[cat]}</p>
              <ul className="space-y-3">
                {cf.map((f) => (
                  <FindingRow key={f.id} finding={f} />
                ))}
              </ul>
            </Section>
          );
        },
      )}

      {r.llmReview && (
        <>
          <Section title="AI 리뷰 — 요약" defaultOpen>
            <p className="text-base text-slate-300 whitespace-pre-wrap leading-relaxed">
              {r.llmReview.summary}
            </p>
          </Section>

          <Section title="이렇게 고쳐 보세요 (문장 단위)" defaultOpen>
            <div className="space-y-4">
              {r.llmReview.rewrites.map((rw, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="w-3.5 h-3.5" />
                    {rw.where}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <div className="mb-1 text-sm font-medium text-red-400">현재</div>
                      <div className="text-base text-slate-300">{rw.before}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <div className="mb-1 text-sm font-medium text-emerald-400">개선안</div>
                      <div className="text-base text-slate-200">{rw.after}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-violet-400 font-medium">이유:</span>
                    <span>{rw.why}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="이 페이지가 답할 수 있는 질문">
            <ul className="space-y-3">
              {r.llmReview.simulatedQAs.map((q, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-base text-slate-200 flex items-start gap-2">
                      <Quote className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                      {q.question}
                    </div>
                    <PillBadge variant={q.usesThisPage ? "success" : "muted"}>
                      {q.usesThisPage ? "인용 가능" : "인용 어려움"}
                    </PillBadge>
                  </div>
                  <div className="text-base text-slate-400">{q.likelyAnswer}</div>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <p className="text-xs text-slate-600 text-center pt-2">{r.disclaimer}</p>
    </div>
  );
}

function GateFailBanner({ checks }: { checks: GateCheck[] }) {
  const fails = checks.filter((c) => c.status === "fail");
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-300 mb-1">크롤러 게이트 차단됨</h3>
          <p className="text-base text-red-300/80 mb-3">
            LLM 크롤러가 이 페이지에 접근할 수 없거나 본문이 추출되지 않습니다.
            점수 산정은 의미를 갖지 않습니다.
          </p>
          <ul className="space-y-1 text-base">
            {fails.map((c) => (
              <li key={c.id} className="text-red-200/90">
                · {c.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GateCheckRow({ check }: { check: GateCheck }) {
  const cls =
    check.status === "fail"
      ? "text-red-400"
      : check.status === "warn"
      ? "text-amber-400"
      : "text-emerald-400";
  const Icon = check.status === "fail" ? AlertTriangle : CheckCircle2;
  const label = { robots: "robots.txt", render: "SSR 렌더링", paywall: "Paywall", status: "HTTP 상태" }[
    check.id
  ];
  return (
    <li className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cls}`} />
      <div className="flex-1">
        <div className="text-base font-medium text-slate-200">{label}</div>
        <div className="text-sm text-slate-500">{check.detail}</div>
      </div>
    </li>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li className="flex items-start gap-3">
      <SeverityDot s={finding.severity} />
      <div className="flex-1">
        <div className="font-medium text-base text-slate-200">{finding.title}</div>
        <div className="text-sm text-slate-400 mt-0.5 leading-relaxed">
          {finding.detail}
        </div>
        {finding.evidence && (
          <div className="mt-2 rounded bg-slate-900/60 border border-slate-700/40 px-3 py-2 text-sm italic text-slate-400">
            “{finding.evidence}”
          </div>
        )}
        {finding.fix && (
          <div className="mt-2 text-sm text-slate-300">
            <span className="text-violet-400 font-medium">→ </span>
            {finding.fix}
          </div>
        )}
      </div>
    </li>
  );
}

function SeverityDot({ s }: { s: Severity }) {
  const cls =
    s === "fail"
      ? "bg-red-500"
      : s === "warn"
      ? "bg-amber-500"
      : "bg-emerald-500";
  return <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

function PillBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "muted";
}) {
  const cls = {
    default: "border-slate-700/40 bg-slate-800/40 text-slate-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    muted: "border-slate-700/40 bg-slate-800/30 text-slate-500",
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function ErrorAlert({ error }: { error: string }) {
  let title = "분석 실패";
  let detail = error;
  if (error === "RATE_LIMITED") {
    title = "일일 한도 초과";
    detail = "오늘 사용 가능한 2회를 모두 소진했습니다. 24시간 뒤 다시 시도해주세요.";
  } else if (error.startsWith("URL_GUARD:invalid")) {
    title = "URL 형식 오류";
    detail = "유효한 http(s) URL을 입력해주세요.";
  } else if (error.startsWith("URL_GUARD:scheme")) {
    title = "지원하지 않는 스킴";
    detail = "http:// 또는 https:// URL만 분석할 수 있습니다.";
  } else if (error.startsWith("URL_GUARD:ssrf")) {
    title = "내부/사설 IP 차단";
    detail = "보안상 내부망 주소는 분석할 수 없습니다.";
  } else if (error.includes("SSRF_BLOCKED")) {
    title = "내부/사설 IP 차단";
    detail = "이 URL이 내부망 주소로 리다이렉트되어 보안상 분석을 중단했습니다.";
  } else if (error.startsWith("FETCH_FAILED")) {
    title = "페이지 가져오기 실패";
    detail = error.split(":").slice(2).join(":") || error;
  }
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-300">{title}</h3>
          <p className="text-sm text-red-200/80 mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function hostnameOf(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

function CategoryBadge({ classification }: { classification: PageClassification }) {
  const label = CATEGORY_LABELS[classification.category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
      title={classification.reason}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-violet-400/60">·</span>
      <span className="text-violet-300/80">신뢰도 {Math.round(classification.confidence * 100)}%</span>
    </span>
  );
}

const BREAKDOWN_LABEL: Record<Category, string> = {
  citability: "Citability",
  quotability: "Quotability",
  specificity: "Specificity",
  extractability: "Extractability",
};

function BreakdownGrid({
  breakdown,
}: {
  breakdown: Record<Category, Contributor[]>;
}) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(BREAKDOWN_LABEL) as Category[]).map((cat) => {
        const top = topContributors(breakdown[cat], 3);
        return (
          <div
            key={cat}
            className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3"
          >
            <div className="mb-2 text-xs font-semibold text-slate-300">
              {BREAKDOWN_LABEL[cat]} — 기여 요인
            </div>
            <ul className="space-y-1.5">
              {top.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <ContributorBadge delta={c.delta} status={c.status} />
                  <span className="text-slate-400 leading-snug">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function topContributors(items: Contributor[], n: number) {
  return [...items]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, n);
}

function ContributorBadge({
  delta,
  status,
}: {
  delta: number;
  status: Contributor["status"];
}) {
  const cls =
    status === "positive"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "negative"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-slate-700/40 bg-slate-800/40 text-slate-400";
  const sign = delta > 0 ? "+" : "";
  return (
    <span
      className={`inline-flex w-12 flex-shrink-0 justify-center rounded border px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${cls}`}
    >
      {sign}
      {delta}
    </span>
  );
}
