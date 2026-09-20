import type { Scenario, ScenarioId } from "../../types.js";
import { firstLight } from "./firstLight.js";
import { jezeroOutpost } from "./jezero.js";
import { theLongNight } from "./theLongNight.js";

/** Every scenario, by id. */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  "jezero-outpost": jezeroOutpost,
  "first-light": firstLight,
  "the-long-night": theLongNight,
};

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS[id];
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(SCENARIOS).join(", ")}`);
  }
  return scenario;
}

export { firstLight, jezeroOutpost, theLongNight };
