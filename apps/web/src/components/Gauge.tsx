import { useState } from "react";
import type { StatusPresentation } from "./status.js";
import { gaugeHelp } from "../i18n/gaugeHelp.js";
import type { DialLevel } from "../dial/types.js";

export interface GaugeProps {
  /** Shape-distinct icon for the resource itself. */
  readonly icon: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  /** 0..1 fill. Physically accurate at every Reality Dial level — a bar needs no unit. */
  readonly fraction: number;
  readonly status: StatusPresentation;
  /** Optional second line, e.g. "pO₂ 156 mmHg". */
  readonly detail?: string;
  readonly decimals?: number;
  /**
   * Reality Dial cadet level: replaces the numeric "value unit" headline with a plain-word
   * phrase outright (e.g. "🫁 Plenty of air"). `value`/`unit`/`decimals` are still required
   * even when this is set, because the real number still drives `aria-valuenow` — a screen
   * reader user gets the same simplified wording, not a worse experience than a sighted one.
   */
  readonly valueText?: string | undefined;
  /** Reality Dial cadet level: overrides the status word ("Good" instead of "Nominal"). */
  readonly statusLabel?: string;
  /** M8.7: a key into i18n/gaugeHelp.ts. When set, a "?" button reveals a short, real
   *  explanation of what this gauge measures — the brief's own "A '?' on every gauge
   *  explains it at the current depth." Omitted entirely (no button) when unset, rather
   *  than a button that opens nothing. */
  readonly helpKey?: string;
  /** Reality Dial level for the help text above — irrelevant without `helpKey`. */
  readonly level?: DialLevel;
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
  valueText,
  statusLabel,
  helpKey,
  level = "specialist",
}: GaugeProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, fraction * 100));
  const shown = valueText ?? `${value.toFixed(decimals)} ${unit}`;
  const word = statusLabel ?? status.label;

  return (
    <div className={`gauge ${status.className}`}>
      <div className="gauge-head">
        <span className="gauge-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="gauge-label">{label}</span>
        {helpKey !== undefined && (
          <button
            type="button"
            className="gauge-help-toggle"
            aria-expanded={helpOpen}
            aria-label={`What is ${label}?`}
            onClick={() => {
              setHelpOpen((open) => !open);
            }}
          >
            ?
          </button>
        )}
        <span className="gauge-status">
          <span aria-hidden="true">{status.glyph}</span> {word}
        </span>
      </div>

      {helpKey !== undefined && helpOpen && <p className="gauge-help-text">{gaugeHelp(helpKey, level)}</p>}

      <div className="gauge-value">{shown}</div>

      <div
        className="gauge-track"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${shown}, ${word}`}
        aria-label={label}
      >
        <div className="gauge-fill" style={{ width: `${pct}%` }} />
      </div>

      {detail !== undefined && <div className="gauge-detail">{detail}</div>}
    </div>
  );
}
