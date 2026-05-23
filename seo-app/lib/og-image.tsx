import { ImageResponse } from "next/og";

// OG/트위터 카드 공통 렌더러. next/og 기본 폰트는 한글 글리프가 없어 이미지 내
// 텍스트는 영문으로 둔다(깨짐 방지). 링크 미리보기의 제목·설명은 페이지 metadata
// (한국어)가 노출되므로 한글 정보는 유지된다.
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

type Accent = "seo" | "geo";

const GRAD: Record<Accent, string> = {
  seo: "linear-gradient(135deg, #2563eb, #0ea5e9)",
  geo: "linear-gradient(135deg, #7c3aed, #2563eb)",
};

export function renderOgImage({
  eyebrow,
  title,
  subtitle,
  accent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: Accent;
}) {
  const grad = GRAD[accent];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0a0f1e",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: grad,
              display: "flex",
            }}
          />
          <div style={{ fontSize: 30, letterSpacing: 6, color: "#94a3b8" }}>
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ fontSize: 34, color: "#94a3b8" }}>{subtitle}</div>
        </div>

        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            borderRadius: 5,
            background: grad,
          }}
        />
      </div>
    ),
    ogSize,
  );
}
