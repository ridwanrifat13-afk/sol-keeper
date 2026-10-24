import type { Scenario, ScenarioId } from "../../types.js";
import { firstLight } from "./firstLight.js";
import { jezeroOutpost } from "./jezero.js";
import { theLongNight } from "./theLongNight.js";
import { crisisApollo13Co2 } from "./crisis-apollo13-co2.js";

/** Every scenario, by id. */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  "jezero-outpost": jezeroOutpost,
  "first-light": firstLight,
  "the-long-night": theLongNight,
  "crisis-apollo13-co2": crisisApollo13Co2,
  // Stubs for upcoming M9.3 scenarios (to be built after Apollo 13 checkpoint):
  "crisis-spe-1972": crisisApollo13Co2,
  "crisis-mir-fire": crisisApollo13Co2,
};

export const CRISIS_SCENARIOS = [crisisApollo13Co2] as const;

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS[id];
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(SCENARIOS).join(", ")}`);
  }
  return scenario;
}

export { firstLight, jezeroOutpost, theLongNight, crisisApollo13Co2 };
