/**
 * UI upgrade #3: a small trend line beside a gauge's own big number — real mission-control
 * telemetry never shows just a static bar, it shows where a value has been. Purely decorative
 * (`aria-hidden`, `role="presentation"`): the gauge's own text/`role="meter"` already carries
 * the real number and status (brief rule 6), this is a supplementary picture of the same
 * numbers, never the only way they reach the player.
 *
 * Scales to the *data's own* min/max, not the full 0-1 range a fraction could theoretically
 * span — the classic sparkline choice (Tufte's own), because a resource that has only drifted
 * a few percent within its recent history should still show a visible trend, not a flat line
 * lost against a scale sized for a swing that didn't happen.
 */
const WIDTH = 56;
const HEIGHT = 20;

export function Sparkline({ values, className }: { values: readonly number[]; className?: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * WIDTH;
      const y = HEIGHT - ((v - min) / range) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={`gauge-sparkline ${className ?? ""}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      role="presentation"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
