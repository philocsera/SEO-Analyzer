"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { SeoAnalyzer } from "@/components/SeoAnalyzer";
import { GeoAnalyzer } from "@/components/geo/GeoAnalyzer";

type Mode = "seo" | "geo";

// SEO/GEO를 한 페이지에서 토글로 전환. 라우트가 초기 모드를 정하고(/ = seo, /geo = geo),
// 토글은 in-page 상태라 페이지 이동 없이 즉시 전환된다. 헤더 자체는 위젯의 핵심 컨트롤이라
// 임베드(?embed=1) 시에도 숨기지 않는다(chrome 아님).
export function AnalyzerHome({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const isGeo = mode === "geo";

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100">
      <header className="border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg flex items-center justify-center">
              {isGeo ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <Search className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="font-bold text-lg text-white">
              {isGeo ? "GEO Analyzer" : "SEO Analyzer"}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
            <ToggleBtn active={!isGeo} onClick={() => setMode("seo")}>
              SEO
            </ToggleBtn>
            <ToggleBtn active={isGeo} onClick={() => setMode("geo")}>
              GEO
            </ToggleBtn>
          </div>
        </div>
      </header>

      {isGeo ? <GeoAnalyzer /> : <SeoAnalyzer />}
    </main>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
