import type { Scenario, ScenarioId } from "../../types.js";
import { firstLight } from "./firstLight.js";
import { jezeroOutpost } from "./jezero.js";
import { theLongNight } from "./theLongNight.js";
import { crisisApollo13Co2 } from "./crisis-apollo13-co2.js";
import { crisisSpe1972 } from "./crisis-spe-1972.js";
import { crisisMirFire } from "./crisis-mir-fire.js";

/** Every scenario, by id. */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  "jezero-outpost": jezeroOutpost,
  "first-light": firstLight,
  "the-long-night": theLongNight,
  "crisis-apollo13-co2": crisisApollo13Co2,
  "crisis-spe-1972": crisisSpe1972,
  "crisis-mir-fire": crisisMirFire,
};

export const CRISIS_SCENARIOS = [
  crisisApollo13Co2,
  crisisSpe1972,
  crisisMirFire,
] as const;

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS[id];
  if (scenario === undefined) {
    throw new Error(`Unknown scenario: ${id}. Known: ${Object.keys(SCENARIOS).join(", ")}`);
  }
  return scenario;
}

export {
  firstLight,
  jezeroOutpost,
  theLongNight,
  crisisApollo13Co2,
  crisisSpe1972,
  crisisMirFire,
};

