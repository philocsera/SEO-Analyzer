import OpenAI from 'openai'
import { CrawlData } from './crawler'
import { SeoCheckItem, AiAnalysis } from '@/types/analysis'
import type { DartLookupResult } from './dart'
import { parseAiJson } from './json-repair'

// GPT-5는 추론(reasoning) 모델이라 temperature 커스텀을 지원하지 않고(기본 1 고정),
// max_tokens 대신 max_completion_tokens를 쓰며 reasoning_effort로 추론 깊이를 조절한다.
// SEO 분석은 추출·생성 위주라 'low'면 충분하고 지연/비용도 낮다.
const SEO_MODEL = 'gpt-5'

// OpenAI SDK는 생성자에서 즉시 API 키를 검증해 던진다. 모듈 최상위에서 생성하면
// next build의 page-data 수집(키 미설정) 단계에서 빌드가 깨지므로, 실제 호출 시점에
// 지연 생성한다(요청 시점엔 guardAnalyzeRequest가 키 존재를 이미 보장).
// maxRetries: SDK가 429(rate limit) / 5xx에 대해 Retry-After 헤더를 존중하며
// 지수 백오프로 자동 재시도. 429 응답은 모델이 실행되기 전에 거부되므로 비용 0.
// 총 시도 = 1(초기) + 4(재시도) = 5회. route.ts의 maxDuration=120s 안에서 안전.
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 4 })
  }
  return _client
}

const SYSTEM_PROMPT = `당신은 10년 경력의 SEO 전문가이자 디지털 마케팅 컨설턴트입니다.
웹사이트 데이터를 분석하여 다음을 제공합니다:
- 업종·규모 정확한 추정
- 브랜드 포지셔닝 분석
- 구체적이고 실행 가능한 SEO 개선 제안
- 마케팅 전략 인사이트

반드시 한국어로 답변하고, 순수 JSON만 출력하세요. 마크다운 코드블록(\`\`\`)을 사용하지 마세요.`

// 단일 AI 호출. 파싱은 json-repair.ts의 3단계 폴백(JSON.parse → sanitize → repair)으로
// 충분하므로 외부 재시도 루프는 두지 않음. 외부 재시도는 매번 토큰 비용을 발생시킴.
async function callAi(
  client: OpenAI,
  prompt: string,
  systemPrompt: string,
): Promise<AiAnalysis> {
  const response = await client.chat.completions.create({
    model: SEO_MODEL,
    // 추론 토큰이 출력 예산을 함께 소비하므로 JSON(~3k) + 추론 헤드룸을 넉넉히 확보.
    max_completion_tokens: 12000,
    reasoning_effort: 'low',
    // 유효한 JSON 출력을 강제 (프롬프트에 'JSON' 단어 포함 필수 — system/prompt에 충족).
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  })
  // 빈 응답·content 누락에서 깨지지 않도록 안전하게 추출하고, 없으면 명시적 에러로 처리.
  const text = response.choices[0]?.message?.content ?? ''
  if (!text) {
    throw new Error('AI 분석 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.')
  }
  return parseAiJson<AiAnalysis>(text)
}

export async function analyzeWithAI(
  crawlData: CrawlData,
  seoItems: SeoCheckItem[],
  dartInfo?: DartLookupResult
): Promise<AiAnalysis> {
  const failedItems = seoItems
    .filter((i) => i.status !== 'pass')
    .map((i) => `[${i.status.toUpperCase()}] ${i.label}: ${i.value}`)
    .join('\n')

  const dartSection = dartInfo?.found && dartInfo.businessSize
    ? `## 기업 규모 (DART 공시 데이터 — 확정값)
- 법인명: ${dartInfo.corpName ?? '확인됨'}
- 직원 수: ${dartInfo.employees != null ? `${dartInfo.employees.toLocaleString()}명` : '미공시'}
- 매출액: ${dartInfo.revenue != null ? `${dartInfo.revenue.toLocaleString()}억원` : '미공시'}
- 판정 기준: ${dartInfo.basis}
→ businessSize 필드는 반드시 "${dartInfo.businessSize}"으로 출력하세요.`
    : ''

  const prompt = `다음 웹사이트 데이터를 분석해주세요.
${dartSection ? '\n' + dartSection + '\n' : ''}
## 웹사이트 기본 정보
- URL: ${crawlData.url}
- 제목: ${crawlData.title}
- OG 제목: ${crawlData.ogTitle || '없음'}
- 메타 설명: ${crawlData.metaDescription || '없음'}
- OG 설명: ${crawlData.ogDescription || '없음'}
- H1: ${crawlData.h1s.join(', ') || '없음'}
- H2 목록: ${crawlData.h2s.slice(0, 10).join(' | ') || '없음'}
- H3 목록: ${crawlData.h3s.slice(0, 8).join(' | ') || '없음'}
- 키워드: ${crawlData.metaKeywords || '없음'}
- 본문 발췌: ${crawlData.bodyText.slice(0, 2500)}

## SEO 기술 점검 결과 (미통과 항목)
${failedItems || '없음 (모두 통과)'}

아래 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON):
{
  "industry": "추정 업종",
  "businessSize": "소규모/중소기업/중견기업/대기업",
  "targetAudience": "핵심 타깃 고객층 설명 (2~3문장)",
  "brandStory": "브랜드 스토리·철학 추정 (3~4문장)",
  "differentiators": ["차별화 포인트 1", "차별화 포인트 2", "차별화 포인트 3"],
  "improvements": [
    { "priority": "critical", "category": "기술 SEO", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "critical", "category": "콘텐츠", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "warning", "category": "UX", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "warning", "category": "마케팅", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "info", "category": "브랜딩", "title": "개선 제목", "detail": "구체적 개선 방법" }
  ],
  "marketingStrategy": "마케팅 전략 종합 제안 (5~7문장)",
  "seoRecommendations": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "brandAwarenessLabels": {
    "messageConsistency": "높음|보통|낮음 중 하나",
    "targetClarity": "높음|보통|낮음 중 하나",
    "differentiationStrength": "높음|보통|낮음 중 하나"
  }
}`

  return callAi(getClient(), prompt, SYSTEM_PROMPT)
}

