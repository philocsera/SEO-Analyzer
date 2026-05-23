"use client";

import { useState } from "react";
import { Globe, Search, Network } from "lucide-react";
import { SiteNav } from "@/components/geo/site-nav";
import { ScoreGauge } from "@/components/geo/score-gauge";
import { CATEGORY_LABELS } from "@/lib/geo/analyze/classify";
import type { AnalysisReport } from "@/lib/geo/types";

type SiteItem =
  | { ok: true; url: string; report: AnalysisReport }
  | { ok: false; url: string; error: string };

type SiteAggregate = {
  averageOverall: number | null;
  averages: {
    citability: number;
    quotability: number;
    specificity: number;
    extractability: number;
  };
  passRate: number;
  sampled: number;
  succeeded: number;
};

type SiteState =
  | { ok: true; domain: string; items: SiteItem[]; aggregate: SiteAggregate }
  | { ok: false; error: string };

const SAMPLE_OPTIONS = [3, 5, 8];

export default function SitePage() {
  const [domain, setDomain] = useState("");
  const [sampleSize, setSampleSize] = useState(5);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SiteState | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || pending) return;
    setResult(null);
    setPending(true);
    try {
      const res = await fetch("/api/geo/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), sampleSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error || "진단 실패" });
      } else {
        setResult({
          ok: true,
          domain: data.domain,
          items: data.items as SiteItem[],
          aggregate: data.aggregate as SiteAggregate,
        });
      }
    } catch {
      setResult({ ok: false, error: "진단 중 오류가 발생했습니다." });
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen">
      <SiteNav active="/geo/site" />

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-6">
          <Network className="w-3 h-3" />
          사이트 단위 진단
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">사이트 평균 GEO 점수</h1>
        <p className="text-slate-400">
          sitemap.xml에서 페이지를 샘플링해 사이트 전체의 GEO 건강도를 한 번에
          평가합니다.
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-6 pb-12">
        <form onSubmit={submit}>
          <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Globe className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <input
                type="url"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://docs.example.com"
                className="flex-1 bg-transparent outline-none text-slate-200 placeholder:text-slate-600 text-sm"
                disabled={pending}
              />
            </div>
            <button
              type="submit"
              disabled={pending || !domain.trim()}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
            >
              {pending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  진단 중
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> 사이트 진단
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 text-sm">
            <span className="text-slate-400">샘플 크기</span>
            <div className="flex items-center gap-2">
              {SAMPLE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSampleSize(n)}
                  disabled={pending}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    sampleSize === n
                      ? "bg-violet-600 text-white"
                      : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70"
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 text-center">
            sitemap.xml 또는 sitemap_index.xml에서 균등 샘플링합니다. 시간이 걸릴 수
            있어요.
          </p>
        </form>
      </section>

      {result && <SiteResult result={result} />}
    </main>
  );
}

function SiteResult({ result }: { result: SiteState }) {
  if (!result.ok) {
    return (
      <section className="max-w-3xl mx-auto px-6 pb-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {result.error}
        </div>
      </section>
    );
  }

  const agg = result.aggregate;

  return (
    <section className="max-w-5xl mx-auto px-6 pb-16">
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-2xl p-8 mb-6">
        <div className="mb-2 text-xs text-slate-500">도메인</div>
        <h2 className="text-xl font-bold text-white mb-1 truncate">{result.domain}</h2>
        <div className="text-xs text-slate-500 mb-6">
          샘플 {agg.sampled}개 · 성공 {agg.succeeded}개 · 게이트 통과율{" "}
          {Math.round(agg.passRate * 100)}%
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <ScoreGauge score={agg.averageOverall} label="평균 종합" size={180} />
          <ScoreGauge score={agg.averages.citability} label="Citability" size={120} />
          <ScoreGauge score={agg.averages.quotability} label="Quotability" size={120} />
          <ScoreGauge score={agg.averages.specificity} label="Specificity" size={120} />
          <ScoreGauge
            score={agg.averages.extractability}
            label="Extractability"
            size={120}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700/40 bg-slate-900/40">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/40 text-xs text-slate-500">
              <th className="py-3 px-4 text-left font-semibold">샘플 URL</th>
              <th className="py-3 px-3 font-semibold">카테고리</th>
              <th className="py-3 px-3 font-semibold">종합</th>
              <th className="py-3 px-3 font-semibold">C</th>
              <th className="py-3 px-3 font-semibold">Q</th>
              <th className="py-3 px-3 font-semibold">S</th>
              <th className="py-3 px-3 font-semibold">E</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-800/50 last:border-b-0">
                <td className="py-3 px-4 max-w-md">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-300 hover:text-violet-300 underline truncate block"
                  >
                    {pathOf(it.url)}
                  </a>
                </td>
                {it.ok ? (
                  <>
                    <td className="py-3 px-3 text-center text-xs text-violet-300">
                      {CATEGORY_LABELS[it.report.classification.category]}
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
                  <td colSpan={6} className="py-3 px-3 text-xs text-red-300 text-center">
                    실패: {it.error}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreCell({ score, bold = false }: { score: number | null; bold?: boolean }) {
  if (score === null) return <span className="text-slate-600">—</span>;
  const color =
    score >= 80 ? "text-emerald-300" : score >= 50 ? "text-amber-300" : "text-red-300";
  return (
    <span className={`tabular-nums ${color} ${bold ? "text-base font-bold" : "text-sm"}`}>
      {score}
    </span>
  );
}

function pathOf(u: string) {
  try {
    const x = new URL(u);
    return x.pathname + x.search;
  } catch {
    return u;
  }
}
