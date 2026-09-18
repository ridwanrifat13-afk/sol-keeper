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
import { solsToHours } from "../units.js";
import type { Stage, TickContext } from "./context.js";
import { hazardsAndFailuresStage } from "./events.js";
import { EventLogger } from "./log.js";
import { Rng } from "./rng.js";

export interface NamedStage {
  readonly name: string;
  readonly run: Stage;
}

/** The pipeline. Order is load-bearing; changing it changes every saved run. */
export const PIPELINE: readonly NamedStage[] = [
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
  { name: "endConditions", run: endConditionsStage },
];

/** Stage 10 — has the run finished, and how. */
export function endConditionsStage(ctx: TickContext): void {
  const { state, scenario, log } = ctx;
  if (state.status !== "running") return;

  const living = state.crew.filter((c) => c.alive);

  if (living.length === 0) {
    state.status = "lost";
    state.endReasonCode = "end.crewLost";
    log.log({
      kind: "milestone",
      severity: "critical",
      code: "end.crewLost",
      data: { hour: state.hour },
    });
    return;
  }

  const durationHours = solsToHours(scenario.durationSols);
  if (state.hour >= durationHours) {
    state.status = "won";
    state.endReasonCode = "end.missionComplete";
    log.log({
      kind: "milestone",
      severity: "info",
      code: "end.missionComplete",
      data: {
        sols: scenario.durationSols,
        hours: Math.round(durationHours),
        crewSurviving: living.length,
      },
    });
  }
}

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