export async function analyzeSmartStoreWithAI(
  storeSlug: string,
  smartstore: {
    storeName: string
    products: { name: string; price: string; keywords: string[]; brand?: string; category?: string }[]
    categories: string[]
  }
): Promise<AiAnalysis> {
  const productSample = smartstore.products
    .slice(0, 8)
    .map((p, i) => {
      const brandPart = p.brand ? ` [${p.brand}]` : ''
      const catPart = p.category ? ` (${p.category})` : ''
      return `${i + 1}. ${p.name}${brandPart}${catPart} | ${p.price} | 키워드: ${p.keywords.join(', ')}`
    })
    .join('\n')

  const prompt = `다음 네이버 스마트스토어를 분석해주세요.

## 데이터 출처 안내 (중요)
이 분석은 **네이버 검색 API의 공식 메타데이터(상품명, 가격, 카테고리, 브랜드)만**을 바탕으로 합니다.
다음 데이터는 제공되지 않으므로 **추측하거나 언급하지 마세요**:
- 리뷰 수, 평점, 판매량
- 검색 결과 내 노출 순위
- 페이지 메타데이터(title/description), 이미지 alt
조언은 **상품명·키워드 최적화, 카테고리 전략, 상품 라인업, 브랜드 노출** 관점에서만 작성하세요.

## 스토어 정보
- 스토어 URL: smartstore.naver.com/${storeSlug}
- 스토어명: ${smartstore.storeName}
- 상품 수: ${smartstore.products.length}개
- 수집된 카테고리: ${smartstore.categories.join(', ') || '없음'}

## 상품 목록 (상위 ${Math.min(8, smartstore.products.length)}개)
${productSample || '상품 정보 없음'}

아래 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON):
{
  "industry": "추정 카테고리/업종",
  "businessSize": "소규모/중소기업/중견기업",
  "targetAudience": "핵심 구매 타깃 (2~3문장)",
  "brandStory": "브랜드 스토리·포지셔닝 추정 (3~4문장)",
  "differentiators": ["차별화 포인트 1", "차별화 포인트 2", "차별화 포인트 3"],
  "improvements": [
    { "priority": "critical", "category": "상품명 SEO", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "critical", "category": "키워드 전략", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "warning", "category": "카테고리 전략", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "warning", "category": "상품 라인업", "title": "개선 제목", "detail": "구체적 개선 방법" },
    { "priority": "info", "category": "브랜딩", "title": "개선 제목", "detail": "구체적 개선 방법" }
  ],
  "marketingStrategy": "네이버 쇼핑 노출 향상 및 마케팅 전략 (5~7문장, 리뷰·평점·순위 언급 금지)",
  "seoRecommendations": ["추천 키워드1", "추천 키워드2", "추천 키워드3", "추천 키워드4", "추천 키워드5"],
  "brandAwarenessLabels": {
    "messageConsistency": "높음|보통|낮음 중 하나",
    "targetClarity": "높음|보통|낮음 중 하나",
    "differentiationStrength": "높음|보통|낮음 중 하나"
  }
}`

  return callAi(getClient(), prompt, SYSTEM_PROMPT)
}
