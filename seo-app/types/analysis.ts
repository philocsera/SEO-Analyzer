export type SeoStatus = 'pass' | 'warn' | 'fail'

export interface CruxMetric {
  p75: number
  good: number        // % of users with good experience
  needsImprovement: number
  poor: number
}

export interface CruxData {
  collectionPeriod: string
  lcp?: CruxMetric   // ms
  fcp?: CruxMetric   // ms
  inp?: CruxMetric   // ms
  cls?: CruxMetric   // value * 100 for display
  ttfb?: CruxMetric  // ms
}

export interface SeoCheckItem {
  label: string
  status: SeoStatus
  value: string
  suggestion?: string
  codeExample?: string
}


export interface SmartStoreProduct {
  name: string
  price: string
  originalPrice?: string
  keywords: string[]
  brand?: string
  category?: string
  imageUrl?: string
}

export interface Improvement {
  priority: 'critical' | 'warning' | 'info'
  category: string
  title: string
  detail: string
}

export interface KeywordTrack {
  keyword: string
  searchVolume: string
  competition: string
  topProducts: {
    name: string
    price: string
    reviewCount: number
  }[]
}


export interface RevenueEstimate {
  amount: number  // 억원 (중간값)
  range?: { min: number; max: number }
  source: 'dart' | 'page_mention' | 'employee_benchmark'
  confidence: 'high' | 'medium' | 'low'
  basis: string
}

export interface BrandAwarenessDetails {
  snsPresence: { score: number; platforms: string[] }
  aboutPage: { score: number; detected: boolean }
  logo: { score: number; detected: boolean }
  contactInfo: { score: number; detected: boolean }
}

export interface BrandAwarenessScore {
  score: number
  details: BrandAwarenessDetails
  aiLabels?: {
    messageConsistency: '높음' | '보통' | '낮음'
    targetClarity: '높음' | '보통' | '낮음'
    differentiationStrength: '높음' | '보통' | '낮음'
  }
}

export interface AiAnalysis {
  industry: string
  businessSize: string
  targetAudience: string
  brandStory: string
  differentiators: string[]
  improvements: Improvement[]
  marketingStrategy: string
  seoRecommendations: string[]
  brandAwarenessLabels?: {
    messageConsistency: '높음' | '보통' | '낮음'
    targetClarity: '높음' | '보통' | '낮음'
    differentiationStrength: '높음' | '보통' | '낮음'
  }
}

export interface AnalysisResult {
  id: string
  url: string
  analyzedAt: string
  overallScore: number
  technical: {
    score: number
    items: SeoCheckItem[]
  }
  smartstore?: {
    storeName: string
    products: SmartStoreProduct[]
    categories: string[]
    dataLimitations: string[]
  }
  ai: AiAnalysis
  keywords: KeywordTrack[]
  brandAwareness?: BrandAwarenessScore
  crux?: CruxData
  revenueEstimate?: RevenueEstimate
  error?: string
}
