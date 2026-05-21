"use client";

type Props = {
  score: number | null;
  label: string;
  size?: number;
};

function scoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 80) return "우수";
  if (score >= 50) return "개선 필요";
  return "긴급 개선";
}

const START_ANGLE = 225;
const TOTAL_SWEEP = 270;

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  sweepAngle: number,
) {
  const start = pointOnCircle(cx, cy, r, startAngle);
  const end = pointOnCircle(cx, cy, r, startAngle + sweepAngle);
  const largeArc = Math.abs(sweepAngle) > 180 ? 1 : 0;
  const sweepFlag = sweepAngle >= 0 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

export function ScoreGauge({ score, label, size = 160 }: Props) {
  const value = score ?? 0;
  const isNull = score === null;
  const color = isNull ? "#475569" : scoreColor(value);

  const stroke = Math.max(8, size * 0.09);
  const radius = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  const filledSweep = (value / 100) * TOTAL_SWEEP;
  const showFilled = !isNull && filledSweep > 0.5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }} className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <path
            d={arcPath(cx, cy, radius, START_ANGLE, TOTAL_SWEEP)}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {showFilled && (
            <path
              d={arcPath(cx, cy, radius, START_ANGLE, filledSweep)}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.3}
            fontWeight={700}
            fill={color}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {score ?? "—"}
          </text>
          <text
            x={cx}
            y={cy + size * 0.25}
            textAnchor="middle"
            fontSize={size * 0.085}
            fill="#94a3b8"
          >
            {isNull ? "게이트 실패" : scoreLabel(value)}
          </text>
        </svg>
      </div>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
    </div>
  );
}
