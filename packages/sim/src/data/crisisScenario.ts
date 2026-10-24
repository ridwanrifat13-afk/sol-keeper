/**
 * M9.3 — Historical Crisis Replay types & helpers.
 *
 * A CrisisScenario drops the player directly into a real documented spaceflight
 * emergency at its moment of onset, with historically sourced parameters.
 * No new engine code, no new physics, no new station logic.
 */
import type { Scenario, SimState } from "../types.js";

export interface KeyMetricSpec {
  readonly label: string;
  readonly playerValue: (state: SimState) => number;
  readonly historicalValue: number;
  readonly unit: string;
}

export interface HistoricalOutcome {
  readonly summary: string; // i18n key or descriptive text
  readonly keyMetric: KeyMetricSpec;
  readonly resolution: string; // what actually happened, i18n key or text
  readonly sourceId: string; // DATA_SOURCES.md ID (e.g. "A13-CO2")
  readonly nasaLink: string;
}

export interface CrisisScenario extends Scenario {
  /** World state at the moment of crisis onset (hour, atmosphere, active incidents, etc.). */
  readonly entryState: Partial<SimState>;
  /** i18n key for the briefing / opening description of the emergency. */
  readonly crisisOnsetDescription: string;
  /** Historical resolution and comparison benchmark. */
  readonly historicalOutcome: HistoricalOutcome;
  /** Materials physically on hand for improvisation / repair at onset. */
  readonly availableMaterials: readonly string[];
  /** Auto-ends run after this limit if unresolved. */
  readonly crisisMaxDurationHours: number;
}

export function isCrisisScenario(scenario: Scenario): scenario is CrisisScenario {
  return (
    typeof scenario === "object" &&
    scenario !== null &&
    "crisisMaxDurationHours" in scenario &&
    "historicalOutcome" in scenario
  );
}
