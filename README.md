# SEO Analyzer

URL 하나로 SEO·브랜드·콘텐츠 종합 분석 보고서를 생성하는 Next.js 16 애플리케이션. Claude AI + 4종 외부 API(DART, CrUX, Naver 검색·검색광고)로 데이터를 수집해 PDF로 다운로드 가능한 SEO 보고서를 만듭니다.

```bash
cd seo-app
npm install
npm run dev
# → http://localhost:3000
```

---

## 환경 변수 (`seo-app/.env.local`)

다음 키들을 `seo-app/.env.local`에 작성하세요. **`ANTHROPIC_API_KEY` 외에는 모두 선택**(미설정 시 해당 기능만 비활성화 또는 폴백 동작).

### 1. ANTHROPIC_API_KEY (필수)

Claude AI 분석에 사용. 미설정 시 분석 자체가 503 에러로 실패.

**발급 방법**:
1. https://console.anthropic.com/ 접속 → 회원가입
2. 결제 카드 등록 (선불 충전 방식, 최소 $5)
3. 좌측 메뉴 **API Keys** → **Create Key**
4. 키 복사 → `.env.local`에 `ANTHROPIC_API_KEY=sk-ant-api03-...` 형식으로 저장
5. 저장한 키는 다시 볼 수 없으니 안전한 곳에 백업

**한도**: 결제 잔액 소진 시까지. Tier에 따라 RPM/TPM 제한 있음 (Tier 1: 분당 50 요청, 분당 40K 입력 토큰).

### 2. GOOGLE_PAGESPEED_API_KEY (Core Web Vitals용)

Chrome UX Report API 호출에 사용. 미설정 시 CrUX 섹션 표시 안 됨 (다른 분석은 정상).

**발급 방법**:
1. https://console.cloud.google.com/ 접속 → Google 계정 로그인
2. 새 프로젝트 생성 (예: "seo-analyzer")
3. 좌측 메뉴 **APIs & Services** → **Library**
4. "Chrome UX Report API" 검색 → **Enable** 클릭
5. **Credentials** → **Create Credentials** → **API key**
6. 생성된 키 복사 → `.env.local`에 `GOOGLE_PAGESPEED_API_KEY=...` 저장

**한도**: 무료. 기본 25,000 요청/일.

### 3. DART_API_KEY (기업 공시 정보)

금융감독원 전자공시(DART) API. 회사명으로 매출액·직원 수 조회. 미설정 시 모든 분석에서 매출 추정·기업 규모 추정을 AI에 위임.

**발급 방법**:
1. https://opendart.fss.or.kr/ 접속
2. 우측 상단 **회원가입** → 이메일 인증
3. 로그인 후 **인증키 신청/관리** → **신청**
4. 사용 목적 작성 후 신청 → 즉시 발급 (이메일 통지)
5. 마이페이지 → **인증키 관리**에서 복사 → `.env.local`에 `DART_API_KEY=...` 저장

**한도**: 무료. 일일 10,000 요청.

### 4. NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (스마트스토어 분석)

Naver 검색 API (쇼핑·웹·블로그). 스마트스토어 URL 분석에 필수. 일반 사이트 분석은 영향 없음.

**발급 방법**:
1. https://developers.naver.com/main/ 접속
2. 우측 상단 **Application** → **애플리케이션 등록** (네이버 ID 로그인 필요)
3. 애플리케이션 이름 입력 (예: "SEO Analyzer")
4. **사용 API**: "검색"을 체크 (쇼핑·웹·블로그 모두 포함됨)
5. **환경**: WEB 설정 → 사용 URL: `http://localhost:3000` 등록
6. 등록 완료 후 **애플리케이션 정보**에서 `Client ID`, `Client Secret` 복사
7. `.env.local`에 다음 두 줄 저장:
   ```
   NAVER_CLIENT_ID=...
   NAVER_CLIENT_SECRET=...
   ```

**한도**: 무료. 일일 25,000 요청 (전체 검색 API 합산).

### 5. NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID (키워드 검색량/경쟁도)

Naver 검색광고 API. 추천 키워드의 검색량·경쟁도 조회. 미설정 시 폴백 라벨("매우 높음", "보통" 등 임의값) 사용.

