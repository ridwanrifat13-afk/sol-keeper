/**
 * The incident catalog and its per-tick stage (Phase 2 brief, plan §3).
 *
 * Split the same way `HazardKind`/`applyHazard` (engine/events.ts) and `MissionGoal`/
 * `checkGoal` (engine/goals.ts) already are: `IncidentDefinition`/`IncidentResponse` hold
 * function fields and live only here, in config, never inside `SimState`. `ActiveIncident`
 * (types.ts) is the plain, serialisable record of what happened, so a save stays
 * `structuredClone`-able (brief rule 2).
 *
 * Decision resolution is deliberately NOT this file's job. `incidentsStage` only triggers an
 * incident, applies its one-time `physicsEffect`, and — if `warningTimeHours` elapses with
 * no decision — applies the `defaultResponseId` itself, so an incident nobody ever answers
 * still resolves the same way whether that's an idle bot or a real player who looked away.
 * Choosing a response *before* that deadline is a `DecisionStrategy`'s job (engine/bots.ts,
 * a real player's Decision Card in M8), invoked by whatever drives `tick()`
 * (engine/runWithBot.ts) via the exported `applyResponse`, never by the pipeline itself —
 * that keeps `tick()`'s own signature exactly as it was in Phase 1.
 */
import { incidents as incidentConstants, missionDifficulty, physics } from "../data/constants.js";
import type { SourceId } from "../data/sources.js";
import { effectiveShieldingGPerCm2, speTransmission } from "../models/radiation.js";
import type { ActiveIncident, CrewMember, SimState, StationId, SystemId } from "../types.js";
import {
  chokedOrificeEffectiveVelocityMPerS,
  chokedOrificeLeakTimeConstantHours,
  clamp,
  massKgForPartialPressureMmHg,
} from "../units.js";
import type { TickContext } from "./context.js";

export interface IncidentResponse {
  readonly id: string;
  /** i18n key root for the 3-depth response text shown on the Decision Card (M8). */
  readonly i18nKey: string;
  readonly effect: (ctx: TickContext, incident: ActiveIncident) => void;
  readonly crewHoursCost?: number;
  readonly sparesCost?: number;
  /** M7.5: true when this response does NOT address the incident's root physical cause, so
   *  `ongoingEffect` keeps running hour after hour even once "resolved" — the leak keeps
   *  leaking, the CO2 keeps rising. Omitted (false) means this response stops it. Without
   *  this, "resolved" and "fixed" would be the same thing, which is exactly wrong for a
   *  default/do-nothing response: docs/INCIDENT_MAGNITUDES.md's whole point is that ignoring
   *  a real physical process lets it keep getting worse, not that it politely stops once the
   *  warning window lapses. */
  readonly leavesOngoing?: boolean;
}

export type IncidentTrigger =
  // Its own independent per-hour roll, not gated behind the (very low — about one failure
  // per 50,000 TRL-9 system-hours, engine/risk.ts) ordinary system-reliability rate: Phase
  // 1 tuned that rate for a game where nothing was meant to be lethal, and reusing it here
  // made every one of these five incidents almost never fire in an entire mission (measured
  // during M7 balance tuning: ~0.04 expected occurrences over Jezero's 720 h). A dedicated
  // "incidents" RNG stream and rate keeps this tunable without touching Phase 1's own
  // reliability/repair mechanics (validation/risk.test.ts, power.test.ts) at all.
  | { readonly kind: "componentRisk"; readonly system: SystemId; readonly baseChancePerHour: number }
  | { readonly kind: "hazardStart"; readonly hazardLogCode: string };

