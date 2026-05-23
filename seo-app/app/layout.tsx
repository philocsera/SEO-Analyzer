import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LegalFooter from "@/components/LegalFooter";
import EmbedResizer from "@/components/EmbedResizer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://seo-app-iota-nine.vercel.app"),
  title: "SEO Analyzer — AI 기반 SEO 자동 분석",
  description: "URL 하나로 SEO 현황, AI 브랜드 분석까지. 무료 SEO 종합 보고서.",
  openGraph: {
    title: "SEO Analyzer — AI 기반 SEO 자동 분석",
    description: "URL 하나로 SEO 현황, AI 브랜드 분석까지. 무료 SEO 종합 보고서.",
    url: "/",
    siteName: "SEO Analyzer",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Analyzer — AI 기반 SEO 자동 분석",
    description: "URL 하나로 SEO 현황, AI 브랜드 분석까지.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ?embed=1 이면 페인트 전에 html[data-embed]를 설정 → CSS가 chrome을 숨김(깜빡임 방지) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.setAttribute('data-embed','')}catch(e){}",
          }}
        />
        <div className="flex-1">{children}</div>
        <LegalFooter />
        <EmbedResizer />
      </body>
    </html>
  );
}
