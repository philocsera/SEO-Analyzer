"use client";

import { useState } from "react";
import { Plus, X, Layers, Search } from "lucide-react";
import { SiteNav } from "@/components/geo/site-nav";
import { ScoreGauge } from "@/components/geo/score-gauge";
import { CATEGORY_LABELS } from "@/lib/geo/analyze/classify";
import type { AnalysisReport } from "@/lib/geo/types";

type CompareItem =
  | { ok: true; url: string; report: AnalysisReport }
  | { ok: false; url: string; error: string };

type CompareState =
  | { ok: true; items: CompareItem[] }
  | { ok: false; error: string };

const MAX_URLS = 5;

export default function ComparePage() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CompareState | null>(null);

  const setAt = (i: number, v: string) =>
    setUrls((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  const add = () => urls.length < MAX_URLS && setUrls([...urls, ""]);
  const remove = (i: number) =>
    urls.length > 2 && setUrls(urls.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = urls.map((u) => u.trim()).filter(Boolean);
    if (filled.length < 2 || pending) return;
    setResult(null);
    setPending(true);
    try {
      const res = await fetch("/api/geo/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: filled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error || "비교 실패" });
      } else {
        setResult({ ok: true, items: data.items as CompareItem[] });
      }
    } catch {
      setResult({ ok: false, error: "비교 중 오류가 발생했습니다." });
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen">
      <SiteNav active="/geo/compare" />

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-6">
          <Layers className="w-3 h-3" />
          다중 URL 비교
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          여러 페이지를 나란히 비교
        </h1>
        <p className="text-slate-400">
          최대 {MAX_URLS}개 URL의 GEO 점수와 카테고리별 강점을 한눈에 확인하세요.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-12">
        <form onSubmit={submit} className="space-y-3">
          {urls.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3"
            >
              <span className="text-xs font-mono text-slate-500 w-6">#{i + 1}</span>
              <input
                type="url"
                value={u}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-600"
                disabled={pending}
              />
              {urls.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                  aria-label="삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={add}
              disabled={urls.length >= MAX_URLS || pending}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> URL 추가 ({urls.length}/{MAX_URLS})
            </button>
            <button
              type="submit"
              disabled={pending || urls.filter((u) => u.trim()).length < 2}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
            >
              {pending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  분석 중
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> 비교 시작
                </>
              )}
            </button>
          </div>
        </form>
        {pending && (
          <p className="mt-4 text-center text-sm text-slate-500">
            URL별로 분석 중입니다 — 최대 1분 정도 걸릴 수 있어요.
          </p>
        )}
      </section>

      {result && <CompareResult result={result} />}
    </main>
  );
}

function CompareResult({ result }: { result: CompareState }) {
  if (!result.ok) {
    return (
      <section className="max-w-3xl mx-auto px-6 pb-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {result.error}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <div className="overflow-x-auto rounded-xl border border-slate-700/40">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/40">
              <th className="py-3 px-3 text-left text-xs font-semibold text-slate-400">URL</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">카테고리</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">종합</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">Citability</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">Quotability</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">Specificity</th>
              <th className="py-3 px-3 text-xs font-semibold text-slate-400">Extractability</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-800/50 last:border-0">
                <td className="py-3 px-3 max-w-xs">
                  <div className="text-sm text-slate-200 truncate">
                    {it.ok ? it.report.signals.title || hostOf(it.url) : hostOf(it.url)}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{hostOf(it.url)}</div>
                </td>
                {it.ok ? (
                  <>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
                        {CATEGORY_LABELS[it.report.classification.category]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ScoreCell score={it.report.scores.overall} bold />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ScoreCell score={it.report.scores.citability} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ScoreCell score={it.report.scores.quotability} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ScoreCell score={it.report.scores.specificity} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ScoreCell score={it.report.scores.extractability} />
                    </td>
                  </>
                ) : (
                  <td colSpan={6} className="py-3 px-3 text-xs text-red-300">
                    실패: {it.error}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items
          .filter((it): it is Extract<CompareItem, { ok: true }> => it.ok)
          .map((it, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-5"
            >
              <div className="mb-4 truncate text-sm font-semibold text-slate-200">
                {hostOf(it.url)}
              </div>
              <div className="flex justify-center">
                <ScoreGauge
                  score={it.report.scores.overall}
                  label={CATEGORY_LABELS[it.report.classification.category]}
                  size={140}
                />
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

function ScoreCell({ score, bold = false }: { score: number | null; bold?: boolean }) {
  if (score === null) return <span className="text-slate-600">—</span>;
  const color =
    score >= 80 ? "text-emerald-300" : score >= 50 ? "text-amber-300" : "text-red-300";
  return (
    <span
      className={`tabular-nums ${color} ${bold ? "text-xl font-bold" : "text-base font-semibold"}`}
    >
      {score}
    </span>
  );
}

function hostOf(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}
