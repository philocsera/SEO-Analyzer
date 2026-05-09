import { C } from './styles'

export function scoreColor(score: number) {
  if (score >= 80) return C.green
  if (score >= 50) return C.amber
  return C.red
}

export function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'A등급 · 우수', color: C.green }
  if (score >= 60) return { label: 'B등급 · 양호', color: '#84cc16' }
  if (score >= 40) return { label: 'C등급 · 개선필요', color: C.amber }
  return { label: 'D등급 · 긴급개선', color: C.red }
}

export function checkColors(status: string) {
  if (status === 'pass') return { bg: '#0a1f14', icon: C.green, text: C.green }
  if (status === 'warn') return { bg: '#1a1500', icon: C.amber, text: C.amber }
  return { bg: '#1c0a0a', icon: C.red, text: C.red }
}

export function impColors(priority: string) {
  if (priority === 'critical') return {
    border: C.red, headBg: '#1c0a0a', badgeBg: C.red, badgeText: '#fff', titleColor: '#fca5a5',
  }
  if (priority === 'warning') return {
    border: C.amber, headBg: '#1a1200', badgeBg: C.amber, badgeText: '#000', titleColor: '#fcd34d',
  }
  return {
    border: C.blue, headBg: '#0c1a2e', badgeBg: C.blue, badgeText: '#fff', titleColor: '#93c5fd',
  }
}

export function priorityLabel(p: string) {
  if (p === 'critical') return '긴급'
  if (p === 'warning') return '주의'
  return '참고'
}

// 키워드 표 색상: 결과 페이지 KeywordTable.tsx의 Tailwind 색상과 시각적으로 동일하게 매핑
export function searchVolumeColor(label: string): string {
  if (label === '매우 높음') return C.green
  if (label === '높음')      return C.blue
  if (label === '낮음')      return C.amber
  if (label === '매우 낮음') return C.textMuted
  return C.textPrimary // 보통
}

export function competitionColor(label: string): string {
  if (label === '높음')      return C.red
  if (label === '보통')      return C.amber
  if (label === '낮음')      return C.green
  if (label === '매우 낮음') return C.green
  return C.textPrimary
}
