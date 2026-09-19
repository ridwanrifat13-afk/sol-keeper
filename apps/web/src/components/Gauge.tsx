import type { StatusPresentation } from "./status.js";

export interface GaugeProps {
  /** Shape-distinct icon for the resource itself. */
  readonly icon: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  /** 0..1 fill. */
  readonly fraction: number;
  readonly status: StatusPresentation;
  /** Optional second line, e.g. "pO₂ 156 mmHg". */
  readonly detail?: string;
  readonly decimals?: number;
}

/**
 * A single resource readout.
 *
 * The bar is labelled `role="meter"` with the real numbers in `aria-valuenow`/`aria-valuetext`
 * so a screen reader gets the quantity rather than "45 percent of a div", and the status word
 * is real text in the DOM, not a colour class (brief rule 6).
 */
export function Gauge({
  icon,
  label,
  value,
  unit,
  fraction,
  status,
  detail,
  decimals = 1,
}: GaugeProps) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  const shown = `${value.toFixed(decimals)} ${unit}`;

  return (
    <div className={`gauge ${status.className}`}>
      <div className="gauge-head">
        <span className="gauge-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="gauge-label">{label}</span>
        <span className="gauge-status">
          <span aria-hidden="true">{status.glyph}</span> {status.label}
        </span>
      </div>

      <div className="gauge-value">{shown}</div>

      <div
        className="gauge-track"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${shown}, ${status.label}`}
        aria-label={label}
      >
        <div className="gauge-fill" style={{ width: `${pct}%` }} />
      </div>

      {detail !== undefined && <div className="gauge-detail">{detail}</div>}
    </div>
  );
}
