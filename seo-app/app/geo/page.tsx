"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Globe,
  Search,
  Quote,
  BookOpenCheck,
  Layers,
  ShieldCheck,
  History,
  X,
} from "lucide-react";
import { ResultView, type GeoAnalyzeResult } from "@/components/geo/result-view";
import type { AnalysisReport } from "@/lib/geo/types";
import { SiteNav } from "@/components/geo/site-nav";
import { DEFAULT_REVIEW_MODEL } from "@/lib/geo/analyze/pricing";
import { estimateCost, formatUSD } from "@/lib/geo/analyze/cost";

const FEATURES = [
  { icon: BookOpenCheck, title: "Citability", desc: "출처·통계·인용가능성 진단" },
  { icon: Quote, title: "Quotability", desc: "자족적·정의형 문장 비율 측정" },
  { icon: Layers, title: "Specificity", desc: "고유명사·버전·수치 밀도" },
  { icon: Search, title: "Extractability", desc: "TL;DR·앵커·구조 추출성" },
  { icon: ShieldCheck, title: "Crawlability", desc: "robots / llms.txt / SSR 검사" },
] as const;

const ANALYSIS_STAGES = [
  { label: "페이지 가져오는 중", after: 0 },
  { label: "robots.txt / llms.txt 확인 중", after: 3 },
  { label: "HTML 파싱 · 문장 분석 중", after: 6 },
  { label: "휴리스틱 점수 산정 중", after: 10 },
  { label: "AI 리뷰 생성 중", after: 14 },
  { label: "거의 다 됐어요…", after: 40 },
] as const;

const EXAMPLES = [
  "https://vercel.com/docs/ai-gateway",
  "https://ai-sdk.dev/docs",
  "https://en.wikipedia.org/wiki/Large_language_model",
];

type HistoryEntry = {
  url: string;
  overallScore: number | null;
  analyzedAt: string;
};

const HISTORY_KEY = "geo_history_v1";

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry: HistoryEntry) {
  if (typeof window === "undefined") return;
  const existing = loadHistory().filter((e) => e.url !== entry.url);
  const next = [entry, ...existing].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}일 전`;
  if (h > 0) return `${h}시간 전`;
  if (m > 0) return `${m}분 전`;
  return "방금 전";
}

function hostnameOf(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

export default function GeoHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>(ANALYSIS_STAGES[0].label);
  const [result, setResult] = useState<GeoAnalyzeResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  // MVP: 검증 모드(다중 모델 실제 질의)는 미노출 → 리뷰 단일 호출 비용만 추정.
  const estimate = estimateCost({
    reviewModel: DEFAULT_REVIEW_MODEL,
    verificationModels: null,
  });

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim() || loading) return;
    setResult(null);
    setStage(ANALYSIS_STAGES[0].label);
    setLoading(true);

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const next = [...ANALYSIS_STAGES].reverse().find((s) => elapsed >= s.after);
      if (next) setStage(next.label);
    }, 1000);

    try {
      const res = await fetch("/api/geo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, verification: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error || "분석 실패" });
        return;
      }
      const report = data as AnalysisReport;
      saveHistoryEntry({
        url: report.url,
        overallScore: report.scores.overall,
        analyzedAt: report.fetchedAt,
      });
      // 결과 페이지로 이동(공유 가능 URL). sessionStorage로 같은 세션 즉시 표시,
      // 서버 공유 저장본은 다른 기기/사용자가 열 때 사용된다. report.url(서버 정규화
      // URL)로 라우팅해야 서버 저장 키와 일치 → 공유 링크가 동작.
      sessionStorage.setItem("geo_result", JSON.stringify(report));
      router.push(`/geo/result/${encodeURIComponent(report.url)}`);
    } catch {
      setResult({ ok: false, error: "분석 중 오류가 발생했습니다." });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const removeEntry = (u: string) => {
    const next = history.filter((e) => e.url !== u);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <main className="min-h-screen">
      <SiteNav active="/geo" />

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-8">
          <Sparkles className="w-3 h-3" />
          Generative Engine Optimization
        </div>
        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          URL 하나로
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            AI 답변 인용 가능성 진단
          </span>
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
          ChatGPT · Claude · Perplexity · Google AI Overviews에 인용될 가능성을
          <br />
          출처·통계·문장 인용성·크롤러 접근성으로 진단합니다.
        </p>

        <form onSubmit={submit} className="max-w-2xl mx-auto">
          <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Globe className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-transparent outline-none text-slate-200 placeholder:text-slate-600 text-sm"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  분석 중
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  분석 시작
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
            <span className="text-xs text-slate-500">예상 비용 (AI 리뷰)</span>
            <span className="font-mono font-semibold text-violet-300">
              {formatUSD(estimate.estimateUSD)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span>예시:</span>
            {EXAMPLES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrl(u)}
                className="rounded-full border border-slate-700/50 bg-slate-800/40 px-3 py-1 hover:border-slate-600 hover:text-slate-300 transition-colors"
              >
                {new URL(u).hostname}
              </button>
            ))}
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-slate-300">{stage}</span>
              <span className="text-xs text-slate-500 ml-auto">최대 1분</span>
            </div>
          )}
        </form>
      </section>

      {result && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <ResultView result={result} />
        </section>
      )}

      {!result && (
        <>
          <section className="max-w-6xl mx-auto px-6 pb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 hover:border-slate-600/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {history.length > 0 && (
            <section className="max-w-2xl mx-auto px-6 pb-24">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <History className="w-4 h-4" />
                  최근 분석 기록
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  전체 삭제
                </button>
              </div>
              <div className="space-y-2">
                {history.map((e) => (
                  <div
                    key={e.url}
                    className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3 group hover:border-slate-600/50 transition-colors"
                  >
                    <button
                      onClick={() => setUrl(e.url)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="text-sm text-slate-300 truncate">
                        {hostnameOf(e.url)}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {timeAgo(e.analyzedAt)}
                      </div>
                    </button>
                    <span className="text-sm font-bold text-violet-400 flex-shrink-0">
                      {e.overallScore ?? "—"}점
                    </span>
                    <button
                      onClick={() => removeEntry(e.url)}
                      className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all ml-1"
                      aria-label="삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <footer data-chrome className="border-t border-slate-800/50 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-600">
          이 점수는 휴리스틱이며 실측 인용률이 아닙니다. 자세한 산정 방식은{" "}
          <a href="/geo/methodology" className="underline hover:text-slate-400">
            Methodology
          </a>{" "}
          페이지를 보세요.
        </div>
      </footer>
    </main>
  );
}