**발급 방법**:
1. https://manage.searchad.naver.com/ 접속 → 네이버 ID로 가입 (검색광고 계정 별도)
2. 광고주 가입 후 **고객 ID**(CUSTOMER_ID)를 메모 (마이페이지 우측 상단에 표시)
3. 좌측 메뉴 **도구** → **API 사용 관리**
4. **새 라이선스 발급** → 사용 목적 작성
5. 발급된 **API Key**(액세스 라이선스)와 **Secret Key**(비밀키) 복사
6. `.env.local`에 다음 세 줄 저장:
   ```
   NAVER_AD_CUSTOMER_ID=...
   NAVER_AD_API_KEY=...
   NAVER_AD_SECRET_KEY=...
   ```

**한도**: 무료. RelKwdStat API 기준 분당 60 요청.

### 전체 `.env.local` 예시

```bash
# 필수
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxx

# 선택 (미설정 시 해당 기능 비활성화)
GOOGLE_PAGESPEED_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
DART_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NAVER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
NAVER_CLIENT_SECRET=xxxxxxxxxx
NAVER_AD_CUSTOMER_ID=1234567
NAVER_AD_API_KEY=xxxxxxxxxxxxxxxxxxxx
NAVER_AD_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx==
```

---

## API 비용 (한 번 분석 시)

분석 1회 발생 비용 — Anthropic Claude만 유료, **나머지 API는 모두 무료** (한도 내).

| 항목 | 모델 / API | 토큰 / 호출 수 | 비용 (USD) | 비고 |
|------|------------|-----------------|------------|------|
| AI 분석 | claude-sonnet-4-6 | 입력 ~5,000 / 출력 ~3,000 토큰 | **약 $0.06** | 입력 $3/MTok, 출력 $15/MTok 기준 |
| DART 조회 | DART Open API | 평균 4 호출 | $0 | 무료 (10K/일) |
| CrUX 조회 | Chrome UX Report | 1 호출 | $0 | 무료 (25K/일) |
| 키워드 통계 | Naver 검색광고 | 5 호출 (키워드 5개) | $0 | 무료 (분당 60) |
| 스마트스토어 (해당 시) | Naver 쇼핑/웹/블로그 검색 | 평균 3 호출 | $0 | 무료 (25K/일 합산) |

### 1회 분석 총 비용

**약 $0.05–0.08 / 약 70–100원** (1,300원/$ 기준)

### 누적 비용 예시

| 분석 횟수 | 예상 비용 (USD) | 예상 비용 (KRW) |
|-----------|-----------------|-----------------|
| 100회 | ~$5–8 | ~7,000–10,000원 |
| 1,000회 | ~$50–80 | ~65,000–105,000원 |
| 10,000회 | ~$500–800 | ~650,000–1,050,000원 |

> **비용 변동 요인**: 페이지 본문이 길거나 H 태그가 많으면 입력 토큰이 늘어나고, AI 응답이 풍부하면 출력 토큰이 늘어 비용이 위 추정의 1.5배까지 증가할 수 있습니다.

### 비용 절감 팁

- **결과 캐싱**: 같은 URL 24시간 내 재분석 시 클라이언트 `localStorage`에서 결과 재사용 (현재 `lib/result-cache.ts`에 구현되어 있음, 서버 호출 발생 안 함).
- **429 백오프**: Anthropic SDK `maxRetries: 4` 설정으로 rate limit 시 자동 재시도. 429는 모델 실행 전 거부되므로 비용 0.
- **JSON 파싱 폴백**: `lib/json-repair.ts`의 3단계 복구로 파싱 실패 시 재요청 비용을 회피.

---

## 실행

```bash
# 1. 의존성 설치
cd seo-app
npm install

# 2. .env.local 생성 (위 환경 변수 참고)
cp .env.local.example .env.local  # 또는 직접 생성
# → ANTHROPIC_API_KEY 등 입력

# 3. 개발 서버
npm run dev
# → http://localhost:3000 에서 URL 입력 후 분석

# 4. 프로덕션 빌드 / 실행
npm run build
npm start

# 5. 타입 검사
npx tsc --noEmit

# 6. 린트
npm run lint
```

### 배치 분석 (여러 URL 일괄 PDF 생성)

`scripts/batch-pdf.mjs`로 다수 URL을 분석하고 PDF로 저장 가능:

```bash
node scripts/batch-pdf.mjs categories     # 13개 카테고리 1개씩
node scripts/batch-pdf.mjs main           # 15개 대형 사이트
node scripts/batch-pdf.mjs smartstore     # 5개 스마트스토어
node scripts/batch-pdf.mjs niche          # 5개 소규모 서비스
```

프리셋은 `scripts/presets.json`에 정의되어 있습니다. 결과 PDF는 `examples/` 디렉토리에 저장 (이 레포의 `examples/` 안에 13개 카테고리 샘플이 미리 들어있습니다).

