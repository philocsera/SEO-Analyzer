'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Zap, BarChart2, FileText, Shield, Globe, Clock, X, History } from 'lucide-react'
import type { AnalysisResult } from '@/types/analysis'
import type { HistoryEntry } from '@/lib/result-cache'

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor(diff / 60_000)
  if (hours > 0) return `${hours}시간 전`
  if (minutes > 0) return `${minutes}분 전`
  return '방금 전'
}

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const features = [
  { icon: Globe, title: '웹사이트 크롤링', desc: '실제 HTML 파싱·구조 분석' },
  { icon: BarChart2, title: 'SEO 기술 점검', desc: '12개 핵심 항목 자동 체크' },
  { icon: Shield, title: 'AI 브랜드 분석', desc: '업종·마케팅 전략 자동 인사이트' },
  { icon: Search, title: '키워드 추천', desc: 'AI 기반 SEO 키워드 발굴' },
  { icon: FileText, title: 'PDF 보고서', desc: '전체 분석 결과 다운로드' },
]

// 분석 단계: 백엔드 흐름과 일치 (crawler → checklist → DART/CrUX → AI → keywords).
// 실제 진행 신호가 없으므로 시간 기반으로 라벨만 회전시켜 사용자에게 "어디쯤인지" 감을 준다.
const ANALYSIS_STAGES = [
  { label: '사이트 크롤링 중', after: 0 },
  { label: 'SEO 기술 점검 중', after: 5 },
  { label: '기업·성능 데이터 조회 중', after: 12 },
  { label: 'AI 브랜드 분석 중', after: 22 },
  { label: '키워드 검색량 조회 중', after: 50 },
  { label: '보고서 생성 중', after: 60 },
  { label: '다른 사용자 요청이 많아 잠시 대기 중… 평소보다 시간이 조금 더 걸려요', after: 70 },
] as const

export function SeoAnalyzer() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<string>(ANALYSIS_STAGES[0].label)
  const [cachedResult, setCachedResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshHistory = async () => {
    const { loadHistory } = await import('@/lib/result-cache')
    setHistory(loadHistory())
  }

  useEffect(() => { refreshHistory() }, [])

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setCachedResult(null)
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    if (!value.trim()) return
    cacheTimerRef.current = setTimeout(async () => {
      let normalized = value.trim()
      if (!normalized.startsWith('http')) normalized = 'https://' + normalized
      const { loadResultIfFresh } = await import('@/lib/result-cache')
      setCachedResult(loadResultIfFresh(normalized))
    }, 600)
  }

  const loadCached = () => {
    if (!cachedResult) return
    sessionStorage.setItem('seo_result', JSON.stringify(cachedResult))
    router.push(`/result/${encodeURIComponent(cachedResult.url)}`)
  }

  const openHistory = async (entry: HistoryEntry) => {
    const { loadResult } = await import('@/lib/result-cache')
    const result = loadResult(entry.url)
    if (!result) return
    sessionStorage.setItem('seo_result', JSON.stringify(result))
    router.push(`/result/${encodeURIComponent(entry.url)}`)
  }

  const removeEntry = async (entryUrl: string) => {
    const { deleteResult } = await import('@/lib/result-cache')
    deleteResult(entryUrl)
    await refreshHistory()
  }

  const clearAll = async () => {
    const { clearHistory } = await import('@/lib/result-cache')
    clearHistory()
    setHistory([])
  }

  const analyze = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || url).trim()
    if (!finalUrl) return
    setLoading(true)
    setError('')
    setCachedResult(null)
    setStage(ANALYSIS_STAGES[0].label)

    const startedAt = Date.now()
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startedAt) / 1000
      const current = [...ANALYSIS_STAGES].reverse().find(s => elapsedSec >= s.after)
      if (current) setStage(current.label)
    }, 1000)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '분석 실패')
      sessionStorage.setItem('seo_result', JSON.stringify(data))
      const { saveResult } = await import('@/lib/result-cache')
      saveResult(data)
      await refreshHistory()
      // data.url(정규화된 URL)로 라우팅해야 서버 캐시 키와 일치 → 공유 링크가 동작.
      router.push(`/result/${encodeURIComponent(data.url)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <>
      {/* 히어로 */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-8">
          <Zap className="w-3 h-3" />
          AI 기반 SEO 자동 분석
        </div>

        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          URL 하나로
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            SEO 완전 분석
          </span>
        </h1>

        <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
          웹사이트 크롤링 · AI 브랜드 분석까지.
          <br />
          SEO 종합 보고서를 무료로 받아보세요.
        </p>

        {/* URL 입력 */}
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Globe className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && analyze()}
                placeholder="https://example.com"
                className="flex-1 bg-transparent outline-none text-slate-200 placeholder:text-slate-600 text-sm"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => analyze()}
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

          {/* 캐시 힌트 */}
          {cachedResult && !loading && (
            <div className="mt-3 flex items-center gap-2 bg-slate-800/60 border border-violet-500/20 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span className="text-sm text-slate-300 flex-1">
                <span className="font-medium text-violet-300">{timeAgo(cachedResult.analyzedAt)}</span>{' '}
                분석 결과 · {cachedResult.overallScore}점
              </span>
              <button
                onClick={loadCached}
                className="text-xs bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                결과 보기
              </button>
              <button
                onClick={() => { setCachedResult(null); analyze() }}
                className="text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                재분석
              </button>
            </div>
          )}

          {/* 진행 상태 */}
          {loading && (
            <div className="mt-4 flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-slate-300">{stage}</span>
              <span className="text-xs text-slate-500 ml-auto">최대 1~2분 소요</span>
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* 기능 카드 */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
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

      {/* 최근 분석 히스토리 */}
      {history.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 pb-24">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <History className="w-4 h-4" />
              최근 분석 기록
            </div>
            <button
              onClick={clearAll}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              전체 삭제
            </button>
          </div>
          <div className="space-y-2">
            {history.map(entry => (
              <div
                key={entry.url}
                className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3 group hover:border-slate-600/50 transition-colors"
              >
                <button
                  onClick={() => openHistory(entry)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm text-slate-300 truncate">{getDomain(entry.url)}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{formatDate(entry.analyzedAt)}</div>
                </button>
                <span className="text-sm font-bold text-violet-400 flex-shrink-0">
                  {entry.overallScore}점
                </span>
                <button
                  onClick={() => removeEntry(entry.url)}
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
  )
}
