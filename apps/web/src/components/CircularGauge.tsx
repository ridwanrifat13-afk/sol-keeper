/**
 * A circular arc gauge — player reference: the drone HUD's own compass dial. Real data only
 * (`fraction`, 0-1, and whatever real number/label the caller passes as the center readout);
 * decorative (`aria-hidden`), the same real number is always shown as plain text beside or
 * inside it, never conveyed by the arc alone (rule 6).
 */
const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularGauge({
  fraction,
  label,
  centerText,
}: {
  fraction: number;
  label: string;
  centerText: string;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const dashOffset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div className="circular-gauge" aria-hidden="true">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--line)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--shell-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" className="circular-gauge-center">
          {centerText}
        </text>
      </svg>
      <span className="circular-gauge-label">{label}</span>
    </div>
  );
}
