/**
 * The Reality Dial (brief: "Core innovation"). One simulation, three depths:
 *   - cadet (8-11): emoji and bars, no raw units, plain words for status.
 *   - specialist (12-14): the real units and numbers — the level M2 shipped by default.
 *   - commander (15+): the same numbers, framed with the engineering vocabulary and the
 *     thresholds a real operator would think in.
 *
 * Nothing in packages/sim knows this type exists. The level only ever selects which string
 * or number format a component reaches for; it never changes what the simulation computes.
 */
export type DialLevel = "cadet" | "specialist" | "commander";

/** App UI language (M11). Structurally identical to `i18n/config.ts`'s own
 *  `SupportedLanguage` — kept as a separate declaration rather than an import so that
 *  `dial/` and `i18n/logText.ts`/`i18n/decisionText.ts` never have to load i18next's own
 *  setup (and its `localStorage` read) just to know the type of a function parameter. */
export type Language = "en" | "bn";

export const DIAL_LEVELS: readonly DialLevel[] = ["cadet", "specialist", "commander"];

export const DIAL_LEVEL_LABELS: Record<DialLevel, string> = {
  cadet: "Cadet",
  specialist: "Specialist",
  commander: "Commander",
};

export const DIAL_LEVEL_HINTS: Record<DialLevel, string> = {
  cadet: "Ages 8-11 · pictures and bars",
  specialist: "Ages 12-14 · real numbers and units",
  commander: "Ages 15+ · thresholds and rates",
};
