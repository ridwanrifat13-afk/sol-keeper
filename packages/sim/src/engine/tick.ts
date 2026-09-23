/**
 * The hourly tick pipeline.
 *
 * Stage order is the brief's, and it lives in exactly one array so that the "same seed =
 * same run" guarantee has exactly one place to break. Two stages the brief's numbered list
 * does not name — ISRU and comms — are placed where their inputs are ready: MOXIE after the
 * water loop because both compete for the same power, comms after radiation because neither
 * touches a resource.
 */
import { atmosphereStage } from "../models/atmosphere.js";
import { commsStage } from "../models/comms.js";
import { crewStage } from "../models/crew.js";
import { environmentStage } from "../models/environment.js";
import { foodStage } from "../models/food.js";
import { isruStage } from "../models/isru.js";
import { powerStage } from "../models/power.js";
import { radiationStage } from "../models/radiation.js";
import { thermalStage } from "../models/thermal.js";
import { waterStage } from "../models/water.js";
import type { Params, Scenario, SimState } from "../types.js";
import type { Stage, TickContext } from "./context.js";
import { crewHoursStage } from "./crewHours.js";
import { hazardsAndFailuresStage } from "./events.js";
import { incidentsStage } from "./incidents.js";
import { EventLogger } from "./log.js";
import { determineOutcome } from "./outcome.js";
import { Rng } from "./rng.js";

export interface NamedStage {
  readonly name: string;
  readonly run: Stage;
}

/** The pipeline. Order is load-bearing; changing it changes every saved run. `crewHours`
 *  (M7.7 §1) runs first so a day-boundary budget reset and queued-work completion are both
 *  visible to everything else that hour, including a response's effect landing exactly when
 *  its queue empties. `incidents` sits after `hazardsAndFailures` so a stochastic system
 *  failure can be the trigger an incident checks for the same hour it happens, and
 *  `endConditions` (now `determineOutcome`, engine/outcome.ts) stays last so every stage's
 *  consequences are visible to it. */
export const PIPELINE: readonly NamedStage[] = [
  { name: "crewHours", run: crewHoursStage },
  { name: "environment", run: environmentStage },
  { name: "power", run: powerStage },
  { name: "thermal", run: thermalStage },
  { name: "atmosphere", run: atmosphereStage },
  { name: "water", run: waterStage },
  { name: "isru", run: isruStage },
  { name: "food", run: foodStage },
  { name: "radiation", run: radiationStage },
  { name: "comms", run: commsStage },
  { name: "crew", run: crewStage },
  { name: "hazardsAndFailures", run: hazardsAndFailuresStage },
  { name: "incidents", run: incidentsStage },
  { name: "endConditions", run: determineOutcome },
];

/**
 * Advances the state by one hour, in place.
 *
 * The state is mutated rather than copied: a 30-sol run is 740 ticks and the web app keeps
 * a snapshot only when the player asks for one, so cloning every hour would be waste.
 * Determinism comes from the seeded RNG, not from immutability.
 */
export function tick(state: SimState, params: Params, scenario: Scenario): SimState {
  if (state.status !== "running") return state;

  state.hour += 1;

  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };

  for (const stage of PIPELINE) {
    stage.run(ctx);
  }
  return state;
}

/** Runs until the mission ends or `maxHours` is reached. Returns the same state object. */
export function run(
  state: SimState,
  params: Params,
  scenario: Scenario,
  maxHours: number,
): SimState {
  for (let i = 0; i < maxHours && state.status === "running"; i++) {
    tick(state, params, scenario);
  }
  return state;
}
