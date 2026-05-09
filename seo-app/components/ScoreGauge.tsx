'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

interface Props {
  score: number
  label: string
  size?: number
}

function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number) {
  if (score >= 80) return '우수'
  if (score >= 50) return '개선 필요'
  return '긴급 개선'
}

export default function ScoreGauge({ score, label, size = 160 }: Props) {
  const color = scoreColor(score)
  const data = [{ value: score, fill: color }]

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            data={data}
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1e293b' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-400">{scoreLabel(score)}</span>
        </div>
      </div>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
    </div>
  )
}
