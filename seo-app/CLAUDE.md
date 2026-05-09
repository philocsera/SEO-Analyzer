# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Next.js 16 주의**: 훈련 데이터의 Next.js와 API·컨벤션이 다를 수 있습니다. 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인하세요.

## Commands

```bash
# 개발 서버 (seo-app/ 디렉토리에서)
npm run dev

# 빌드 / 프로덕션 실행
npm run build && npm start

# 린트
npm run lint
```

> 테스트 설정 없음. 타입 검사는 `npx tsc --noEmit`.

## Architecture

### 분석 파이프라인

URL 입력 → `POST /api/analyze` → 크롤링 → SEO 점검 → Claude AI 분석 → 외부 API 조회 → `AnalysisResult` 반환

결과는 `sessionStorage('seo_result')`에 저장되고, `/result/[id]` 페이지가 이를 읽어 렌더링합니다. DB 없음, 서버 상태 없음.

### 분석 라우트 (`app/api/analyze/route.ts`)

단일 엔드포인트가 `isSmartStore()` 결과로 두 흐름 중 하나로 분기합니다. 공통 가드(환경변수·rate-limit·SSRF·URL 정규화)는 `lib/analyze-common.ts`의 `guardAnalyzeRequest()`로 추출되어 있습니다.

**스마트스토어 흐름** (`analyzeSmartStoreFlow`):  
`smartstore.ts` → `naver-shopping.ts`로 상품 목록 파싱 → `buildSmartStoreSeoChecklist()` → `analyzeSmartStoreWithAI()` → 브랜드 인지도는 `brand-search.ts` 사용

**일반 웹사이트 흐름** (`analyzeWebsiteFlow`):  
`crawler.ts`(cheerio) → `buildSeoChecklist()` → `calcBrandAwarenessScore()` → DART 기업 규모 조회 + CrUX 병렬 실행 → `analyzeWithAI()` → `estimateRevenue()`

### 핵심 모듈

| 파일 | 역할 |
|------|------|
| `lib/crawler.ts` | cheerio로 HTML 파싱, `CrawlData` 생성. 브랜드 인지도 신호(SNS 링크, 로고, 연락처 등) 포함 |
| `lib/seo-scorer.ts` | `calcTechnicalScore()`, `calcBrandAwarenessScore()` — 각 항목 점수 가중합 |
| `lib/ai-analyzer.ts` | Claude `claude-sonnet-4-6` 호출, JSON 파싱 실패 시 `sanitizeJson` → `repairTruncatedJson` 3단계 복구 |
| `lib/dart.ts` | DART 공시 API로 법인명 검색 → 직원 수·매출 조회 → 기업 규모 분류 |
| `lib/naver-ad.ts` | 네이버 검색광고 API로 키워드 검색량·경쟁도 조회 (HMAC-SHA256 인증) |
| `lib/naver-shopping.ts` | 네이버 쇼핑 API로 스마트스토어 상품 목록 수집 |
| `lib/crux.ts` | Chrome UX Report API — LCP, FCP, INP, CLS, TTFB |
| `types/analysis.ts` | 전체 타입 정의 (`AnalysisResult`가 최상위) |

### 컴포넌트

`/result/[id]`는 모두 Client Component이며 `sessionStorage`에서 데이터 로드. `PdfReport`는 `dynamic(..., { ssr: false })`로 로드.

## 환경 변수 (`.env.local`)

| 변수 | 용도 | 미설정 시 |
|------|------|----------|
| `ANTHROPIC_API_KEY` | Claude AI 분석 | 필수 — 없으면 분석 실패 |
| `DART_API_KEY` | 기업 규모 조회 | 건너뜀 (조용히 실패) |
| `NAVER_AD_API_KEY` / `NAVER_AD_SECRET_KEY` / `NAVER_AD_CUSTOMER_ID` | 키워드 통계 | 폴백 문자열 사용 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 브랜드 검색(스마트스토어 폴백) | 건너뜀 |

## 주요 패턴

- **AI JSON 파싱**: Claude 응답은 항상 `parseAiJson()`을 통해 파싱. 1차 `JSON.parse` 실패 시 `sanitizeJson` → `repairTruncatedJson` 순으로 폴백하며, 모두 실패하면 `console.error`로 로그.
- **API 응답 타임아웃**: `route.ts`에 `export const maxDuration = 120` 설정됨 (Vercel 함수 제한).
- **Anthropic 재시도**: `Anthropic` 클라이언트에 `maxRetries: 4` 설정. SDK가 429/5xx에 대해 `Retry-After`를 존중하며 자동 백오프. 429는 모델 실행 전 거부되므로 비용 0.
- **스코어 가중치**: 일반 사이트는 `기술점수 × 0.7 + 브랜드인지도 × 0.3`. 스마트스토어는 단일 점수(기술점수 = Naver 가이드 기반 체크리스트 점수).
- **브랜드 인지도 점수**: 최대 100점 — SNS(플랫폼당 10점, 최대 30) + About 페이지(30) + 로고(20) + 연락처(20).
- **디버그 로그**: `lib/naver-shopping.ts`, `lib/naver-ad.ts`의 진단 로그는 `DEBUG_NAVER` 환경변수로 게이팅. 평소엔 출력되지 않음.

## SEO 체크리스트 근거 (중요)

**모든 체크 항목은 공식 출처에 근거해야 한다.** 자의적 휴리스틱(예: "본문 ≥300단어", "내부 링크 ≥10개")은 코드베이스에서 의도적으로 제거되었으며, 출처가 없는 항목을 다시 추가하지 않는다.

### 일반 웹사이트 (`buildSeoChecklist`, 13개)

| 항목 | 출처 |
|------|------|
| 페이지 제목 / Meta Description / Viewport / Canonical / 이미지 alt / 색인 허용 / robots.txt / 링크 텍스트 / 크롤 가능 앵커 / 플러그인 | Lighthouse v12 SEO category audits |
| HTTPS | Google 공식 랭킹 시그널 (2014 발표) |
| sitemap.xml | Google Search Central — Sitemaps overview |
| 구조화 데이터 | Google Search Central — Structured data |

각 체크의 audit ID와 공식 문서 URL은 `lib/crawler/checklist.ts`의 주석에 명시되어 있다.

**현재 cheerio로 검증 불가한 Lighthouse audit** (헤드리스 브라우저 필요): `font-size`, `tap-targets`, `legible-font`. 향후 Puppeteer 통합 시 추가.

### 스마트스토어 (`buildSmartStoreSeoChecklist`, 5개)

모두 Naver 공식 가이드 기반:

| 항목 | 출처 |
|------|------|
| 카테고리 분류 등록 | Naver 쇼핑검색 SEO 가이드 — "카테고리 누락 상품은 검색 결과에 노출되지 않음" |
| 가격 정보 등록 | Naver 쇼핑검색 SEO 가이드 — "가격 미등록 시 가격 비교 노출 제외" |
| 브랜드 정보 등록 | Naver 쇼핑검색 SEO 가이드 — "브랜드 필터 노출 조건" |
| 카테고리 전문성 | Naver C-rank 알고리즘 — "특정 카테고리 전문 스토어 우대" |
| 키워드 나열 미사용 | Naver 쇼핑검색 SEO 가이드 — "키워드 나열 금지(노출 페널티)" |

### 임계치 변경 시

1. `lib/seo-thresholds.ts` 수정
2. 출처 주석 갱신 (반드시 공식 문서 URL 또는 인용)
3. `lib/crawler/checklist.ts`의 메시지·codeExample도 동기화
