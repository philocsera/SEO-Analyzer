import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "이용약관 · 면책 — SEO Analyzer",
  description: "SEO/GEO Analyzer 서비스 이용약관, 면책 조항, 데이터·프라이버시 안내.",
};

const GITHUB = "https://github.com/philocsera/SEO-Analyzer";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100">
      <header className="border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">이용약관 · 면책</h1>
          <p className="text-sm text-slate-500">최종 업데이트: 2026-05-23</p>
        </div>

        <Section title="1. 서비스 개요">
          본 서비스(SEO Analyzer / GEO Analyzer)는 사용자가 입력한 공개 웹페이지의 URL을
          서버가 요청 시 1회 가져와 SEO·GEO 관점에서 분석하고 점수·개선안을 제공하는
          무료 도구입니다. 로그인 없이 이용할 수 있습니다.
        </Section>

        <Section title="2. 면책">
          분석 결과는 휴리스틱 규칙과 AI(LLM)가 생성한 <strong className="text-slate-300">참고
          정보</strong>입니다. 점수·개선안의 정확성·완전성·최신성을 보장하지 않으며, 검색
          노출·매출·AI 인용 등 어떠한 결과도 보증하지 않습니다. 본 정보는 법률·세무·재무·
          투자 등 전문 자문이 아니며, 이를 근거로 한 의사결정의 책임은 이용자에게 있습니다.
        </Section>

        <Section title="3. 분석 대상과 크롤링 정책">
          서버는 이용자가 직접 입력한 URL만 가져옵니다(자동 크롤링·대량 수집 없음). 내부망·
          사설 IP 등은 보안상 차단하며, 페이로드·로그인이 필요한 비공개 콘텐츠나 페이월은
          우회하지 않습니다. 비용 어뷰징 방지를 위해 요청 빈도에 제한을 둡니다. 분석 대상
          웹사이트의 상표·콘텐츠·데이터에 대한 권리는 각 권리자에게 있습니다.
        </Section>

        <Section title="4. 데이터·프라이버시">
          별도의 회원 정보를 수집하지 않습니다. 분석한 URL과 그 결과는 같은 URL 재분석 시
          비용 절감과 결과 공유 링크 제공을 위해 일정 기간(약 24시간~7일) 캐시될 수 있습니다.
          분석 대상은 공개 웹페이지이므로 결과 공유에 개인정보 이슈는 없습니다. 요청 IP는
          레이트리밋(어뷰징 방지) 목적으로만 사용됩니다.
        </Section>

        <Section title="5. 외부 데이터 출처">
          본 서비스는 다음 외부 데이터·API를 사용하며, 각 데이터의 이용은 해당 제공처의
          약관을 따릅니다: Google PageSpeed Insights(Core Web Vitals), 금융감독원 DART(기업
          공시), 네이버 검색/쇼핑/검색광고 API, Anthropic Claude(AI 분석).
        </Section>

        <Section title="6. 문의">
          버그 제보·문의는{" "}
          <a
            href={`${GITHUB}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline"
          >
            GitHub Issues
          </a>
          를 이용해 주세요.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </section>
  );
}
