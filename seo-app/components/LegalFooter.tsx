import Link from "next/link";

const GITHUB = "https://github.com/philocsera/SEO-Analyzer";

// 앱 전역 법적 푸터. 분석 대상은 사용자가 제출한 공개 웹페이지이며, 결과는
// 휴리스틱·AI 생성 정보다(전문 자문 아님). 외부 데이터는 각 제공처 약관을 따른다.
export default function LegalFooter() {
  return (
    <footer data-chrome className="border-t border-slate-800/60 bg-[#0a0f1e] text-slate-500">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-3 text-xs leading-relaxed">
        <p>
          데이터 출처: Google PageSpeed Insights · 금융감독원 DART · 네이버 검색/쇼핑/검색광고
          API · OpenAI.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <Link href="/terms" className="hover:text-slate-300 transition-colors">
            이용약관 · 면책
          </Link>
          <a
            href={`${GITHUB}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            문의 (GitHub Issues)
          </a>
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            소스 코드
          </a>
          <span className="text-slate-700">© {new Date().getFullYear()} SEO Analyzer</span>
        </div>
      </div>
    </footer>
  );
}
