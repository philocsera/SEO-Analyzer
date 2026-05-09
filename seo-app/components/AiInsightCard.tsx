'use client'

import { AiAnalysis } from '@/types/analysis'
import { Sparkles, Target, Lightbulb, TrendingUp } from 'lucide-react'

interface Props {
  ai: AiAnalysis
}

const priorityConfig = {
  critical: { label: '긴급', color: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' },
  warning: { label: '주의', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-500' },
  info: { label: '참고', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', dot: 'bg-blue-500' },
}

export default function AiInsightCard({ ai }: Props) {
  return (
    <div className="space-y-6">
      {/* 업종·규모 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-base text-slate-500 mb-1">추정 업종</div>
          <div className="font-semibold text-slate-200">{ai.industry}</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-base text-slate-500 mb-1">기업 규모</div>
          <div className="font-semibold text-slate-200">{ai.businessSize}</div>
        </div>
      </div>

      {/* 타깃 고객 */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-400" />
          <span className="text-base font-medium text-slate-300">타깃 고객층</span>
        </div>
        <p className="text-base text-slate-400 leading-relaxed">{ai.targetAudience}</p>
      </div>

      {/* 브랜드 스토리 */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-base font-medium text-slate-300">브랜드 스토리</span>
        </div>
        <p className="text-base text-slate-400 leading-relaxed">{ai.brandStory}</p>
      </div>

      {/* 차별화 포인트 */}
      {ai.differentiators.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-emerald-400" />
            <span className="text-base font-medium text-slate-300">차별화 포인트</span>
          </div>
          <div className="space-y-2">
            {ai.differentiators.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
              >
                <span className="text-emerald-500 font-bold text-base mt-0.5">{i + 1}</span>
                <span className="text-base text-slate-300">{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 마케팅 전략 */}
      <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-xl p-4 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span className="text-base font-medium text-violet-300">마케팅 전략 제안</span>
        </div>
        <p className="text-base text-slate-300 leading-relaxed">{ai.marketingStrategy}</p>
      </div>

    </div>
  )
}
