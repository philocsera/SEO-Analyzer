"use client";

export type Mode = "seo" | "geo";

// SEO|GEO 세그먼트 토글. URL 입력칸 바로 위에 가운데 정렬로 배치한다.
// 분석 진행 중(disabled)에는 잠가서 전환으로 분석이 끊기는 것을 막는다.
export function ModeToggle({
  mode,
  onChange,
  disabled = false,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1"
      title={disabled ? "분석 중에는 전환할 수 없어요" : undefined}
    >
      <Btn active={mode === "seo"} disabled={disabled} onClick={() => onChange("seo")}>
        SEO
      </Btn>
      <Btn active={mode === "geo"} disabled={disabled} onClick={() => onChange("geo")}>
        GEO
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}
