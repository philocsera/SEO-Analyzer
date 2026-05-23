"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { SeoAnalyzer } from "@/components/SeoAnalyzer";
import { GeoAnalyzer } from "@/components/geo/GeoAnalyzer";
import type { Mode } from "@/components/ModeToggle";

// SEO/GEO를 한 페이지에서 토글로 전환. 라우트가 초기 모드를 정하고(/ = seo, /geo = geo),
// 토글(각 분석기의 URL 입력칸 위)이 in-page 상태를 바꿔 페이지 이동 없이 즉시 전환된다.
export function AnalyzerHome({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const isGeo = mode === "geo";

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100">
      <header className="border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
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
      </header>

      {isGeo ? (
        <GeoAnalyzer mode={mode} onModeChange={setMode} />
      ) : (
        <SeoAnalyzer mode={mode} onModeChange={setMode} />
      )}
    </main>
  );
}
