'use client'

import { KeywordTrack } from '@/types/analysis'
import { Search } from 'lucide-react'

interface Props {
  keywords: KeywordTrack[]
}

const volumeColor = {
  '매우 높음': 'text-emerald-400',
  '높음': 'text-blue-400',
  '보통': 'text-slate-300',
  '낮음': 'text-amber-400',
  '매우 낮음': 'text-slate-500',
}

const compColor = {
  '높음': 'text-red-400',
  '보통': 'text-amber-400',
  '낮음': 'text-emerald-400',
  '매우 낮음': 'text-emerald-500',
}

export default function KeywordTable({ keywords }: Props) {
  if (!keywords.length) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-slate-300">AI 추천 SEO 키워드</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">#</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">키워드</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">검색량</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">경쟁도</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => (
              <tr
                key={i}
                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="bg-slate-700/50 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium">
                    {kw.keyword}
                  </span>
                </td>
                <td className={`px-4 py-3 font-medium ${volumeColor[kw.searchVolume as keyof typeof volumeColor] || 'text-slate-300'}`}>
                  {kw.searchVolume}
                </td>
                <td className={`px-4 py-3 font-medium ${compColor[kw.competition as keyof typeof compColor] || 'text-slate-300'}`}>
                  {kw.competition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
