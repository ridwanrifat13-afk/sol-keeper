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
export type Difficulty = "cadet" | "standard" | "commander";

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
  readonly difficulty: Difficulty;
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
  healthFraction: number;
  moraleFraction: number;
  cumulativeDoseMSv: number;
  /** Dose accrued during the current solar particle event, against the 250 mSv limit. */
  eventDoseMSv: number;
  bodyTempC: number;
  alive: boolean;
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

export type RunStatus = "running" | "won" | "lost";

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
  systems: Record<SystemId, SystemState>;
  comms: CommsState;
  isru: IsruState;
  rng: RngState;
  log: LogEntry[];
  status: RunStatus;
  /** Set when status leaves "running"; an i18n code, not prose. */
  endReasonCode?: string;
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

export interface Scenario {
  readonly id: ScenarioId;
  readonly body: Body;
  readonly site: { readonly name: string; readonly latDeg: number; readonly lonDeg: number };
  readonly durationSols: number;
  readonly crewSize: number;
  readonly initial: InitialResources;
  readonly systems: readonly SystemSpec[];
  readonly scripted: readonly ScriptedEvent[];
  /** i18n key for the mission briefing shown in the Prepare view. */
  readonly briefingKey: string;
}
