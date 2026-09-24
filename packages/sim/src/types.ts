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
  /** M7.6 Part D.11: duststorm-2018's own residual cost — a floor `dustObscurationFraction`
   *  can never be cleaned below, once this incident has resolved at least once ("dust
   *  accumulation is PERMANENT and cumulative", LORENZ-2020-INSIGHT-DUST). Monotonically
   *  non-decreasing, same "no free undo" pattern as arrayAreaLossM2/scrubberEfficiencyFraction. */
  dustObscurationFloorFraction: number;
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
  /** Permanent solar array area lost to a sealed-off module (M7.5's depress-mir97 residual
   *  cost, docs/INCIDENT_MAGNITUDES.md #1 — "sealing Spektr cost about half of Mir's power").
   *  Monotonically non-decreasing: there is no in-game way to recover a sealed module. */
  arrayAreaLossM2: number;
}

export interface ThermalState {
  habitatTempC: number;
  heaterKw: number;
  /** Active cooling (radiator-loop) power this hour — thermalControl run in reverse, bounded
   *  by the same rated capacity as heating. Fixes a real gap `thermalStage` had until M7.5
   *  surfaced it: with no cooling term at all, a hot environment (lunar daytime,
   *  outsideTempC ~117 degC) had heat flowing in with nothing to reject it, and the
   *  always-on heater made a bad situation worse — an unbounded thermal runaway not caused
   *  by any incident. */
  radiatorKw: number;
  crewHeatKw: number;
  lossKw: number;
}

export interface AtmosphereState {
  o2Kg: number;
  co2Kg: number;
  habitatVolumeM3: number;
  o2PartialPressureMmHg: number;
  co2PartialPressureMmHg: number;
  /** Permanent CO2 scrubber efficiency multiplier, 1 = full rated capacity. M7.5's
   *  o2tank-apollo13 residual cost (docs/INCIDENT_MAGNITUDES.md #2): the improvised fix that
   *  stops the incident's CO2 rise is not as good as the original hardware. Monotonically
   *  non-increasing — there is no in-game way to restore lost efficiency. */
  scrubberEfficiencyFraction: number;
  /** M7.6 Part D.12: scrubber-iss's own chronic-exposure residual cost — an integral of
   *  hours-above-limit weighted by how far above (mmHg*h), not just a threshold crossing.
   *  "cumulative CO2 exposure above 3 mmHg is tracked and carries lasting performance cost,
   *  not just momentary." Monotonically non-decreasing. */
  cumulativeCo2ExposureAboveLimitMmHgHours: number;
  /** Whether co2ChronicExposureThresholdMmHgHours has already applied its one-time,
   *  permanent crew fatigue cost — guards against re-applying it every subsequent hour the
   *  cumulative exposure stays above threshold. */
  chronicCo2PenaltyApplied: boolean;
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
  /** Heat-stress clock (M7.5, docs/INCIDENT_MAGNITUDES.md #3 — the wet-bulb check "mirroring
   *  the cold path"). Capped at "critical" in crewCondition(): no sourced heat-death timeline
   *  exists the way NASA-HYPOTHERMIA-2008 gives cold, so this never reaches "lost". */
  heatStressClock: number;
  /** Last computed inspired O2 partial pressure, mmHg — stored for the UI/debrief, not just
   *  derived on demand, so a Black Box entry can show the number that actually triggered it. */
  pio2MmHg: number;
  /** M7.7 §6: the hour this member's `crewCondition()` most recently became "critical",
   *  cleared the moment it improves. Lets `shouldConsiderAbort` (engine/outcome.ts) read a
   *  real sustained-duration signal ("critical for N hours") instead of a same-instant check. */
  criticalSinceHour?: number;

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
  /** M7.7 §2: permanent output/capacity penalty from an improvised repair (spares ran out,
   *  the fix used something else). 0 = full rated capacity. Monotonically non-decreasing —
   *  mirrors AtmosphereState.scrubberEfficiencyFraction's "no free undo" pattern, generalised
   *  to any system instead of one hardcoded case. */
  efficiencyPenaltyFraction: number;
}

