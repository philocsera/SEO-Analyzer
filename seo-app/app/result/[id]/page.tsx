'use client'

import { useRouter, useParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AnalysisResult } from '@/types/analysis'
import ScoreGauge from '@/components/ScoreGauge'
import SeoChecklist from '@/components/SeoChecklist'

import AiInsightCard from '@/components/AiInsightCard'
import KeywordTable from '@/components/KeywordTable'
import BrandAwarenessCard from '@/components/BrandAwarenessCard'
import CruxCard from '@/components/CruxCard'
import RevenueEstimateCard from '@/components/RevenueEstimateCard'
import dynamic from 'next/dynamic'
import { ArrowLeft, ExternalLink, Calendar, Globe, ChevronDown } from 'lucide-react'

const PdfReport = dynamic(() => import('@/components/PdfReport'), { ssr: false })

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-700/20 transition-colors"
      >
        <h2 className="text-base font-semibold text-slate-200">{title}</h2>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}

function ResultContent() {
  const router = useRouter()
  const params = useParams()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // 1순위: sessionStorage (방금 분석한 결과)
        const raw = sessionStorage.getItem('seo_result')
        if (raw) {
          setResult(JSON.parse(raw))
          setMounted(true)
          return
        }

        const url = decodeURIComponent(params.id as string)

        // 2순위: 서버 캐시 (공유 링크·다른 기기에서 재방문)
        try {
          const res = await fetch(`/api/result?url=${encodeURIComponent(url)}`)
          if (res.ok) {
            setResult(await res.json())
            setMounted(true)
            return
          }
        } catch {
          // 서버 조회 실패 시 로컬 폴백
        }

        // 3순위: localStorage (같은 브라우저 이전 분석)
        const { loadResult } = await import('@/lib/result-cache')
        const cached = loadResult(url)
        if (cached) setResult(cached)
      } catch {
        // ignore
      }
      setMounted(true)
    }
    load()
  }, [params.id])

  // SSR/클라이언트 불일치 방지: 마운트 전에는 로딩 스피너만 렌더링
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">분석 데이터가 없습니다.</p>
          <button
            onClick={() => router.push('/')}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const hostname = (() => {
    try {
      return new URL(result.url).hostname
    } catch {
      return result.url
    }
  })()

  const analyzedDate = new Date(result.analyzedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100">
      {/* 헤더 */}
      <header className="border-b border-slate-800/50 px-6 py-4 sticky top-0 z-10 bg-[#0a0f1e]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              새 분석
            </button>
            <div className="h-5 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300 font-medium">{hostname}</span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              {analyzedDate}
            </div>
            <PdfReport result={result} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 종합 점수 */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-6">SEO 종합 분석 결과</h1>
          <div className="flex flex-wrap items-center justify-center gap-10">
            <ScoreGauge score={result.overallScore} label="종합 점수" size={180} />
            <ScoreGauge score={result.technical.score} label="기술 SEO" size={140} />
            {result.brandAwareness && (
              <ScoreGauge score={result.brandAwareness.score} label="브랜드 인지도" size={140} />
            )}
          </div>
        </div>

        {/* 기술 SEO 체크리스트 */}
        <Section title="기술 SEO 체크리스트" defaultOpen>
          <SeoChecklist items={result.technical.items} />
        </Section>

        {/* AI 인사이트 */}
        <Section title="AI 브랜드 · 마케팅 분석" defaultOpen>
          <AiInsightCard ai={result.ai} />
        </Section>

        {/* 우선순위 개선 항목 */}
        {result.ai.improvements.length > 0 && (
          <Section title="우선순위 개선 항목" defaultOpen>
            <div className="space-y-2">
              {result.ai.improvements.map((imp, i) => {
                const cfg = {
                  critical: { label: '긴급', color: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' },
                  warning:  { label: '주의', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-500' },
                  info:     { label: '참고', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', dot: 'bg-blue-500' },
                }[imp.priority]
                return (
                  <div key={i} className={`rounded-xl p-4 border ${cfg.color}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                      <span className="text-base font-semibold">{cfg.label}</span>
                      <span className="text-base text-slate-500">·</span>
                      <span className="text-base text-slate-400">{imp.category}</span>
                    </div>
                    <p className="text-base font-medium text-slate-200 mb-1">{imp.title}</p>
                    <p className="text-base text-slate-400 leading-relaxed">{imp.detail}</p>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* 키워드 추천 */}
        {result.keywords.length > 0 && (
          <Section title="추천 SEO 키워드">
            <KeywordTable keywords={result.keywords} />
          </Section>
        )}

        {/* 매출 추정 — 데이터 없으면 미표시 */}
        {result.revenueEstimate && (
          <Section title="매출 추정">
            <RevenueEstimateCard estimate={result.revenueEstimate} />
          </Section>
        )}

        {/* Core Web Vitals (CrUX) — 데이터 없으면 미표시 */}
        {result.crux && (
          <Section title="Core Web Vitals (실사용자 데이터)">
            <CruxCard crux={result.crux} />
          </Section>
        )}

        {/* 브랜드 인지도 */}
        {result.brandAwareness && (
          <Section title="브랜드 인지도">
            <BrandAwarenessCard brandAwareness={result.brandAwareness} />
          </Section>
        )}


      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
