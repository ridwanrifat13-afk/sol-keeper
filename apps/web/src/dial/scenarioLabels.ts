import type { ScenarioId } from "@sol-keeper/sim";

/**
 * The three scenarios' thematic mission name and one-line hint — not a field on `Scenario`
 * itself (only its landing site's name is), so this is the one place it's spelled out.
 * `ScenarioSwitch.tsx`, `ScenarioStep.tsx`, and the Home view's launch-window cards all read
 * from here now, instead of each hand-keeping its own copy (the previous state: two files
 * already had to be "kept in sync by hand"; a third copy for the home page would have made
 * that worse, not just repeated it).
 */
export const SCENARIO_LABELS: Record<ScenarioId, { readonly label: string; readonly hint: string }> = {
  "jezero-outpost": { label: "Jezero Outpost", hint: "Mars · 30 sols · dust storm" },
  "first-light": { label: "First Light", hint: "Moon · one 354 h night" },
  "the-long-night": { label: "The Long Night", hint: "Moon · 3 lunar nights, reactor-powered" },
};
