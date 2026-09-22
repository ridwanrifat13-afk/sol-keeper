/**
 * Core simulation types.
 *
 * Two rules shape everything here:
 *   - `SimState` is plain data and fully serialisable, so `structuredClone(state)` is a
 *     complete save and two runs from one seed can be deep-equal compared (brief rule 2).
 *   - the log carries codes and numbers, never rendered prose, so one event can be shown at
 *     three Reality Dial depths in two languages (brief rule 4).
 */
import type { RngState } from "./engine/rng.js";

export type Body = "mars" | "moon";
export type ScenarioId = "jezero-outpost" | "first-light" | "the-long-night";

/**
 * Scenario parameters only (starting margins, incident frequency, warning time) — never
 * physics (Phase 2 brief). Replaces the Phase 1 `Difficulty` type, whose values
 * (`"cadet"|"standard"|"commander"`) collided in *name* with the Reality Dial's own
 * `DialLevel` (`apps/web/src/dial/types.ts`) while meaning something unrelated — that
 * collision is exactly why the field went unread for six milestones (see
 * `legacyDifficultyToMissionDifficulty` below for the old→new mapping kept for save/URL
 * compatibility).
 */
export type MissionDifficulty = "training" | "nominal" | "flightRated";

/** Phase 1's difficulty values, in case one is still sitting in a persisted store or URL. */
export type LegacyDifficulty = "cadet" | "standard" | "commander";

/** One of the five mission roles the outpost is operated through (Phase 2 brief). */
export type StationId = "power" | "lifeSupport" | "comms" | "incidentCommand" | "missionCommand";

/** The worst rung any of a crew member's physiology clocks or thresholds has reached. */
export type CrewCondition = "nominal" | "impaired" | "critical" | "lost";

/** Rationing level selected by the player. Thresholds live in constants.survivalModes. */
export type SurvivalMode = "nominal" | "mode1" | "mode2";

/** Where a crew member is, which decides how much shielding they are behind. */
export type CrewLocation = "habitat" | "stormShelter" | "eva";

export type SystemId =
  | "lifeSupport"
  | "co2Scrubber"
  | "oxygenGenerator"
  | "waterRecovery"
  | "thermalControl"
  | "powerDistribution"
  | "moxie"
  | "greenhouse"
  | "comms";

// ---------------------------------------------------------------------------
// Run inputs
// ---------------------------------------------------------------------------

export interface Params {
  readonly scenarioId: ScenarioId;
  readonly seed: number;
  readonly crewSize: number;
  /**
   * Mission start as an ISO date string. The simulation never parses or advances it — it is
   * carried through so the UI and the Live Sky feature can label events. Mission time is
   * `SimState.hour` and nothing else (brief rule 2).
   */
  readonly missionStartIso: string;
  readonly difficulty: MissionDifficulty;
}

