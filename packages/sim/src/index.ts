/**
 * @sol-keeper/sim — the pure, deterministic outpost simulation.
 *
 * Contract: no DOM, no network, no wall clock, no `Math.random`. Give it the same `Params`
 * and you get the same final state and the same log, byte for byte.
 */
export type {
  AtmosphereState,
  Body,
  CommsState,
  CrewLocation,
  CrewMember,
  CropTray,
  Difficulty,
  EnvironmentState,
  EventId,
  FoodState,
  HazardKind,
  InitialResources,
  IsruState,
  LogEntry,
  LogKind,
  Params,
  PowerState,
  RadiationState,
  RunStatus,
  Scenario,
  ScenarioId,
  ScriptedEvent,
  Severity,
  SimState,
  SurvivalMode,
  SystemId,
  SystemSpec,
  SystemState,
  ThermalState,
  WaterState,
} from "./types.js";

export type { Constant, Confidence, SourceId } from "./data/sources.js";
export { SOURCE_IDS, isConstant, walkConstants } from "./data/sources.js";
export {
  CONSTANTS,
  crew,
  environment,
  food,
  habitat,
  lifeSupport,
  management,
  physics,
  power,
  radiation,
  survivalModes,
} from "./data/constants.js";

export { SCENARIOS, firstLight, getScenario, jezeroOutpost, theLongNight } from "./data/scenarios/index.js";

export type { RngState, Stream, StreamName } from "./engine/rng.js";
export { Rng, createRngState } from "./engine/rng.js";

export type { TickContext, Stage } from "./engine/context.js";
export {
  EventLogger,
  causalCascade,
  directEffects,
  entriesWithCode,
  rootCauses,
} from "./engine/log.js";
export { createInitialState } from "./engine/state.js";
export { PIPELINE, run, tick } from "./engine/tick.js";
export { equivalentSystemMass, scenarioEsmBreakdown } from "./engine/esm.js";
export type {
  EsmBreakdown,
  EsmInputs,
  PowerInfrastructure,
  ScenarioEsmBreakdown,
  ScenarioEsmLine,
} from "./engine/esm.js";
export {
  contingencyFraction,
  failureRatePerHour,
  requiredMarginFraction,
  riskBand,
} from "./engine/risk.js";

export { missionWaterLossKg } from "./models/water.js";
export { cropCycleDays, cropRequiredLightHours, rationKgPerCrewDay } from "./models/food.js";
export { gcrTransmission, speTransmission, effectiveShieldingGPerCm2 } from "./models/radiation.js";
export { hourlyCrewO2Grams, moxiesPerCrewMember } from "./models/isru.js";
export { crewHeatKwPerPerson } from "./models/thermal.js";
export { solarGenerationKw } from "./models/power.js";
export { sunFactor, dayLengthHours } from "./models/environment.js";

export * as units from "./units.js";

import type { Params, SimState } from "./types.js";
import { getScenario } from "./data/scenarios/index.js";
import { createInitialState } from "./engine/state.js";
import { run } from "./engine/tick.js";

/** Convenience: build the opening state for a run. */
export function createRun(params: Params): SimState {
  return createInitialState(params);
}

/** Convenience: create and play a whole scenario through to its end. */
export function runScenario(params: Params, extraHours = 0): SimState {
  const scenario = getScenario(params.scenarioId);
  const state = createInitialState(params);
  return run(state, params, scenario, scenario.durationHours + extraHours);
}
