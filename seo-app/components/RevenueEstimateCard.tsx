'use client'

import { RevenueEstimate } from '@/types/analysis'
import { Building2, FileText, Users, AlertTriangle } from 'lucide-react'

interface Props {
  estimate: RevenueEstimate
}

const SOURCE_CONFIG = {
  dart: {
    icon: FileText,
    label: 'DART 공시',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    note: '금융감독원 전자공시시스템 공식 데이터',
  },
  page_mention: {
    icon: Building2,
    label: '사이트 공개 수치',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    note: '홈페이지 본문에서 추출한 수치',
  },
  employee_benchmark: {
    icon: Users,
    label: '직원 수 기반 추정',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    note: '통계청 기업활동조사 업종별 1인당 매출 벤치마크 적용',
  },
} as const

const CONFIDENCE_CONFIG = {
  high:   { label: '신뢰도 높음', color: 'text-emerald-400' },
  medium: { label: '신뢰도 보통', color: 'text-amber-400' },
  low:    { label: '참고용 추정', color: 'text-amber-400' },
} as const

function formatBillion(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}조원`
  if (n >= 1)     return `${n.toLocaleString()}억원`
  return `${Math.round(n * 1000).toLocaleString()}만원`
}

export default function RevenueEstimateCard({ estimate }: Props) {
  const src  = SOURCE_CONFIG[estimate.source]
  const conf = CONFIDENCE_CONFIG[estimate.confidence]
  const Icon = src.icon
  const isLow = estimate.confidence === 'low'

  return (
    <div className="space-y-4">
      {/* 낮은 신뢰도 경고 배너 */}
      {isLow && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300 leading-relaxed">
            <span className="font-semibold">신뢰도 낮음</span> — 직원 수 업종 벤치마크 기반 추정값으로,
            실제 매출과 큰 차이가 있을 수 있습니다. 참고용으로만 활용하세요.
          </p>
        </div>
      )}

      {/* 메인 수치 */}
      <div className={`rounded-xl border p-5 ${src.bg}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${src.color}`} />
          <span className={`text-sm font-medium ${src.color}`}>{src.label}</span>
          <span className={`text-xs font-medium ${conf.color} ml-auto`}>{conf.label}</span>
        </div>

        {/* 낮은 신뢰도: 범위를 주 수치로, 중간값을 보조로 */}
        {isLow && estimate.range ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">{formatBillion(estimate.range.min)}</span>
              <span className="text-slate-400 text-lg">~</span>
              <span className="text-2xl font-bold text-white">{formatBillion(estimate.range.max)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">중간값 {formatBillion(estimate.amount)}</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{formatBillion(estimate.amount)}</span>
            </div>
            {estimate.range && (
              <p className="text-xs text-slate-400 mt-1">
                추정 범위: {formatBillion(estimate.range.min)} ~ {formatBillion(estimate.range.max)}
              </p>
            )}
          </>
        )}
      </div>

      {/* 산출 근거 */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-700/30 p-4 space-y-2">
        <p className="text-xs text-slate-500 font-medium">산출 근거</p>
        <p className="text-sm text-slate-300 leading-relaxed">{estimate.basis}</p>
        <p className="text-xs text-slate-600">{src.note}</p>
      </div>

      {/* 일반 추정값 경고 (dart·low 제외, low는 상단 배너로 대체) */}
      {estimate.source === 'page_mention' && (
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500/60" />
          <span>실제 매출과 차이가 있을 수 있습니다. 공식 재무제표 또는 사업자 공시 자료를 통해 확인하세요.</span>
        </div>
      )}
    </div>
  )
}
