'use client'

import { BrandAwarenessScore } from '@/types/analysis'
import { CheckCircle2, XCircle, Minus } from 'lucide-react'

interface Props {
  brandAwareness: BrandAwarenessScore
}

const LABEL_COLOR = {
  '높음': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  '보통': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  '낮음': 'text-red-400 bg-red-500/10 border-red-500/30',
} as const

function scoreColor(score: number, max: number) {
  const ratio = score / max
  if (ratio >= 0.8) return 'text-emerald-400'
  if (ratio >= 0.4) return 'text-amber-400'
  return 'text-red-400'
}

function DetectedIcon({ detected }: { detected: boolean }) {
  return detected
    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-red-400/60 flex-shrink-0" />
}

interface SignalRowProps {
  label: string
  maxScore: number
  score: number
  detected: boolean
  sub?: string
}

function SignalRow({ label, maxScore, score, detected, sub }: SignalRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <DetectedIcon detected={detected} />
        <div className="min-w-0">
          <span className="text-sm text-slate-300">{label}</span>
          {sub && (
            <span className="ml-2 text-xs text-slate-500 truncate">{sub}</span>
          )}
        </div>
      </div>
      <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ml-4 ${scoreColor(score, maxScore)}`}>
        {score}<span className="text-slate-600 font-normal">/{maxScore}</span>
      </span>
    </div>
  )
}

export default function BrandAwarenessCard({ brandAwareness }: Props) {
  const { score, details, aiLabels } = brandAwareness
  const d = details

  const barWidth = Math.min(score, 100)
  const barColor =
    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const scoreTextColor =
    score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
  const scoreGrade =
    score >= 70 ? '우수' : score >= 40 ? '개선 필요' : '미흡'

  return (
    <div className="space-y-5">
      {/* 종합 점수 바 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">온라인 브랜드 존재감</span>
            <span className={`text-xs font-medium ${scoreTextColor}`}>{scoreGrade}</span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <span className={`text-3xl font-bold tabular-nums ${scoreTextColor}`}>
          {score}
          <span className="text-base font-normal text-slate-500">/100</span>
        </span>
      </div>

      {/* 신호별 상세 */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-700/30 px-4">
        <SignalRow
          label="SNS 채널 연결"
          maxScore={30}
          score={d.snsPresence.score}
          detected={d.snsPresence.platforms.length > 0}
          sub={
            d.snsPresence.platforms.length > 0
              ? d.snsPresence.platforms.join(' · ')
              : '연결된 SNS 없음'
          }
        />
        <SignalRow
          label="About/소개 페이지"
          maxScore={30}
          score={d.aboutPage.score}
          detected={d.aboutPage.detected}
        />
        <SignalRow
          label="로고 이미지"
          maxScore={20}
          score={d.logo.score}
          detected={d.logo.detected}
        />
        <SignalRow
          label="연락처 정보"
          maxScore={20}
          score={d.contactInfo.score}
          detected={d.contactInfo.detected}
          sub={d.contactInfo.detected ? '전화·이메일·주소 중 감지됨' : undefined}
        />
      </div>

      {/* AI 정성 레이블 */}
      {aiLabels && (
        <div>
          <p className="text-xs text-slate-500 mb-2.5">AI 브랜드 품질 평가</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'messageConsistency', label: '메시지 일관성' },
                { key: 'targetClarity', label: '타깃 명확성' },
                { key: 'differentiationStrength', label: '차별화 강도' },
              ] as const
            ).map(({ key, label }) => {
              const val = aiLabels[key]
              return (
                <div
                  key={key}
                  className={`rounded-lg border px-3 py-2 text-center ${LABEL_COLOR[val]}`}
                >
                  <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold">{val}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
