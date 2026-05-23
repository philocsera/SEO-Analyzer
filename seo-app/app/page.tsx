import { AnalyzerHome } from "@/components/AnalyzerHome";

// 한 페이지에서 SEO/GEO를 토글로 전환. 루트는 SEO로 시작.
export default function Page() {
  return <AnalyzerHome initialMode="seo" />;
}
