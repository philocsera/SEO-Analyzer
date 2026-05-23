import { AnalyzerHome } from "@/components/AnalyzerHome";

// /geo도 같은 통합 페이지를 GEO 모드로 시작해서 보여준다(토글로 SEO 전환 가능).
// 기존 링크·임베드 src(/geo)·GEO 메타데이터(layout)를 유지하기 위해 경로는 그대로 둔다.
export default function GeoPage() {
  return <AnalyzerHome initialMode="geo" />;
}