export interface IncidentDefinition {
  readonly id: string;
  readonly analogue: string;
  readonly sourceId: SourceId;
  readonly station: StationId;
  readonly trigger: IncidentTrigger;
  readonly warningTimeHours: number;
  /** Applied once, the hour the incident triggers — not a per-hour ongoing effect. */
  readonly physicsEffect: (ctx: TickContext) => void;
  /** M7.5: applied every hour the incident is active and its chosen (or not yet chosen)
   *  response has `leavesOngoing` — the physical process this incident models continuing to
   *  evolve on its own (docs/INCIDENT_MAGNITUDES.md's choked-flow leak, CO2 rise, and
   *  first-order-lag heat-rise curves). Optional: most incidents are still a one-time hit. */
  readonly ongoingEffect?: (ctx: TickContext, incident: ActiveIncident) => void;
  readonly responses: readonly IncidentResponse[];
  readonly defaultResponseId: string;
  /** i18n key for the 3-depth incident description. */
  readonly briefKey: string;
}

const round = (x: number): number => Math.round(x * 1000) / 1000;

/** The crew member an incident's response effects act on when the trigger itself doesn't
 *  name one (fire, injury) — the worst-off living member, since each incident is one-time
 *  (never retriggers) so no other incident is competing to set injuryFraction meanwhile. */
function mostInjured(state: SimState): CrewMember | undefined {
  const living = state.crew.filter((c) => c.alive);
  if (living.length === 0) return undefined;
  return living.reduce((worst, c) => (c.injuryFraction > worst.injuryFraction ? c : worst));
}

