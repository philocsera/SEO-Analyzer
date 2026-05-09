import { SeoCheckItem, BrandAwarenessScore } from '@/types/analysis'
import type { CrawlData } from './crawler'

export function calcTechnicalScore(items: SeoCheckItem[]): number {
  if (!items.length) return 0
  const scores: number[] = items.map((i) =>
    i.status === 'pass' ? 100 : i.status === 'warn' ? 50 : 0
  )
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// 종합 점수: 기술 SEO 70% + 브랜드 인지도 30%
export function calcOverallScore(technicalScore: number, brandAwarenessScore: number): number {
  return Math.round(technicalScore * 0.7 + brandAwarenessScore * 0.3)
}

export function calcBrandAwarenessScore(data: CrawlData): BrandAwarenessScore {
  // SNS 채널: 플랫폼당 10점, 3개 이상 만점(30점)
  const snsScore = Math.min(data.snsLinks.length * 10, 30)

  // About/소개 페이지: 30점
  const aboutScore = data.hasAboutPage ? 30 : 0

  // 로고: 20점
  const logoScore = data.hasLogo ? 20 : 0

  // 연락처 정보: 20점
  const contactScore = data.hasContactInfo ? 20 : 0

  const total = snsScore + aboutScore + logoScore + contactScore

  return {
    score: total,
    details: {
      snsPresence: { score: snsScore, platforms: data.snsLinks },
      aboutPage: { score: aboutScore, detected: data.hasAboutPage },
      logo: { score: logoScore, detected: data.hasLogo },
      contactInfo: { score: contactScore, detected: data.hasContactInfo },
    },
  }
}
