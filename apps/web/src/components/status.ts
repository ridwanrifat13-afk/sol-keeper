/**
 * Status levels, and the rule that stops them being colour-only (brief rule 6).
 *
 * Every status reaches the player three ways at once: a glyph, a word, and a bar fill
 * pattern. Colour is the fourth channel, never the first. A player who cannot distinguish
 * red from green, or who is looking at a washed-out phone screen in daylight, reads exactly
 * the same information.
 */
export type StatusLevel = "nominal" | "caution" | "critical";

export interface StatusPresentation {
  readonly level: StatusLevel;
  /** Shape-distinct glyph, not a coloured dot. */
  readonly glyph: string;
  /** Always rendered as text next to the glyph. */
  readonly label: string;
  /** CSS class carrying both the colour and the bar fill pattern. */
  readonly className: string;
}

export const STATUS: Record<StatusLevel, StatusPresentation> = {
  nominal: { level: "nominal", glyph: "●", label: "Nominal", className: "is-nominal" },
  caution: { level: "caution", glyph: "▲", label: "Caution", className: "is-caution" },
  critical: { level: "critical", glyph: "■", label: "Critical", className: "is-critical" },
};

/**
 * Status from a fraction of a healthy full value, where more is better (water, food, power).
 */
export function statusFromReserve(fraction: number): StatusPresentation {
  if (fraction <= 0.15) return STATUS.critical;
  if (fraction <= 0.35) return STATUS.caution;
  return STATUS.nominal;
}

/** Status from a value that should stay below a limit (CO2). */
export function statusFromCeiling(value: number, limit: number): StatusPresentation {
  if (value >= limit) return STATUS.critical;
  if (value >= limit * 0.7) return STATUS.caution;
  return STATUS.nominal;
}

/** Status from a value that should stay inside a band (oxygen partial pressure, cabin temp). */
export function statusFromBand(value: number, low: number, high: number): StatusPresentation {
  if (value < low || value > high) return STATUS.critical;
  const margin = (high - low) * 0.15;
  if (value < low + margin || value > high - margin) return STATUS.caution;
  return STATUS.nominal;
}

/** Severity of a log entry mapped onto the same three levels. */
export function statusFromSeverity(severity: string): StatusPresentation {
  if (severity === "critical") return STATUS.critical;
  if (severity === "warning" || severity === "caution") return STATUS.caution;
  return STATUS.nominal;
}
