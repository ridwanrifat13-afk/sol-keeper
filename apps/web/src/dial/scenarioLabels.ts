import type { ScenarioId } from "@sol-keeper/sim";

/**
 * The scenarios' thematic mission name and one-line hint.
 */
export const SCENARIO_LABELS: Record<ScenarioId, { readonly label: string; readonly hint: string }> = {
  "jezero-outpost": { label: "Jezero Outpost", hint: "Mars · 30 sols · dust storm" },
  "first-light": { label: "First Light", hint: "Moon · one 354 h night" },
  "the-long-night": { label: "The Long Night", hint: "Moon · 3 lunar nights, reactor-powered" },
  "crisis-apollo13-co2": { label: "Apollo 13 CO₂ Buildup", hint: "April 1970 · LM Aquarius · 4 h to fix" },
  "crisis-spe-1972": { label: "Solar Particle Event 1972", hint: "August 1972 · Translunar · Lethal Radiation" },
  "crisis-mir-fire": { label: "Mir Fire 1997", hint: "February 1997 · Kvant-1 · Toxic Smoke" },
};
