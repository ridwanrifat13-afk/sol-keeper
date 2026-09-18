import type { Scenario, ScenarioId } from "../../types.js";
import { jezeroOutpost } from "./jezero.js";

/** Every scenario, by id. Moon scenarios ("First Light", "The Long Night") land at M4. */
export const SCENARIOS: Partial<Record<ScenarioId, Scenario>> = {
  "jezero-outpost": jezeroOutpost,
};

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS[id];
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(SCENARIOS).join(", ")}`);
  }
  return scenario;
}

export { jezeroOutpost };
