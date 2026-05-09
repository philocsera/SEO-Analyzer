'use client'

import { CruxData, CruxMetric } from '@/types/analysis'

interface Props {
  crux: CruxData
}

// Core Web Vitals 기준값
const THRESHOLDS = {
  lcp:  { good: 2500, poor: 4000, unit: 'ms', label: 'LCP', desc: '최대 콘텐츠 렌더링' },
  fcp:  { good: 1800, poor: 3000, unit: 'ms', label: 'FCP', desc: '첫 콘텐츠 렌더링' },
  inp:  { good: 200,  poor: 500,  unit: 'ms', label: 'INP', desc: '상호작용 응답속도' },
  cls:  { good: 0.1,  poor: 0.25, unit: '',   label: 'CLS', desc: '누적 레이아웃 이동' },
  ttfb: { good: 800,  poor: 1800, unit: 'ms', label: 'TTFB', desc: '첫 바이트 응답' },
} as const

type MetricKey = keyof typeof THRESHOLDS

function getRating(value: number, key: MetricKey): 'good' | 'needs-improvement' | 'poor' {
  const thr = THRESHOLDS[key]
  if (value <= thr.good) return 'good'
  if (value <= thr.poor) return 'needs-improvement'
  return 'poor'
}

const RATING_CONFIG = {
  'good':             { label: '양호', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' },
  'needs-improvement':{ label: '개선 필요', color: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30' },
  'poor':             { label: '미흡', color: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30' },
}

function formatValue(value: number, key: MetricKey): string {
  if (key === 'cls') return value.toFixed(2)
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

function MetricCard({ metricKey, metric }: { metricKey: MetricKey; metric: CruxMetric }) {
  const thr = THRESHOLDS[metricKey]
  const rating = getRating(metric.p75, metricKey)
  const cfg = RATING_CONFIG[rating]

  return (
    <div className={`bg-slate-900/40 rounded-xl border ${cfg.border} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-mono font-semibold text-slate-300">{thr.label}</span>
          <p className="text-[11px] text-slate-500 mt-0.5">{thr.desc}</p>
        </div>
        <div className="text-right">
          <span className={`text-xl font-bold tabular-nums ${cfg.color}`}>
            {formatValue(metric.p75, metricKey)}
          </span>
          <p className={`text-[11px] font-medium ${cfg.color} mt-0.5`}>{cfg.label}</p>
        </div>
      </div>

      {/* 사용자 분포 바 */}
      <div className="space-y-1">
        <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
          <div className="bg-emerald-500 rounded-l-full" style={{ width: `${metric.good}%` }} />
          <div className="bg-amber-500" style={{ width: `${metric.needsImprovement}%` }} />
          <div className="bg-red-500 rounded-r-full flex-1" />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span className="text-emerald-500/70">{metric.good}% 양호</span>
          <span className="text-amber-500/70">{metric.needsImprovement}% 개선필요</span>
          <span className="text-red-500/70">{metric.poor}% 미흡</span>
        </div>
      </div>
    </div>
  )
}

export default function CruxCard({ crux }: Props) {
  const entries = (
    [
      ['lcp', crux.lcp],
      ['fcp', crux.fcp],
      ['inp', crux.inp],
      ['cls', crux.cls],
      ['ttfb', crux.ttfb],
    ] as [MetricKey, CruxMetric | undefined][]
  ).filter((e): e is [MetricKey, CruxMetric] => e[1] !== undefined)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Chrome 실사용자 데이터 기준 · p75 (하위 75%)
        </p>
        {crux.collectionPeriod && (
          <span className="text-xs text-slate-600">{crux.collectionPeriod}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([key, metric]) => (
          <MetricCard key={key} metricKey={key} metric={metric} />
        ))}
      </div>
    </div>
  )
}
