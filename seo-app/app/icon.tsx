import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 브랜드 마크: 보라→파랑 그라데이션 사각형 + 흰 돋보기.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            border: "3px solid white",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: 5,
            width: 3,
            height: 8,
            background: "white",
            borderRadius: 2,
            transform: "rotate(45deg)",
          }}
        />
      </div>
    ),
    size,
  );
}