export const INCIDENT_CATALOG: readonly IncidentDefinition[] = [
  {
    id: "fire-mir97",
    analogue: "Mir fire, February 1997",
    sourceId: "NASA-SP-4030",
    station: "incidentCommand",
    trigger: { kind: "componentRisk", system: "powerDistribution", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    // A 14-minute burn leaves almost no real decision window — 1 hour (the sim's own tick
    // resolution, the smallest non-zero value that still lets a same-hour decision beat the
    // auto-default) rather than 0, which would resolve to the default before any decision
    // maker (bot or, in M8, a player) ever got a chance to answer.
    warningTimeHours: 1,
    physicsEffect: (ctx) => {
      const living = ctx.state.crew.filter((c) => c.alive);
      const hit = ctx.rng.stream("incidents").pick(living);
      if (hit !== undefined) {
        hit.injuryFraction = clamp(hit.injuryFraction + 0.35, 0, 1);
        ctx.log.log({
          kind: "crew",
          severity: "critical",
          code: "incident.fire-mir97.crewInjured",
          data: { crew: hit.name, durationMinutes: incidentConstants.mirFireDurationMinutes.value },
        });
      }
    },
    responses: [
      {
        id: "fight",
        i18nKey: "incident.fire-mir97.response.fight",
        sparesCost: 1,
        crewHoursCost: 4,
        effect: (ctx) => {
          const target = mostInjured(ctx.state);
          if (target !== undefined) target.injuryFraction = clamp(target.injuryFraction - 0.25, 0, 1);
          const system = ctx.state.systems.powerDistribution;
          if (system !== undefined && system.spares > 0) system.spares -= 1;
        },
      },
      {
        id: "evacuate",
        i18nKey: "incident.fire-mir97.response.evacuate",
        crewHoursCost: 2,
        effect: () => {}, // contains it without treating further; the initial injury stands
      },
      {
        id: "ignore",
        i18nKey: "incident.fire-mir97.response.ignore",
        effect: (ctx) => {
          const target = mostInjured(ctx.state);
          if (target !== undefined) target.injuryFraction = clamp(target.injuryFraction + 0.2, 0, 1);
          const system = ctx.state.systems.powerDistribution;
          if (system !== undefined) system.operational = false;
        },
      },
    ],
    defaultResponseId: "ignore",
    briefKey: "incident.fire-mir97.brief",
  },

  {
    id: "depress-mir97",
    analogue: "Progress–Mir collision and depressurization, June 1997",
    sourceId: "NASA-SMA-MIR-COLLISION",
    station: "incidentCommand",
    // No hull/structural SystemId exists in this sim; thermalControl is the closest hardware
    // proxy available and is otherwise unused by any other incident — a disclosed judgment
    // call, same as SYSTEM_TO_STATION's own thermalControl mapping (engine/stations.ts).
    trigger: { kind: "componentRisk", system: "thermalControl", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 1,
    physicsEffect: (ctx) => {
      ctx.log.log({ kind: "hazard", severity: "critical", code: "incident.depress-mir97.leaking", data: {} });
    },
    // M7.5, docs/INCIDENT_MAGNITUDES.md #1: no leak rate was ever published, so it is DERIVED
    // from choked (sonic) orifice flow rather than invented. `habitatVolumeM3` stands in for
    // the leaking module's own volume (no sub-module architecture exists in this sim — a
    // disclosed simplification; the doc's own worked example uses Spektr's 62 m^3 directly).
    ongoingEffect: (ctx) => {
      const { state } = ctx;
      const effectiveVelocityMPerS = chokedOrificeEffectiveVelocityMPerS(
        state.thermal.habitatTempC,
        physics.specificHeatRatioAir.value,
        physics.molarMassAirGPerMol.value,
      );
      const tauHours = chokedOrificeLeakTimeConstantHours(
        state.atmosphere.habitatVolumeM3,
        incidentConstants.depressMir97HoleDiameterMm.value,
        physics.dischargeCoefficientSharpOrifice.value,
        effectiveVelocityMPerS,
      );
      state.atmosphere.o2Kg *= Math.exp(-ctx.dtHours / tauHours);
    },
    responses: [
      {
        // The real, historically accurate response — and M7.5's model case for "no free
        // fix": stops the leak completely, but permanently costs the arrays that went down
        // with the sealed module (docs/INCIDENT_MAGNITUDES.md: "sealing Spektr cost about
        // half of Mir's power").
        id: "sealModule",
        i18nKey: "incident.depress-mir97.response.sealModule",
        crewHoursCost: 2,
        effect: (ctx) => {
          ctx.state.power.arrayAreaLossM2 +=
            ctx.scenario.initial.solarArrayAreaM2 * incidentConstants.depressMir97SealedModulePowerLossFraction.value;
        },
      },
      {
        // A costlier alternative that avoids the permanent power loss entirely — the real
        // trade-off M7.5 asks for: spend a lot of resources now, or lose capability forever.
        id: "patchHull",
        i18nKey: "incident.depress-mir97.response.patchHull",
        sparesCost: 2,
        crewHoursCost: 6,
        effect: () => {},
      },
      {
        id: "ignoreLeak",
        i18nKey: "incident.depress-mir97.response.ignoreLeak",
        leavesOngoing: true,
        effect: () => {},
      },
    ],
    defaultResponseId: "ignoreLeak",
    briefKey: "incident.depress-mir97.brief",
  },

  {
    // Reframed by M7.5 (docs/INCIDENT_MAGNITUDES.md #2): the real crew-threatening
    // consequence of the LM lifeboat scenario was CO2 buildup from running 3 crew on a
    // 2-crew scrubber, not oxygen loss — a more historically accurate incident than M7's
    // original "O2 rupture" framing.
    id: "o2tank-apollo13",
    analogue: "Apollo 13 oxygen tank failure, 1970 (CO2 buildup in the LM lifeboat)",
    sourceId: "A13-CO2",
    station: "lifeSupport",
    trigger: { kind: "componentRisk", system: "oxygenGenerator", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 2,
    physicsEffect: (ctx) => {
      ctx.log.log({ kind: "hazard", severity: "critical", code: "incident.o2tank-apollo13.rupture", data: {} });
    },
    // Linear rise calibrated to the addendum's own two anchors: reaches apollo13PeakCo2MmHg
    // at apollo13HoursToPeakCo2 (the historical "worst point"), uncapped while unaddressed —
    // real crew debrief timeline ("began to threaten the crew after about a day and a half"),
    // not a saturating curve, since the excess CO2 production rate was roughly constant.
    ongoingEffect: (ctx) => {
      const { state } = ctx;
      const ratePerHour = incidentConstants.apollo13PeakCo2MmHg.value / incidentConstants.apollo13HoursToPeakCo2.value;
      const extraKg = massKgForPartialPressureMmHg(
        ratePerHour * ctx.dtHours,
        physics.molarMassCo2GPerMol.value,
        state.atmosphere.habitatVolumeM3,
        state.thermal.habitatTempC,
      );
      state.atmosphere.co2Kg += extraKg;
    },
    responses: [
      {
        // The real fix — stops the rise and brings CO2 back down toward the documented
        // post-fix level, but the improvised adapter is never as good as the original
        // hardware: a permanent scrubber efficiency penalty, M7.5's residual cost.
        id: "improviseAdapter",
        i18nKey: "incident.o2tank-apollo13.response.improviseAdapter",
        sparesCost: 1,
        crewHoursCost: 3,
        effect: (ctx, incident) => {
          const { state } = ctx;
          // Bring the incident's own contribution down to the documented post-fix residual
          // (not to zero — "stayed below 2 mmHg", not "returned to nothing"), computed from
          // elapsed hours rather than tracked state, since the rise rate is deterministic.
          const ratePerHour = incidentConstants.apollo13PeakCo2MmHg.value / incidentConstants.apollo13HoursToPeakCo2.value;
          const addedSoFarMmHg = ratePerHour * (state.hour - incident.triggeredAtHour);
          const excessMmHg = Math.max(0, addedSoFarMmHg - incidentConstants.apollo13PostFixCo2MmHg.value);
          const excessKg = massKgForPartialPressureMmHg(
            excessMmHg,
            physics.molarMassCo2GPerMol.value,
            state.atmosphere.habitatVolumeM3,
            state.thermal.habitatTempC,
          );
          state.atmosphere.co2Kg = Math.max(0, state.atmosphere.co2Kg - excessKg);
          // The improvised adapter is never as good as the original hardware — permanent,
          // M7.5's residual cost for the good response, not a free fix.
          state.atmosphere.scrubberEfficiencyFraction *= 1 - incidentConstants.apollo13ScrubberDegradationAfterFixFraction.value;
        },
      },
      {
        id: "rationActivity",
        i18nKey: "incident.o2tank-apollo13.response.rationActivity",
        crewHoursCost: 1,
        leavesOngoing: true,
        effect: () => {},
      },
      {
        id: "noResponse",
        i18nKey: "incident.o2tank-apollo13.response.noResponse",
        leavesOngoing: true,
        effect: () => {},
      },
    ],
    defaultResponseId: "noResponse",
    briefKey: "incident.o2tank-apollo13.brief",
  },

  {
    id: "coolant-ms22",
    analogue: "Soyuz MS-22 coolant leak, December 2022",
    sourceId: "MS22-THERMAL",
    station: "incidentCommand",
    trigger: { kind: "componentRisk", system: "waterRecovery", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 3,
    physicsEffect: (ctx) => {
      ctx.log.log({ kind: "hazard", severity: "warning", code: "incident.coolant-ms22.overheating", data: {} });
    },
    // M7.5, docs/INCIDENT_MAGNITUDES.md #3: a failed coolant loop stops rejecting heat, so
    // the cabin approaches its documented peak (30 degC) on a first-order lag reaching
    // ms22HoursToStabilize's own time constant — real reported figures, not overheating
    // without bound. The equipment bay (measured +10 degC over cabin) has no separate state
    // in this sim; it is read as a fixed offset wherever the incident's own thresholds need it.
    ongoingEffect: (ctx) => {
      const { state } = ctx;
      const target = incidentConstants.ms22CabinPeakTempC.value;
      const lag = ctx.dtHours / incidentConstants.ms22HoursToStabilize.value;
      state.thermal.habitatTempC += (target - state.thermal.habitatTempC) * lag;

      const bayTempC = state.thermal.habitatTempC + (incidentConstants.ms22EquipmentBayPeakTempC.value - target);
      if (bayTempC >= incidentConstants.ms22EquipmentBayFailureTempC.value) {
        // Equipment strain from sustained bay heat — a real consequence proxy, since this sim
        // has no dedicated "electronics" system; comms hardware is the closest bay-mounted
        // equipment it tracks.
        ctx.log.logEdge({
          kind: "fault",
          severity: "warning",
          code: "incident.coolant-ms22.equipmentStrain",
          system: "comms",
          data: { bayTempC: Math.round(bayTempC) },
        });
      }
    },
    responses: [
      {
        // The only real mitigation NASA/Roscosmos actually used — and M7.5's other residual
        // -cost model case: shedding load cools the cabin back down immediately, but costs
        // real capability while the fault persists (docs/INCIDENT_MAGNITUDES.md: "science
        // stops, ISRU stops, comms windows are missed, and crops lose light").
        id: "shedLoad",
        i18nKey: "incident.coolant-ms22.response.shedLoad",
        crewHoursCost: 6,
        effect: (ctx) => {
          // A bounded, physically modest correction (not an absolute reset to a fixed
          // value) — now that thermalStage has a real thermostat (see its own comment on
          // the M7.5-surfaced runaway bug), habitatTempC is never wildly out of range, so
          // shedding load only needs to undo roughly this incident's own contribution.
          ctx.state.thermal.habitatTempC -= 8;
          for (const tray of ctx.state.food.trays) {
            tray.healthFraction = clamp(
              tray.healthFraction - incidentConstants.ms22CropHealthLossFromShedLoad.value,
              0,
              1,
            );
          }
        },
      },
      {
        id: "rideItOut",
        i18nKey: "incident.coolant-ms22.response.rideItOut",
        leavesOngoing: true,
        effect: () => {},
      },
    ],
    defaultResponseId: "rideItOut",
    briefKey: "incident.coolant-ms22.brief",
  },

  {
    id: "spe-1972",
    analogue: "August 1972 solar particle event",
    sourceId: "INC-SPE-1972-PENDING",
    // The decisive action (shelter) belongs to Incident Command; Comms only carries the
    // warning that a real crew would have received ahead of it (not modelled separately).
    station: "incidentCommand",
    trigger: { kind: "hazardStart", hazardLogCode: "hazard.solarParticleEvent.start" },
    warningTimeHours: 1,
    physicsEffect: (ctx) => {
      const { state, log } = ctx;
      for (const member of state.crew) {
        if (!member.alive) continue;
        const shielding = effectiveShieldingGPerCm2(member.location, state.radiation.shieldingGPerCm2);
        const spikeMSv =
          ((state.radiation.ambientMSvPerDay * incidentConstants.spe1972DoseMultiplier.value) / 24) *
          speTransmission(shielding);
        member.cumulativeDoseMSv += spikeMSv;
        member.eventDoseMSv += spikeMSv;
      }
      log.log({
        kind: "hazard",
        severity: "critical",
        code: "incident.spe-1972.spike",
        data: { multiplier: incidentConstants.spe1972DoseMultiplier.value },
      });
    },
    responses: [
      {
        id: "shelterNow",
        i18nKey: "incident.spe-1972.response.shelterNow",
        crewHoursCost: 2,
        effect: (ctx) => {
          for (const member of ctx.state.crew) {
            if (member.alive) member.location = "stormShelter";
          }
        },
      },
      {
        id: "continueOperations",
        i18nKey: "incident.spe-1972.response.continueOperations",
        effect: () => {},
      },
    ],
    defaultResponseId: "continueOperations",
    briefKey: "incident.spe-1972.brief",
  },

  {
    id: "duststorm-2018",
    analogue: "2018 Mars global dust storm",
    sourceId: "INC-DUSTSTORM2018-PENDING",
    station: "power",
    trigger: { kind: "hazardStart", hazardLogCode: "hazard.dustStorm.start" },
    warningTimeHours: 2,
    physicsEffect: (ctx) => {
      const e = ctx.state.environment;
      e.dustObscurationFraction = clamp(
        e.dustObscurationFraction + incidentConstants.duststorm2018ObscurationSpikeFraction.value,
        0,
        0.95,
      );
      ctx.log.log({
        kind: "hazard",
        severity: "critical",
        code: "incident.duststorm-2018.severe",
        data: { obscuration: round(e.dustObscurationFraction) },
      });
    },
    responses: [
      {
        id: "cleanArrays",
        i18nKey: "incident.duststorm-2018.response.cleanArrays",
        crewHoursCost: 3,
        effect: (ctx) => {
          const e = ctx.state.environment;
          e.dustObscurationFraction = clamp(e.dustObscurationFraction - 0.15, 0, 0.95);
        },
      },
      {
        id: "shedNonEssential",
        i18nKey: "incident.duststorm-2018.response.shedNonEssential",
        crewHoursCost: 1,
        effect: (ctx) => {
          const e = ctx.state.environment;
          e.dustObscurationFraction = clamp(e.dustObscurationFraction - 0.05, 0, 0.95);
        },
      },
      {
        id: "noResponse",
        i18nKey: "incident.duststorm-2018.response.noResponse",
        effect: () => {},
      },
    ],
    defaultResponseId: "noResponse",
    briefKey: "incident.duststorm-2018.brief",
  },

  {
    id: "scrubber-iss",
    analogue: "ISS CO2 scrubber (CDRA) recurring failures",
    sourceId: "INC-SCRUBBER-ISS-PENDING",
    station: "lifeSupport",
    trigger: { kind: "componentRisk", system: "co2Scrubber", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 4,
    physicsEffect: (ctx) => {
      // A harder-to-fix failure mode than the ordinary TRL-scaled roll (engine/events.ts) —
      // it takes the scrubber offline outright (unlike an ordinary failure, no 15%-per-hour
      // chance of a spontaneous repair) and costs it an extra spare, per
      // scrubberIssFailureRateMultiplier.
      const system = ctx.state.systems.co2Scrubber;
      if (system !== undefined) {
        system.operational = false;
        system.spares = Math.max(0, system.spares - 1);
      }
      ctx.log.log({
        kind: "hazard",
        severity: "warning",
        code: "incident.scrubber-iss.recurring",
        data: { multiplier: incidentConstants.scrubberIssFailureRateMultiplier.value },
      });
    },
    responses: [
      {
        id: "swapCartridge",
        i18nKey: "incident.scrubber-iss.response.swapCartridge",
        sparesCost: 1,
        crewHoursCost: 2,
        effect: (ctx) => {
          const system = ctx.state.systems.co2Scrubber;
          if (system !== undefined) system.operational = true;
        },
      },
      {
        id: "manualVenting",
        i18nKey: "incident.scrubber-iss.response.manualVenting",
        crewHoursCost: 3,
        effect: (ctx) => {
          ctx.state.atmosphere.co2Kg = Math.max(0, ctx.state.atmosphere.co2Kg * 0.7);
        },
      },
      {
        id: "noResponse",
        i18nKey: "incident.scrubber-iss.response.noResponse",
        effect: () => {},
      },
    ],
    defaultResponseId: "noResponse",
    briefKey: "incident.scrubber-iss.brief",
  },
];

function alreadyTriggered(state: SimState, definitionId: string): boolean {
  return state.activeIncidents.some((i) => i.definitionId === definitionId);
}

function triggeredThisHour(ctx: TickContext, trigger: IncidentTrigger): boolean {
  const { state } = ctx;
  switch (trigger.kind) {
    case "componentRisk": {
      const system = state.systems[trigger.system];
      if (system === undefined) return false; // this scenario does not carry that hardware
      const rateMultiplier = missionDifficulty[ctx.params.difficulty].incidentRateMultiplier.value;
      return ctx.rng.stream("incidents").chance(trigger.baseChancePerHour * rateMultiplier);
    }
    case "hazardStart":
      return state.log.some((e) => e.hour === state.hour && e.code === trigger.hazardLogCode);
  }
}

/** `warningTimeHours` scaled by Mission Difficulty's `warningTimeMultiplier` — the one
 *  physics-adjacent field a difficulty preset is allowed to touch (plan §6). */
function scaledWarningTimeHours(ctx: TickContext, def: IncidentDefinition): number {
  return def.warningTimeHours * missionDifficulty[ctx.params.difficulty].warningTimeMultiplier.value;
}

/** M7.5: whether `def.ongoingEffect` should still run for `incident` this hour — before any
 *  decision, or after one that left the root cause unaddressed (`leavesOngoing`). */
function shouldRunOngoingEffect(def: IncidentDefinition, incident: ActiveIncident): boolean {
  if (def.ongoingEffect === undefined) return false;
  if (incident.chosenResponseId === undefined) return true;
  const response = def.responses.find((r) => r.id === incident.chosenResponseId);
  return response?.leavesOngoing === true;
}

function responseById(def: IncidentDefinition, responseId: string): IncidentResponse {
  const found = def.responses.find((r) => r.id === responseId);
  if (found === undefined) {
    throw new Error(`Unknown response "${responseId}" for incident "${def.id}"`);
  }
  return found;
}

/**
 * Resolves an active incident with a chosen response: applies its effect, spends the crew
 * time it costs, and marks it resolved. Exported so a `DecisionStrategy`'s caller
 * (engine/bots.ts's driver today, a real player's Decision Card in M8) can call it directly
 * — `incidentsStage` itself only calls this for the *default* response, once the warning
 * window lapses with nobody having decided.
 */
export function applyResponse(
  ctx: TickContext,
  def: IncidentDefinition,
  incident: ActiveIncident,
  responseId: string,
): void {
  const response = responseById(def, responseId);
  incident.chosenResponseId = response.id;
  incident.resolvedAtHour = ctx.state.hour;
  ctx.log.because(incident.cause, () => {
    response.effect(ctx, incident);
    ctx.log.log({
      kind: "decision",
      severity: "info",
      code: `incident.${def.id}.resolved`,
      data: { response: response.id },
    });
  });
}

export function incidentsStage(ctx: TickContext): void {
  const { state, log } = ctx;

  for (const def of INCIDENT_CATALOG) {
    if (alreadyTriggered(state, def.id) || !triggeredThisHour(ctx, def.trigger)) continue;

    const cause = log.log({
      kind: "hazard",
      severity: "critical",
      code: `incident.${def.id}.start`,
      data: { analogue: def.analogue, station: def.station },
    });
    const incident: ActiveIncident = {
      id: `${def.id}-${state.hour}`,
      definitionId: def.id,
      triggeredAtHour: state.hour,
      cause,
    };
    state.activeIncidents.push(incident);
    log.because(cause, () => def.physicsEffect(ctx));
  }

  // M7.5: the physical process an incident models keeps evolving hour after hour for as
  // long as nobody has actually addressed its root cause — see `leavesOngoing` above. Runs
  // for brand-new incidents too (the trigger hour gets its first hour of exposure, same as
  // physicsEffect always has).
  for (const incident of state.activeIncidents) {
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined || !shouldRunOngoingEffect(def, incident)) continue;
    log.because(incident.cause, () => def.ongoingEffect?.(ctx, incident));
  }

  // The "nobody decided" consequence: felt identically whether that's an idle bot or a
  // player who never opened the Decision Card, and identical to what a bot could have
  // chosen deliberately — the deadline itself is the mechanism, not a special case.
  for (const incident of state.activeIncidents) {
    if (incident.resolvedAtHour !== undefined) continue;
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined) continue;
    if (state.hour - incident.triggeredAtHour < scaledWarningTimeHours(ctx, def)) continue;

    applyResponse(ctx, def, incident, def.defaultResponseId);
  }
}
