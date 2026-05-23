"use client";

export type Mode = "seo" | "geo";

// SEO|GEO 세그먼트 토글. URL 입력칸 바로 위에 가운데 정렬로 배치해 눈에 잘 띄게 한다.
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
      <Btn active={mode === "seo"} onClick={() => onChange("seo")}>
        SEO
      </Btn>
      <Btn active={mode === "geo"} onClick={() => onChange("geo")}>
        GEO
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