/** Old Phase 1 values map onto the closest new preset, so a stale save or URL still loads. */
export function legacyDifficultyToMissionDifficulty(d: LegacyDifficulty): MissionDifficulty {
  switch (d) {
    case "cadet":
      return "training";
    case "standard":
      return "nominal";
    case "commander":
      return "flightRated";
  }
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

/** `${hour}:${seq}` — unique, ordered, and readable in a debrief. */
export type EventId = string;

export type LogKind = "resource" | "fault" | "hazard" | "decision" | "crew" | "milestone";
export type Severity = "info" | "caution" | "warning" | "critical";

export interface LogEntry {
  readonly id: EventId;
  readonly hour: number;
  readonly kind: LogKind;
  readonly severity: Severity;
  /** i18n key root, e.g. "power.brownout". Rendered as `log.<code>.<dialLevel>`. */
  readonly code: string;
  /** Interpolation values. Numbers stay numbers so the Reality Dial can reformat them. */
  readonly data: Readonly<Record<string, number | string>>;
  /** Causal parents, captured by the cause stack in engine/log.ts (brief rule 4). */
  readonly causedBy?: readonly EventId[];
  readonly system?: SystemId;
}

// ---------------------------------------------------------------------------
// Sub-states
// ---------------------------------------------------------------------------

export interface EnvironmentState {
  /** Solar irradiance reaching the array plane, after sun angle and dust. */
  irradianceWPerM2: number;
  /** Cumulative dust obscuration on the arrays, 0 = clean. */
  dustObscurationFraction: number;
  outsideTempC: number;
  isDaylight: boolean;
  /** True while a dust storm or equivalent hazard is suppressing sunlight. */
  stormActive: boolean;
}

export interface PowerState {
  generationKw: number;
  demandKw: number;
  servedKw: number;
  batteryEnergyKwh: number;
  batteryCapacityKwh: number;
  /** Systems shed this hour, in the order they were shed. */
  shedSystems: SystemId[];
}

export interface ThermalState {
  habitatTempC: number;
  heaterKw: number;
  crewHeatKw: number;
  lossKw: number;
}

export interface AtmosphereState {
  o2Kg: number;
  co2Kg: number;
  habitatVolumeM3: number;
  o2PartialPressureMmHg: number;
  co2PartialPressureMmHg: number;
}

export interface WaterState {
  potableKg: number;
  wasteKg: number;
  recoveryFraction: number;
  /** Cumulative water lost to the loop's inefficiency — the number that ends a mission. */
  cumulativeLossKg: number;
  /** This hour's actual intake / required intake, 0-1. What the hydration clock (crewStage)
   *  reads — potableKg alone can't say whether *this hour's* ration was actually met. */
  intakeFraction: number;
}

export interface CropTray {
  readonly id: string;
  readonly crop: "lettuce" | "wheat" | "soybean" | "potato";
  readonly areaM2: number;
  /** Accumulated lit hours; the tray harvests when this reaches its cycle requirement. */
  lightHours: number;
  healthFraction: number;
}

export interface FoodState {
  storedDryMassKg: number;
  mode: SurvivalMode;
  trays: CropTray[];
  cumulativeHarvestKg: number;
  /** This hour's actual ration / required ration, 0-1. What the starvation clock
   *  (crewStage) reads — see WaterState.intakeFraction for why this can't be derived from
   *  storedDryMassKg alone. */
  intakeFraction: number;
}

export interface RadiationState {
  /** Ambient unshielded dose rate for this body, before shielding. */
  ambientMSvPerDay: number;
  /** Areal density of the habitat shell plus any water wall. */
  shieldingGPerCm2: number;
  solarParticleEventActive: boolean;
}

export interface CrewMember {
  readonly id: string;
  readonly name: string;
  location: CrewLocation;
  /** Legacy Phase 1 scalar. Kept for the Ripple Web's crew-health readout; the condition
   *  ladder (crewCondition(member), models/crew.ts) is the real per-threat model now. */
  healthFraction: number;
  moraleFraction: number;
  cumulativeDoseMSv: number;
  /** Dose accrued during the current solar particle event, against the 250 mSv limit. */
  eventDoseMSv: number;
  bodyTempC: number;
  alive: boolean;

  // --- Phase 2 physiology clocks (docs/INCIDENTS_AND_THRESHOLDS.md). Each 0 (fine) -> 1
  // (lost); models/crew.ts advances them and crewCondition() reads the worst rung.
  /** Thirst clock, ~doc S1.3. */
  hydrationClock: number;
  /** Hunger clock (energy-deficit integrator), ~doc S1.4. */
  starvationClock: number;
  /** Cold clock, ~doc S1.5. */
  hypothermiaClock: number;
  /** Time-at-critical-PIO2 clock. The doc names the critical->lost step as having no NASA
   *  number, only a tuned one (S1.1), so it gets its own clock rather than an instant kill. */
  hypoxiaClock: number;
  /** Incident-driven (burns, depressurization exposure), not tick-driven. */
  injuryFraction: number;
  /** Rises while this member is covering a second station (Station rules); decays at rest. */
  fatigueFraction: number;
  /** Last computed inspired O2 partial pressure, mmHg — stored for the UI/debrief, not just
   *  derived on demand, so a Black Box entry can show the number that actually triggered it. */
  pio2MmHg: number;

  readonly primaryStation: StationId;
  readonly backupStation: StationId;
}

export interface SystemState {
  readonly id: SystemId;
  /** Technology Readiness Level, 1-9. Lower is less reliable (see engine/risk.ts). */
  readonly trl: number;
  readonly nominalPowerKw: number;
  /** Load-shed order: lower numbers are shed last. */
  readonly priority: number;
  operational: boolean;
  spares: number;
  poweredThisHour: boolean;
}

export interface CommsState {
  /** One-way light time to Earth, seconds. Set from the scenario or /api/light-time. */
  oneWayLightSeconds: number;
  blackout: boolean;
}

export interface IsruState {
  moxieRunning: boolean;
  /** Oxygen made from the Martian atmosphere by MOXIE. Costs power, costs no water. */
  moxieO2ProducedKg: number;
  /** Oxygen split out of stored water by the electrolyser. Costs power *and* water. */
  electrolysisO2ProducedKg: number;
}

// ---------------------------------------------------------------------------
// Whole state
// ---------------------------------------------------------------------------

/**
 * `"won"|"lost"` (Phase 1) is now four real outcomes (Phase 2 brief): `success` (goal met),
 * `partial` (crew safe, goal missed — this is where a cumulative-dose breach lands: mission
 * failure, not death), `abort` (player/bot-initiated, a real transit cost on the Moon, gated
 * to the departure window on Mars), `loss` (zero crew survive — losing *some* crew does not
 * end the run, only all of them). See engine/outcome.ts.
 */
export type RunStatus = "running" | "success" | "partial" | "abort" | "loss";

export interface SimState {
  /** Hours since mission start. The only clock in the simulation. */
  hour: number;
  environment: EnvironmentState;
  power: PowerState;
  thermal: ThermalState;
  atmosphere: AtmosphereState;
  water: WaterState;
  food: FoodState;
  radiation: RadiationState;
  crew: CrewMember[];
  /**
   * Partial, not `Record<SystemId, SystemState>`: a scenario lists only the systems it
   * actually carries (a Moon scenario has no reason to include `moxie`, a Mars-only ISRU
   * experiment), so any specific system may simply not exist for a given run. Every model
   * that reads a specific key must check for `undefined` rather than assume completeness —
   * `buildSystems` in engine/state.ts only ever populates what `scenario.systems` lists.
   */
  systems: Partial<Record<SystemId, SystemState>>;
  comms: CommsState;
  isru: IsruState;
  /** Incidents in flight or resolved this run. Plain, serialisable records only — the
   *  catalog they reference (definitions, responses, effect functions) lives in
   *  engine/incidents.ts, alongside Scenario itself, never inside SimState. */
  activeIncidents: ActiveIncident[];
  rng: RngState;
  log: LogEntry[];
  status: RunStatus;
  /** Set when status leaves "running"; an i18n code, not prose. */
  endReasonCode?: string;
}

/**
 * One incident instance. References an `IncidentDefinition.id` from engine/incidents.ts's
 * static catalog rather than embedding it, so this stays plain data (brief rule 2: the
 * whole state must be `structuredClone`-able and deep-equal comparable across two runs).
 */
export interface ActiveIncident {
  readonly id: string;
  readonly definitionId: string;
  readonly triggeredAtHour: number;
  readonly cause: EventId;
  resolvedAtHour?: number;
  chosenResponseId?: string;
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export interface SystemSpec {
  readonly id: SystemId;
  readonly trl: number;
  readonly nominalPowerKw: number;
  readonly priority: number;
  readonly spares: number;
}

export type HazardKind =
  "dustStorm" | "solarParticleEvent" | "pumpFailure" | "cropBlight" | "commsBlackout";

export interface ScriptedEvent {
  readonly atHour: number;
  readonly hazard: HazardKind;
  readonly durationHours: number;
  /** Hazard-specific magnitude, 0..1 where meaningful. */
  readonly magnitude?: number;
}

export interface InitialResources {
  readonly o2Kg: number;
  readonly co2Kg: number;
  readonly potableWaterKg: number;
  readonly foodDryMassKg: number;
  readonly batteryEnergyKwh: number;
  readonly batteryCapacityKwh: number;
  readonly habitatVolumeM3: number;
  readonly solarArrayAreaM2: number;
  readonly fissionReactorKwe: number;
  readonly shieldingGPerCm2: number;
  readonly cropTrays: readonly { readonly crop: CropTray["crop"]; readonly areaM2: number }[];
}

/**
 * A mission goal, checked by id in engine/outcome.ts (the same "plain data + a switch
 * elsewhere" split `HazardKind`/`applyHazard` already use, so a goal never needs to embed a
 * function and Scenario stays plain, serialisable config).
 */
export interface MissionGoal {
  readonly id:
    | "surviveWithDoseUnderLimit"
    | "harvestAllCropTrays"
    | "surviveFullDurationNoLoss"
    | "noSystemLeftFailed";
  /** i18n key for the 3-depth description shown in the briefing and the Debrief. */
  readonly briefKey: string;
}

export interface Scenario {
  readonly id: ScenarioId;
  readonly body: Body;
  readonly site: { readonly name: string; readonly latDeg: number; readonly lonDeg: number };
  readonly primaryGoal: MissionGoal;
  readonly stretchGoal: MissionGoal;
  /**
   * Mission duration in hours — the sim's one true time unit, so nothing downstream needs
   * to know whether the number came from Mars sols or Earth days. A scenario file converts
   * explicitly at definition time (brief rule 3); previously this field held `durationSols`
   * and every reader converted it via the *Mars* sol length regardless of `body`, which
   * would have quietly run a Moon scenario ~2.7% too long had one existed before this fix.
   */
  readonly durationHours: number;
  readonly crewSize: number;
  readonly initial: InitialResources;
  readonly systems: readonly SystemSpec[];
  readonly scripted: readonly ScriptedEvent[];
  /** i18n key for the mission briefing shown in the Prepare view. */
  readonly briefingKey: string;
}
