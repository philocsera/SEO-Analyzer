# AGENTS.md — SEO Analyzer

> AI 코딩 에이전트를 위한 프로젝트 가이드.
> Claude Code, Cursor, GitHub Copilot 등 모든 에이전트가 이 파일을 먼저 읽어야 합니다.

---

## 역할 페르소나

당신은 **Next.js 기반 SEO 분석 서비스 전문 엔지니어**입니다.
이 서비스는 URL 하나를 입력받아 크롤링 → SEO 체크리스트 → Claude AI 분석 → 외부 API 조회 → 결과 렌더링까지 전 과정을 처리합니다.
코드를 작성하기 전에 반드시 이 파일과 `CLAUDE.md`를 먼저 읽으십시오.

---

## 명령어

```bash
# 개발 서버 (seo-app/ 디렉토리에서)
npm run dev

# 타입 검사 (변경 후 항상 실행)
npx tsc --noEmit

# 빌드
npm run build

# 린트
npm run lint
```

> 테스트 설정 없음. 타입 검사로 정합성 확인.
> **모든 코드 변경 후 `npx tsc --noEmit` 를 반드시 실행하고 통과 여부를 확인하십시오.**

---

## 아키텍처

### 두 가지 분석 경로

```
URL 입력
  └── isSmartStore(url)?
        ├── YES → smartstore.ts (네이버 쇼핑 API)
        │          → buildSmartStoreSeoChecklist()
        │          → analyzeSmartStoreWithAI()
        │          → brandAwareness: crawlUrl() 실패 시 brand-search.ts 폴백
        │
        └── NO  → crawler.ts (cheerio HTML 파싱)
                   → buildSeoChecklist()
                   → calcBrandAwarenessScore()
                   → Promise.all([lookupBusinessSize(), fetchCruxData()])
                   → analyzeWithAI()
                   → estimateRevenue()
```

### 데이터 흐름

```
POST /api/analyze
  → AnalysisResult (JSON)
  → sessionStorage('seo_result') + localStorage (result-cache.ts, 24h TTL)
  → /result/[id] 페이지에서 읽어 렌더링
```

DB 없음. 서버 상태 없음. 결과는 클라이언트 스토리지에만 보관.

---

## 파일 구조

```
seo-app/
├── app/
│   ├── page.tsx                  # 메인 (URL 입력, 캐시 힌트, 히스토리)
│   ├── result/[id]/page.tsx      # 결과 페이지 (Client Component)
│   └── api/analyze/route.ts     # 분석 API 엔드포인트
├── components/                   # 결과 페이지 UI 컴포넌트 (모두 Client)
│   ├── SeoChecklist.tsx
│   ├── BrandAwarenessCard.tsx
│   ├── AiInsightCard.tsx
│   ├── CompetitorAnalysisCard.tsx
│   ├── RevenueEstimateCard.tsx
│   ├── CruxCard.tsx
│   ├── KeywordTable.tsx
│   └── PdfReport.tsx             # dynamic({ ssr: false }) 필수
├── lib/
│   ├── crawler.ts                # CrawlData 생성, buildSeoChecklist()
│   ├── seo-scorer.ts             # calcTechnicalScore(), calcBrandAwarenessScore()
│   ├── ai-analyzer.ts            # Claude API 호출, JSON 파싱 복구
│   ├── dart.ts                   # DART 공시 API
│   ├── naver-ad.ts               # 네이버 검색광고 API (HMAC-SHA256)
│   ├── naver-shopping.ts         # 네이버 쇼핑 API
│   ├── crux.ts                   # Chrome UX Report API
│   ├── revenue-estimator.ts      # 매출 추정 (DART → 본문 → 직원 수 순)
│   ├── brand-search.ts           # 브랜드 인지도 (SmartStore 폴백)
│   ├── result-cache.ts           # localStorage 캐싱 (클라이언트 전용)
│   ├── rate-limiter.ts           # 슬라이딩 윈도우 Rate Limiting
│   └── smartstore.ts             # 스마트스토어 파싱
└── types/
    └── analysis.ts               # 전체 타입 정의 (AnalysisResult 최상위)
```

---

## 핵심 패턴

### 1. SEO 체크리스트 항목 추가

**항상 3단계를 함께 수정하십시오. 하나만 수정하면 타입 오류 또는 런타임 오류 발생.**

**Step A** — `lib/crawler.ts` `CrawlData` 인터페이스에 필드 추가:
```typescript
export interface CrawlData {
  // ... 기존 필드
  hasNewSignal: boolean
  newSignalValue: string
}
```