---

## 보고서 항목 상세

각 보고서는 다음 항목들로 구성되며, 모두 공식 출처에 근거합니다 (자의적 휴리스틱 배제).

### 1. 종합 SEO 점수 (overallScore)

**일반 사이트**: `기술 SEO 점수 × 0.7 + 브랜드 인지도 × 0.3`
**스마트스토어**: `기술 SEO 점수` 단일값 (Naver 가이드 기반 5개 체크 평균)

A/B/C/D 등급으로 표지에 배지 표시:
- A 등급: 80점 이상
- B 등급: 60–79점
- C 등급: 40–59점
- D 등급: 40점 미만

### 2. 기술 SEO 체크리스트 (13개 항목)

각 항목은 pass/warn/fail 3단계로 평가됩니다. 자의적 기준(예: "300단어 이상", "내부 링크 10개 이상" 등)은 의도적으로 제거되었으며, 모두 다음 출처에 근거합니다.

#### Lighthouse v12 SEO category 정통 항목 (10개)

| 항목 | Lighthouse audit ID | 검증 방식 |
|------|---------------------|-----------|
| 페이지 제목 | `document-title` | `<title>` 비어있지 않음 |
| Meta Description | `meta-description` | `<meta name="description">` 비어있지 않음 |
| Viewport 메타 | `viewport` | `<meta name="viewport">` 존재 + `user-scalable=no` 없음 (WCAG 1.4.4) |
| Canonical | `canonical` | `<link rel="canonical">` 존재 |
| 이미지 alt 속성 | `image-alt` | 모든 `<img>`에 alt 속성 (Lighthouse: 100%, 80%+ warn) |
| 검색엔진 색인 허용 | `is-crawlable` | `<meta name="robots">`에 `noindex/none` 없음 |
| robots.txt | `robots-txt` | 사이트 루트의 robots.txt 200 응답 |
| 의미 있는 링크 텍스트 | `link-text` | "여기/click here/더보기" 등 일반어 비율 < 5% (Lighthouse 블랙리스트 + 한국어 표현 추가) |
| 크롤 가능한 앵커 | `crawlable-anchors` | `<a>` 태그 중 `href` 누락·`javascript:` 비율 < 5% |
| 플러그인 미사용 | `plugins` | `<embed>`, `<object>`, `<applet>` 검사 (Flash/Silverlight 차단) |

#### Google Search Central 권장사항 (3개)

| 항목 | 출처 | 검증 방식 |
|------|------|-----------|
| HTTPS 보안 | Google 명시 랭킹 시그널 (2014 발표) | URL이 `https://` |
| sitemap.xml | Google Search Central — Sitemaps overview | 사이트 루트의 sitemap.xml 200 응답 |
| 구조화 데이터 | Google Search Central — Structured data | JSON-LD `<script type="application/ld+json">` 존재 |

### 3. 기술 개선 필요 항목

위 13개 체크 중 fail/warn 항목을 묶어 각각의 **개선 제안** + **샘플 코드**를 제공합니다. 예: `og:title` 누락 시 → `<meta property="og:title" content="...">` 코드 예시 자동 생성.

### 4. AI 브랜드 분석 (Claude)

크롤링된 페이지 데이터(제목·H 태그·본문 발췌 2500자·실패 SEO 항목)를 Claude `claude-sonnet-4-6`에 전달해 다음을 추출:

- **추정 업종** — 페이지 콘텐츠 기반 업종 분류
- **기업 규모** — DART 매칭이 있으면 강제 사용, 없으면 AI 추정
- **핵심 타깃 고객** — 2~3문장
- **브랜드 스토리** — 3~4문장
- **차별화 포인트** — 3개 항목
- **마케팅 전략 제안** — 5~7문장
- **우선순위별 개선 항목** — 5개 (critical 2개 + warning 2개 + info 1개), 각각 카테고리·제목·실행 방법 포함
- **추천 SEO 키워드** — 5개 (이후 Naver 검색광고 API로 검색량/경쟁도 추가)

### 5. 브랜드 인지도 점수 (일반 사이트만, 0–100점)

페이지에서 다음 신호를 검출해 가중합:

