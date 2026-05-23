"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Link2 } from "lucide-react";
import { ResultView, type GeoAnalyzeResult } from "@/components/geo/result-view";
import { SiteNav } from "@/components/geo/site-nav";
import type { AnalysisReport } from "@/lib/geo/types";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근 불가(비-HTTPS 등) 시 무시
    }
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          복사됨
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          공유 링크 복사
        </>
      )}
    </button>
  );
}

function GeoResultContent() {
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const url = decodeURIComponent(params.id as string);

    const load = async () => {
      try {
        // 1순위: sessionStorage (방금 분석한 결과). 단 같은 URL일 때만 사용.
        const raw = sessionStorage.getItem("geo_result");
        if (raw) {
          const parsed = JSON.parse(raw) as AnalysisReport;
          if (parsed.url === url) {
            setReport(parsed);
            setMounted(true);
            return;
          }
        }

        // 2순위: 서버 공유 저장 (공유 링크·다른 기기에서 재방문)
        const res = await fetch(`/api/geo/result?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          setReport((await res.json()) as AnalysisReport);
        }
      } catch {
        // ignore — report는 null로 남고 안내 문구를 보여준다
      }
      setMounted(true);
    };

    load();
  }, [params.id]);

  if (!mounted) return <Spinner />;

  if (!report) {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <p className="text-slate-400 mb-4">
            결과를 찾을 수 없습니다. 링크가 만료되었거나(7일) 잘못된 주소일 수
            있어요.
          </p>
          <button
            onClick={() => router.push("/geo")}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            새 분석 하러 가기
          </button>
        </div>
      </main>
    );
  }

  const result: GeoAnalyzeResult = { ok: true, report };

  return (
    <main className="min-h-screen">
      <SiteNav />
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/geo")}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            새 분석
          </button>
          <ShareButton />
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <ResultView result={result} />
      </section>
    </main>
  );
}

export default function GeoResultPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <GeoResultContent />
    </Suspense>
  );
}