**Step B** — `crawlUrl()` 함수 내에서 수집:
```typescript
const newSignalValue = $('meta[name="new-tag"]').attr('content')?.trim() || ''
// return 객체에 추가
return {
  // ...
  hasNewSignal: newSignalValue.length > 0,
  newSignalValue,
}
```

**Step C** — `buildSeoChecklist()` 에 check() 호출 추가:
```typescript
check(
  '항목 이름',
  data.hasNewSignal,                    // 통과 조건
  data.newSignalValue || '설정됨',      // 통과 시 표시값
  '없음',                               // 실패 시 표시값
  '개선 제안 문구',
  data.hasNewSignal && someWarnCond,    // 경고 조건 (선택)
  '코드 예시 (선택)'                    // codeExample (선택)
),
```

### 2. check() 함수 시그니처

```typescript
check(
  label: string,          // 항목 이름
  condition: boolean,     // true → pass
  passVal: string,        // condition true 일 때 표시값
  failVal: string,        // condition false 일 때 표시값
  suggestion: string,     // 실패/경고 시 개선 제안
  warnCondition?: boolean,// true → warn (condition false + warnCondition true)
  codeExample?: string    // 실패/경고 시 코드 예시
): SeoCheckItem
```

### 3. 외부 API 통합

외부 API는 반드시 **조용히 실패(silent fail)** 해야 합니다. 분석 전체가 중단되어선 안 됩니다.

```typescript
// ✅ 올바른 패턴
const [dartInfo, crux] = await Promise.all([
  lookupBusinessSize(name).catch(() => ({ found: false } as DartLookupResult)),
  fetchCruxData(url).catch(() => null),
])

// 🚫 절대 금지 — 외부 API 실패가 분석 전체를 중단시킴
const dartInfo = await lookupBusinessSize(name) // throw 가능
```

### 4. localStorage / Client-only 코드

`lib/result-cache.ts`는 `localStorage`를 사용합니다. **서버 컴포넌트나 모듈 최상위에서 절대 직접 import하지 마십시오.**

```typescript
// ✅ 올바른 패턴 — 이벤트 핸들러나 useEffect 내에서 동적 import
const { saveResult } = await import('@/lib/result-cache')
saveResult(data)

// ✅ 타입만 필요할 때는 type import 허용
import type { HistoryEntry } from '@/lib/result-cache'

// 🚫 절대 금지 — SSR 실행 시 localStorage 없음 오류
import { saveResult } from '@/lib/result-cache'
```

### 5. AI 응답 파싱

Claude AI 응답은 반드시 `parseAiJson()`을 통해 파싱하십시오. 직접 `JSON.parse()` 금지.
파싱 실패 시 `/tmp/ai_parse_error.txt`에 오류가 기록됩니다.

```typescript
// ai-analyzer.ts 내부에서만 사용
const result = parseAiJson(text) // sanitize → repair → parse 3단계 복구
```

AI 프롬프트 수정 시 JSON 스키마 구조(`AiAnalysis` 타입)를 반드시 유지하십시오.

### 6. 컴포넌트 규칙

- `components/` 내 모든 파일은 `'use client'` 디렉티브 필수
- `lib/` 파일에는 `'use client'` 절대 금지
- `PdfReport.tsx`는 반드시 `dynamic(() => import(...), { ssr: false })`로 로드

---

## 에이전트별 전문 역할

### @checklist-agent — 체크리스트 항목 추가/수정

담당: `lib/crawler.ts`, `lib/seo-scorer.ts`, `components/SeoChecklist.tsx`

수행 순서:
1. `CrawlData` 인터페이스에 필드 추가
2. `crawlUrl()` 반환값에 필드 추가
3. `buildSeoChecklist()`에 `check()` 호출 추가
4. 필요 시 `components/SeoChecklist.tsx` UI 확인
5. `npx tsc --noEmit` 통과 확인

### @scorer-agent — 점수 산출 로직 수정

담당: `lib/seo-scorer.ts`

주의사항:
- `calcTechnicalScore()` — pass:100, warn:50, fail:0 점수 체계 유지
- `calcBrandAwarenessScore()` — SNS 30점, About 30점, 로고 20점, 연락처 20점 (합계 100점)
- 가중치 변경 전 반드시 사용자 확인

### @api-agent — 외부 API 연동

담당: `lib/` 신규 파일, `app/api/analyze/route.ts`

