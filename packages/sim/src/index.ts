/**
 * @sol-keeper/sim — the pure, deterministic outpost simulation.
 *
 * Contract: no DOM, no network, no wall clock, no `Math.random`. Give it the same `Params`
 * and you get the same final state and the same log, byte for byte.
 */
export type {
  ActiveIncident,
  AtmosphereState,
  Body,
  CommsPriority,
  CommsState,
  CrewCondition,
  CrewLocation,
  CrewMember,
  CropTray,
  EnvironmentState,
  EventId,
  FoodState,
  HazardKind,
  IceAccess,
  IlluminationModel,
  InitialResources,
  IsruState,
  LandingSite,
  LandingSiteId,
  LegacyDifficulty,
  LogEntry,
  LogKind,
  MissionDifficulty,
  MissionGoal,
  Params,
  PowerArchitecture,
  PowerState,
  RadiationState,
  RunStatus,
  Scenario,
  ScenarioId,
  ScriptedEvent,
  ShieldingApproach,
  Severity,
  SimState,
  StationId,
  SurvivalMode,
  SystemId,
  SystemSpec,
  SystemState,
  ThermalState,
  WaterState,
} from "./types.js";
export { legacyDifficultyToMissionDifficulty } from "./types.js";

export type { Constant, Confidence, SourceId } from "./data/sources.js";
export { SOURCE_IDS, isConstant, walkConstants } from "./data/sources.js";
export {
  CONSTANTS,
  crew,
  environment,
  food,
  habitat,
  incidents as incidentConstants,
  lifeSupport,
  management,
  missionDifficulty,
  physics,
  physiology,
  power,
  radiation,
  survivalModes,
} from "./data/constants.js";

export { SCENARIOS, firstLight, getScenario, jezeroOutpost, theLongNight } from "./data/scenarios/index.js";
export { LANDING_SITES, getLandingSite, landingSitesForBody } from "./data/landingSites.js";

export type { SizedPowerArchitecture } from "./engine/powerArchitecture.js";
export { sizePowerArchitecture } from "./engine/powerArchitecture.js";

export type { SizedShielding } from "./engine/shielding.js";
export { sizeShielding } from "./engine/shielding.js";

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
export type { NamedStage } from "./engine/tick.js";

export type { IncidentDefinition, IncidentResponse, IncidentTrigger } from "./engine/incidents.js";
export {
  INCIDENT_CATALOG,
  applyResponse,
  incidentsStage,
  scaledWarningTimeHours,
  wouldResolveThisHour,
} from "./engine/incidents.js";
export { SYSTEM_TO_STATION, STATION_IDS, isDoubleCovering, stationCoverer, stationPerformance } from "./engine/stations.js";
export type { AbortResult } from "./engine/outcome.js";
export { determineOutcome, inMarsDepartureWindow, requestAbort } from "./engine/outcome.js";
export { checkGoal } from "./engine/goals.js";
export type { Bot, BotId } from "./engine/bots.js";
export { BOTS, getBot, greedyBot, idleBot, prudentBot, worstChoiceBot } from "./engine/bots.js";
export { runWithBot, tickWithBot } from "./engine/runWithBot.js";
export type { CombinationResult, DecisionCoverageEntry, SeedOutcome } from "./engine/balance.js";
export { decisionCoverage, runCombination } from "./engine/balance.js";
export { equivalentSystemMass, scenarioEsmBreakdown } from "./engine/esm.js";
export type {
  EsmBreakdown,
  EsmInputs,
  PowerInfrastructure,
  ScenarioEsmBreakdown,
  ScenarioEsmLine,
} from "./engine/esm.js";
export type { Maturity, ProjectPhase, RiskBand } from "./engine/risk.js";
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
export { crewCondition, feverMetabolicMultiplier, availableCrewHours, worstCauseCode } from "./models/crew.js";
export { pio2MmHg, totalPressureMmHg } from "./models/atmosphere.js";

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
