import type { Metadata } from "next";

const GEO_TITLE = "GEO Optimizer — AI 답변에 인용되는 페이지인가요?";
const GEO_DESC =
  "ChatGPT · Claude · Perplexity · Google AI Overviews에 인용될 가능성을 진단하고 개선안을 제공합니다.";

export const metadata: Metadata = {
  title: GEO_TITLE,
  description: GEO_DESC,
  openGraph: {
    title: GEO_TITLE,
    description: GEO_DESC,
    url: "/geo",
    siteName: "GEO Optimizer",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: GEO_TITLE,
    description: GEO_DESC,
  },
};

// GEO 섹션 다크 테마 래퍼 (루트 레이아웃 body엔 배경색이 없음).
export default function GeoLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0a0f1e] text-slate-100 min-h-screen">{children}</div>;
}
