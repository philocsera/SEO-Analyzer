import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  THRESHOLDS,
  WEIGHTS_BY_CATEGORY,
  LLM_BOTS,
} from "@/lib/geo/analyze/thresholds";
import {
  DEFAULT_REVIEW_MODEL,
  PRICING,
  TOKEN_BUDGET,
} from "@/lib/geo/analyze/pricing";
import { formatUSD } from "@/lib/geo/analyze/cost";

export const metadata = {
  title: "Methodology — GEO Optimizer",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen">
      <header data-chrome className="border-b border-slate-800/50 px-6 py-4 sticky top-0 z-10 bg-[#0a0f1e]/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/geo"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            GEO 홈으로
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">GEO Optimizer</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-3 h-3" />
            Methodology
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            어떻게 점수를 매기나요?
          </h1>
          <p className="text-slate-400 leading-relaxed">
            이 도구는 <strong className="text-slate-200">휴리스틱 진단기</strong>입니다.
            LLM이 답변에 인용할 때 선호한다고 알려진 신호에 기반해 점수를 매깁니다.
            점수가 높다고 실제 인용이 보장되는 것은 아닙니다.
          </p>
        </div>

        <Block title="1. 점수 가중치 (페이지 유형별)">
          <p className="mb-4 text-slate-400 leading-relaxed">
            가중치는 Aggarwal et al.{" "}
            <em className="text-slate-300">
              “GEO: Generative Engine Optimization”
            </em>{" "}
            (Princeton, 2024, arXiv:2311.09735) 실험 결과를 1차 근거로 합니다.
          </p>
          <ul className="space-y-1 text-sm text-slate-300 mb-4">
            <li>· 출처 인용 추가: <strong className="text-violet-300">+40.6%</strong></li>
            <li>· 권위 있는 인용문 삽입: <strong className="text-violet-300">+41%</strong></li>
            <li>· 통계·수치 추가: <strong className="text-violet-300">+37.3%</strong></li>
            <li>· 키워드 스터핑·권위적 톤: 효과 없음 또는 음(-)의 효과</li>
          </ul>
          <p className="mb-4 text-slate-400 leading-relaxed text-sm">
            하지만 위 신호들은 백과사전·기술 문서에서 자연스럽게 등장하는 패턴이라,
            모든 페이지 유형에 같은 가중치를 적용하면 마케팅·이커머스 페이지가 구조적으로 낮은 점수를 받습니다.
            우리는 페이지 유형을 자동 분류한 뒤 유형별로 가중치를 다르게 적용합니다.
            상업 페이지는 Specificity(브랜드·가격·수치)와 Extractability(구조)를 더 비중 있게 봅니다.
          </p>
          <Table>
            <thead>
              <tr>
                <Th>페이지 유형</Th>
                <Th className="text-center">Citability</Th>
                <Th className="text-center">Quotability</Th>
                <Th className="text-center">Specificity</Th>
                <Th className="text-center">Extractability</Th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["docs", "기술 문서"],
                  ["encyclopedia", "백과사전"],
                  ["news", "뉴스"],
                  ["blog", "블로그"],
                  ["marketing", "마케팅/랜딩"],
                  ["commerce", "커머스"],
                  ["forum", "포럼/Q&A"],
                  ["other", "기타"],
                ] as const
              ).map(([key, label]) => {
                const w = WEIGHTS_BY_CATEGORY[key];
                return (
                  <Tr key={key}>
                    <Td>{label}</Td>
                    <Td className="text-center text-violet-300 font-bold">
                      {Math.round(w.citability * 100)}%
                    </Td>
                    <Td className="text-center text-violet-300 font-bold">
                      {Math.round(w.quotability * 100)}%
                    </Td>
                    <Td className="text-center text-violet-300 font-bold">
                      {Math.round(w.specificity * 100)}%
                    </Td>
                    <Td className="text-center text-violet-300 font-bold">
                      {Math.round(w.extractability * 100)}%
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <div className="mt-4 text-xs text-slate-500 leading-relaxed space-y-1">
            <p>· Citability — 외부 출처 링크 · 통계 문장 · 인용문 · 저자/일자 (상업 페이지에선 testimonial/Last updated 라벨도 인정)</p>
            <p>· Quotability — 자족적 문장 · 정의형 문장 · Q&amp;A · 문장 길이</p>
            <p>· Specificity — 고유명사 · 버전/날짜/수치 · 표/리스트 (상업 페이지에선 가격 표기·비교 표 가산)</p>
            <p>· Extractability — TL;DR · 의미 있는 H2 · 구조 요소</p>
          </div>
        </Block>

        <Block title="2. Crawlability — 점수가 아니라 게이트">
          <p className="text-slate-400 mb-3 leading-relaxed">
            아래 중 하나라도 실패하면 다른 점수가 무의미하므로 게이트 실패로 처리합니다.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <div className="font-semibold text-slate-200 mb-2">robots.txt</div>
              <div className="text-slate-400 mb-2">
                다음 LLM 봇 중 본 페이지를 차단하면 실패.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LLM_BOTS.map((b) => (
                  <code
                    key={b}
                    className="text-xs bg-slate-900/60 border border-slate-700/40 rounded px-2 py-0.5 text-slate-300"
                  >
                    {b}
                  </code>
                ))}
              </div>
            </li>
            <li className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <div className="font-semibold text-slate-200 mb-1">JS-only 렌더링</div>
              <div className="text-slate-400">
                본문 가시 텍스트 / HTML 바이트 비율이{" "}
                <code className="text-violet-300">{THRESHOLDS.htmlTextRatio.ok}</code>{" "}
                미만이면 실패, <code className="text-violet-300">{THRESHOLDS.htmlTextRatio.good}</code>{" "}
                미만이면 경고.
              </div>
            </li>
            <li className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <div className="font-semibold text-slate-200 mb-1">Paywall / loginwall</div>
              <div className="text-slate-400">
                “Subscribe to read”, “로그인 후 이용” 등 패턴 감지 시 실패.
              </div>
            </li>
            <li className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
              <div className="font-semibold text-slate-200 mb-1">HTTP 상태</div>
              <div className="text-slate-400">4xx/5xx 또는 응답 실패 시 게이트 실패.</div>
            </li>
            <li className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4">
              <div className="font-semibold text-emerald-300 mb-1">
                llms.txt (보너스)
              </div>
              <div className="text-slate-400">
                존재 시 가산 (게이트 실패와 무관).
              </div>
            </li>
          </ul>
        </Block>

        <Block title="3. 임계값">
          <pre className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto">
            {JSON.stringify(THRESHOLDS, null, 2)}
          </pre>
        </Block>

        <Block title="4. 점수에서 제외한 항목 (SEO 잔재)">
          <p className="text-slate-400 mb-3">
            신뢰성을 위해 의도적으로 제외했습니다.
          </p>
          <ul className="space-y-1.5 text-sm text-slate-400">
            <li>· <code className="text-slate-300">&lt;title&gt;</code> / <code className="text-slate-300">&lt;meta description&gt;</code> 품질</li>
            <li>· Open Graph / Twitter Card</li>
            <li>· canonical, sitemap.xml, <code className="text-slate-300">lang</code> 속성</li>
            <li>· E-E-A-T 카테고리 (Google 품질평가 가이드라인 개념)</li>
            <li>· 응답 속도 점수화 (게이트 통과 판단에만 사용)</li>
            <li>· 헤딩 위계 누락·순서 (SEO 잔재)</li>
            <li>· JSON-LD / 구조화 데이터 (참고 정보로 표시만, 점수화 안 함)</li>
          </ul>
        </Block>

        <Block title="5. LLM 정성 리뷰">
          <p className="text-slate-400 leading-relaxed">
            기본 모델:{" "}
            <code className="text-violet-300">{DEFAULT_REVIEW_MODEL}</code> (
            {PRICING[DEFAULT_REVIEW_MODEL].label}). 본문은 약{" "}
            {TOKEN_BUDGET.review.input.toLocaleString()} 토큰까지 트렁크하여 구조화
            출력(<code>generateObject</code> + Zod) 으로 강제합니다.
          </p>
        </Block>

        <Block title="6. 비용">
          <Table>
            <thead>
              <tr>
                <Th>모델</Th>
                <Th>Input / M</Th>
                <Th>Output / M</Th>
                <Th>리뷰 1회</Th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PRICING).map(([id, p]) => {
                const cost =
                  (TOKEN_BUDGET.review.input * p.inputPerM +
                    TOKEN_BUDGET.review.output * p.outputPerM) /
                  1_000_000;
                return (
                  <Tr key={id}>
                    <Td><code className="text-slate-300">{id}</code></Td>
                    <Td>${p.inputPerM}</Td>
                    <Td>${p.outputPerM}</Td>
                    <Td className="text-violet-300 font-mono">{formatUSD(cost)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            가격은 plan 작성 시점의 일반 공시가 기준이며, Vercel AI Gateway 콘솔이
            권위 있는 출처입니다. 실제 비용은 <code>result.usage</code>로 동적으로
            계산해 UI 에 표시합니다.
          </p>
        </Block>

        <Block title="7. 사용 한도">
          <p className="text-slate-400 leading-relaxed mb-3">
            분석은 SEO 도구와 동일한 비용 방어 가드를 공유합니다. IP 기준{" "}
            <strong className="text-slate-200">분당 3회 · 시간당 10회</strong>로
            제한하며(슬라이딩 윈도), IP는 Vercel이 셋팅하는 신뢰값을 사용합니다.
            카운터는 Upstash Redis에 두어 서버리스 인스턴스 간 공유하고, Redis
            장애 시 단일 인스턴스 in-memory로 폴백합니다.
          </p>
          <p className="text-slate-400 leading-relaxed">
            여기에 더해 모든 사용자 합산 기준{" "}
            <strong className="text-slate-200">
              전역 일일 한도(기본 300회/일)
            </strong>
            를 둡니다(GEO 전용 카운터, SEO와 분리). 단, 같은 URL을 최근 분석한
            적이 있으면 캐시된 결과를 재사용하므로 한도를 소비하지 않습니다.
          </p>
        </Block>

        <Block title="8. 한계 (정직한 면책)">
          <ul className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <li>
              · 이 점수는{" "}
              <strong className="text-slate-200">
                휴리스틱이지 실측 인용률이 아닙니다.
              </strong>{" "}
              점수가 같은 두 페이지 중 어느 쪽이 실제로 더 자주 인용되는지는
              외부 측정이 필요합니다.
            </li>
            <li>
              · “자족적 문장”, “정의형 문장” 판정은 정규식 기반 휴리스틱으로
              오탐/누락이 존재합니다. 점수는 절대값이 아닌 상대적 신호로
              해석하세요.
            </li>
            <li>
              · 단일 페이지만 봅니다. 도메인 권위·교차 인용 패턴 등 도메인 레벨
              신호는 다루지 않습니다.
            </li>
          </ul>
        </Block>
      </div>

      <footer data-chrome className="border-t border-slate-800/50 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-600">
          이 점수는 휴리스틱이며 실측 인용률이 아닙니다.
        </div>
      </footer>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/40">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-slate-700/40">{children}</tr>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-slate-300 ${className}`}>{children}</td>;
}
