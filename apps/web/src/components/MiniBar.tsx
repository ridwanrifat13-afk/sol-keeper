/**
 * A small inline progress bar beside a table fact's own text (player reference: the drone
 * HUD's "Battery status 75%"/"Altitude limited" readouts, each paired with a slider). Purely
 * decorative (`aria-hidden`) — the real percentage is the text already in the cell next to it,
 * never conveyed by the bar's length alone (rule 6).
 */
export function MiniBar({ fraction, statusClassName }: { fraction: number; statusClassName?: string }) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  return (
    <span className={`mini-bar-track ${statusClassName ?? ""}`} aria-hidden="true">
      <span className="mini-bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