| 신호 | 배점 | 검출 방법 |
|------|------|-----------|
| SNS 채널 | 플랫폼당 10점 (최대 30) | Instagram, YouTube, Twitter/X, 네이버 블로그·포스트 링크 검출 |
| About 페이지 | 30점 | `/about`, `/company`, `/introduce` URL 또는 "회사소개" 등 텍스트 |
| 로고 | 20점 | `<img>` src/alt/class에 "logo" 키워드 또는 OG 이미지 존재 |
| 연락처 정보 | 20점 | 페이지 내 한국 전화번호·이메일·시·도명 정규식 매칭 |

추가로 AI가 메시지 일관성·타깃 명확성·차별화 강도를 "높음/보통/낮음"으로 라벨링.

### 6. Core Web Vitals (CrUX, Google)

Chrome User Experience Report API에서 실제 사용자 측정값(p75)을 가져옵니다:

- **LCP** (Largest Contentful Paint) — 주 콘텐츠 로딩 시간
- **FCP** (First Contentful Paint) — 첫 콘텐츠 표시 시간
- **INP** (Interaction to Next Paint) — 인터랙션 응답성
- **CLS** (Cumulative Layout Shift) — 레이아웃 안정성
- **TTFB** (Time to First Byte) — 서버 응답 속도

각 메트릭은 Google 기준 good/needsImprovement/poor 분포(%)로 표시. 트래픽이 적은 사이트는 데이터 없음(N/A) 처리.

### 7. 매출 추정 (DART 공시 기반, 일반 사이트만)

페이지에서 회사명을 추출해 DART(금융감독원 전자공시) API에서 매칭:
1. organizationName (Schema.org Organization) 우선
2. og:site_name → 페이지 title의 일부 → 본문 copyright 패턴

매칭 성공 시:
- 직원 수, 매출액, 업종 코드 조회
- 중소기업기본법 기준으로 **소규모/중소기업/중견기업/대기업** 분류
- 업종별 임계치 (제조업: 300명/400억, 서비스업: 100명/200억 등)

매칭 실패 시 AI가 페이지 콘텐츠로 추정.

### 8. 추천 SEO 키워드 (검색량 + 경쟁도)

AI가 추천한 5개 키워드를 Naver 검색광고 API에 조회:
- **검색량**: 매우 높음 / 높음 / 보통 / 낮음 / 매우 낮음
- **경쟁도**: 높음 / 보통 / 낮음 / 매우 낮음

API 미설정 시 폴백 라벨 사용. PDF에는 표 형태로 표시.

### 9. 스마트스토어 전용 분석 (URL이 `smartstore.naver.com/*` 또는 `brand.naver.com/*`인 경우)

Naver 쇼핑검색 API로 상품 100개를 가져와 **Naver 공식 가이드 기반 5개 항목**으로 평가:

| 항목 | 출처 | 임계 |
|------|------|------|
| 카테고리 분류 등록 | Naver 쇼핑검색 SEO 가이드 — "카테고리 누락 상품은 노출 제외" | 100% |
| 가격 정보 등록 | Naver 가이드 — "가격 미등록 시 가격 비교 노출 제외" | 95%+ |
| 브랜드 정보 등록 | Naver 가이드 — "브랜드 필터 노출 조건" | 60%+ |
| 카테고리 전문성 (집중도) | Naver C-rank 알고리즘 — "특정 카테고리 전문 스토어 우대" | 60%+ |
| 키워드 나열 미사용 | Naver 가이드 — "키워드 나열 금지(노출 페널티)" | 의심 상품 < 10% |

추가로 AI가 상품명·키워드·카테고리·브랜드 데이터로 마케팅 전략과 개선 제안 생성. 리뷰·평점·노출순위는 공식 API에서 제공하지 않아 분석 제외(보고서에 명시).

---

## 향후 계획

- **GEO (Generative Engine Optimization) 지원**: ChatGPT, Perplexity, Claude, Google AI Overviews 등 LLM 기반 검색엔진에 콘텐츠가 노출되도록 최적화하는 분석 기능 추가 예정. 기존 SEO와는 다른 평가 축(인용 가능성·구조화된 사실 정보·LLM 친화적 마크업 등)이 필요하므로 별도 체크리스트로 구현될 것.

---

## 라이선스 / 출처

- 기술 SEO 체크리스트: [Lighthouse v12 SEO category](https://developer.chrome.com/docs/lighthouse/seo/) + [Google Search Central](https://developers.google.com/search/docs)
- 스마트스토어 체크리스트: Naver 쇼핑검색 SEO 가이드 + C-rank 알고리즘 공개 정보
- AI 분석: Anthropic Claude `claude-sonnet-4-6`
- 기업 정보: 금융감독원 DART (Open API)
- 성능 데이터: Google Chrome UX Report