'use client'

import { SeoCheckItem } from '@/types/analysis'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  items: SeoCheckItem[]
}

const icons = {
  pass: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
  warn: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  fail: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
}

const badges = {
  pass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warn: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  fail: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

const labels = { pass: '통과', warn: '경고', fail: '실패' }

export default function SeoChecklist({ items }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const pass = items.filter((i) => i.status === 'pass').length
  const warn = items.filter((i) => i.status === 'warn').length
  const fail = items.filter((i) => i.status === 'fail').length

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm mb-4">
        <span className="text-emerald-400">✓ 통과 {pass}</span>
        <span className="text-amber-400">⚠ 경고 {warn}</span>
        <span className="text-red-400">✗ 실패 {fail}</span>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden"
        >
          <button
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/30 transition-colors"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            {icons[item.status]}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-200">{item.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badges[item.status]}`}>
                  {labels[item.status]}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5 truncate">{item.value}</p>
            </div>
            {item.suggestion &&
              (expanded === i ? (
                <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ))}
          </button>
          {expanded === i && item.suggestion && (
            <div className="px-4 pb-4 pt-0">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
                <p className="text-sm text-slate-300">
                  <span className="text-blue-400 font-medium">개선 제안: </span>
                  {item.suggestion}
                </p>
                {item.codeExample && (
                  <pre className="text-xs text-emerald-300 bg-slate-950/70 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all border border-slate-700/40">
                    {item.codeExample}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
