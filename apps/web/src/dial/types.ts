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