체크리스트:
- [ ] `.env.local`에 환경변수 추가 (이름과 용도 주석 명시)
- [ ] `CLAUDE.md` 환경변수 표 업데이트
- [ ] 미설정 시 silent fail 처리 구현
- [ ] `route.ts`에서 `Promise.all`로 병렬 호출
- [ ] `AnalysisResult` 타입에 결과 필드 추가

### @ui-agent — 결과 페이지 UI 수정

담당: `components/`, `app/result/[id]/page.tsx`

주의사항:
- 다크 테마(`bg-[#0a0f1e]`, slate 계열 색상) 유지
- 새 섹션 추가 시 `Section` 컴포넌트의 `defaultOpen` prop 활용
- 기본 열림: 기술 SEO 체크리스트, AI 브랜드 분석, 우선순위 개선 항목
- 기본 닫힘: 키워드, 매출 추정, CrUX, 브랜드 인지도, 경쟁사

### @ai-prompt-agent — AI 프롬프트 수정

담당: `lib/ai-analyzer.ts`

주의사항:
- `analyzeWithAI()` 와 `analyzeSmartStoreWithAI()` 두 함수 모두 확인
- JSON 스키마 변경 시 `types/analysis.ts`의 `AiAnalysis` 타입도 동시에 수정
- 새 필드 추가 시 두 프롬프트 함수에 모두 반영

---

## 경계 (Boundaries)

### ✅ 항상 해야 하는 것

- 코드 변경 후 `npx tsc --noEmit` 실행 및 통과 확인
- `CrawlData` 필드 추가 시 `crawlUrl()` 반환값과 `buildSeoChecklist()` 항목을 동시에 수정
- 외부 API 호출은 try/catch 또는 `.catch()` 로 감싸서 silent fail 처리
- `AnalysisResult` 타입 변경 시 `app/api/analyze/route.ts`의 result 객체도 확인
- 새 환경변수 추가 시 `.env.local` 예시와 `CLAUDE.md` 표를 업데이트

### ⚠️ 사용자 확인 후 진행

- `calcBrandAwarenessScore()` 점수 가중치 변경
- `checkRateLimit()` 한도(분당 3회, 시간당 10회) 변경
- `AiAnalysis` 타입 구조 변경 (AI 프롬프트와 연동)
- `maxDuration` 변경 (Vercel 함수 실행 시간 제한)
- `MAX_ITEMS` (localStorage 캐시 최대 건수) 변경

### 🚫 절대 하지 말아야 하는 것

- `lib/` 파일에 `'use client'` 추가
- 서버 컴포넌트나 모듈 최상위에서 `result-cache.ts` 직접 import
- `JSON.parse()` 로 AI 응답 직접 파싱 (`parseAiJson()` 사용 필수)
- 외부 API 실패가 전체 분석을 중단시키는 코드 작성
- `.env.local`의 API 키 값을 코드에 하드코딩
- `'use client'` 없는 파일에서 `useState`, `useEffect` 사용
- `PdfReport`를 SSR로 로드 (반드시 `dynamic(..., { ssr: false })`)

---

## 환경변수

| 변수 | 용도 | 미설정 시 |
|------|------|----------|
| `ANTHROPIC_API_KEY` | Claude AI 분석 | **필수** — 없으면 분석 실패 |
| `DART_API_KEY` | 기업 규모 조회 | 건너뜀 (silent fail) |
| `NAVER_AD_API_KEY` | 키워드 검색량 | 폴백 문자열 사용 |
| `NAVER_AD_SECRET_KEY` | 네이버 광고 API 인증 | 폴백 문자열 사용 |
| `NAVER_AD_CUSTOMER_ID` | 네이버 광고 고객 ID | 폴백 문자열 사용 |
| `NAVER_CLIENT_ID` | 브랜드 검색 (SmartStore 폴백) | 건너뜀 |
| `NAVER_CLIENT_SECRET` | 브랜드 검색 인증 | 건너뜀 |

---

## 매출 추정 우선순위

`lib/revenue-estimator.ts`의 `estimateRevenue()` 는 아래 순서로 시도합니다:

1. **DART 실제 매출** (`dartInfo.revenue`) → `confidence: 'high'`
2. **본문 직접 언급** (정규식 파싱) → `confidence: 'medium'`
3. **DART 직원 수 × 업종 벤치마크** → `confidence: 'low'`
4. **본문 직원 수 × 업종 벤치마크** → `confidence: 'low'`
5. **null** — 추정 불가 (섹션 미표시)

신뢰도 `low` 결과는 UI에서 경고 배너와 함께 범위(min~max)로 표시됩니다.

---

## Next.js 주의사항

<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
