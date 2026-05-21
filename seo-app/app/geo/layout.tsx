import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GEO Optimizer — AI 답변에 인용되는 페이지인가요?",
  description:
    "ChatGPT · Claude · Perplexity · Google AI Overviews에 인용될 가능성을 진단하고 개선안을 제공합니다.",
};

// GEO 섹션 다크 테마 래퍼 (루트 레이아웃 body엔 배경색이 없음).
export default function GeoLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0a0f1e] text-slate-100 min-h-screen">{children}</div>;
}