/** M7.6 Part D.9 revision: a dedicated, tracked store for firefighting equipment — distinct
 *  from a `SystemId`'s own repair `spares`, which model electronics/mechanical parts, not
 *  consumable safety gear. Replaces fire-mir97's earlier stand-in of spending
 *  `powerDistribution`'s repair spares for "used an extinguisher," which was both the wrong
 *  pool and (via a redundant manual decrement alongside a declared `sparesCost`) double-spent.
 *  Global, not per-system, since a station's fire-safety store isn't owned by any one system. */
export interface SafetyConsumablesState {
  fireExtinguishers: number;
  /** One consumed at the start of a smoke-recovery window; once exhausted the crew is on
   *  filter masks (a real, lesser level of protection, MIR-FIRE-LINENGER) for the rest of it. */
  respiratorCartridges: number;
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

/** M7.7 §3: a small, real accumulator for "science objectives completed" — jezero-outpost's
 *  new primaryGoal reads it (engine/goals.ts). Fed by crop harvests, MOXIE output and comms
 *  uptime (models/food.ts, isru.ts, comms.ts), matching the Station rules' own mention of
 *  "science data return" living under Communications. */
export interface ScienceState {
  points: number;
}

/** M7.7 §1: the real, pooled, per-day crew-hours budget every incident response and repair
 *  now actually draws from — replacing the declared-but-never-enforced `crewHoursCost`
 *  fields M7.6's audit found. One pool across the living crew (a disclosed simplification;
 *  real NASA planning is per-crew-member), reset each 24-Earth-hour day boundary. */
export interface CrewHoursState {
  budgetTodayHours: number;
  spentTodayHours: number;
  queue: QueuedWork[];
}

/**
 * A response whose full cost didn't fit in the day it was chosen — plain data (brief rule 2:
 * no function fields in state), referencing its response by id the same way `ActiveIncident`
 * references its `IncidentDefinition`. Paid down FIFO from each new day's budget
 * (engine/crewHours.ts); once `hoursRemaining` reaches 0 the referenced response's `effect`
 * actually runs — "work slips to the next sol" made real and visible in the Black Box.
 */
export interface QueuedWork {
  readonly id: string;
  readonly incidentId: string;
  readonly definitionId: string;
  readonly responseId: string;
  readonly totalHours: number;
  hoursRemaining: number;
  readonly queuedAtHour: number;
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
  safetyConsumables: SafetyConsumablesState;
  science: ScienceState;
  crewHours: CrewHoursState;
  /** M7.7 §7: a temporary, global multiplier on crew metabolic output (CO2 production,
   *  body heat) — 1 = normal. The o2tank-apollo13 incident's `rationActivity` response is
   *  the one thing that changes it today, restored to 1 once that incident resolves. A
   *  disclosed simplification: real activity reduction would be per-crew-member, not fleet
   *  wide. */
  crewActivityFraction: number;
  /** Incidents in flight or resolved this run. Plain, serialisable records only — the
   *  catalog they reference (definitions, responses, effect functions) lives in
   *  engine/incidents.ts, alongside Scenario itself, never inside SimState. */
  activeIncidents: ActiveIncident[];
  rng: RngState;
  log: LogEntry[];
  status: RunStatus;
  /** Set when status leaves "running"; an i18n code, not prose. */
  endReasonCode?: string;
  /** M7.7 §4: whether `scenario.stretchGoal` was also met, computed once alongside the
   *  primary goal in engine/outcome.ts's `determineOutcome`. Reporting only — never changes
   *  `status` itself, which stays the brief's own four outcomes. */
  stretchGoalMet?: boolean;
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
  /** M7.7 §2: the hour the owning station actually noticed this incident — `undefined` means
   *  still undetected. The incident's own `physicsEffect`/`ongoingEffect` run either way (the
   *  physical process doesn't care if anyone's looking); only response availability and the
   *  `warningTimeHours` countdown wait for detection. An unstaffed owning station may never
   *  detect it automatically. */
  detectedAtHour?: number;
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
    | "missionGoalsMet"
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
  /** M7.7 §3/§4: the science-points threshold `"missionGoalsMet"` requires. 0 on scenarios
   *  whose goal doesn't read it (science still accrues everywhere science.ts's hooks fire,
   *  it just isn't a win condition there). */
  readonly scienceTargetPoints: number;
}
