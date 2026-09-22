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
import { incidents as incidentConstants, missionDifficulty } from "../data/constants.js";
import type { SourceId } from "../data/sources.js";
import { effectiveShieldingGPerCm2, speTransmission } from "../models/radiation.js";
import type { ActiveIncident, CrewMember, SimState, StationId, SystemId } from "../types.js";
import { clamp } from "../units.js";
import type { TickContext } from "./context.js";

export interface IncidentResponse {
  readonly id: string;
  /** i18n key root for the 3-depth response text shown on the Decision Card (M8). */
  readonly i18nKey: string;
  readonly effect: (ctx: TickContext, incident: ActiveIncident) => void;
  readonly crewHoursCost?: number;
  readonly sparesCost?: number;
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
    sourceId: "INC-DEPRESS-MIR97-PENDING",
    station: "incidentCommand",
    // No hull/structural SystemId exists in this sim; thermalControl is the closest hardware
    // proxy available and is otherwise unused by any other incident — a disclosed judgment
    // call, same as SYSTEM_TO_STATION's own thermalControl mapping (engine/stations.ts).
    trigger: { kind: "componentRisk", system: "thermalControl", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 1,
    physicsEffect: (ctx) => {
      const lostKg = incidentConstants.depressMir97LeakRateKgPerHour.value * 2;
      ctx.state.atmosphere.o2Kg = Math.max(0, ctx.state.atmosphere.o2Kg - lostKg);
      ctx.log.log({
        kind: "hazard",
        severity: "critical",
        code: "incident.depress-mir97.leaking",
        data: { lostKg: round(lostKg) },
      });
    },
    responses: [
      {
        id: "patchHull",
        i18nKey: "incident.depress-mir97.response.patchHull",
        sparesCost: 1,
        crewHoursCost: 3,
        effect: (ctx) => {
          ctx.state.atmosphere.o2Kg += incidentConstants.depressMir97LeakRateKgPerHour.value;
        },
      },
      {
        id: "sealAndShelter",
        i18nKey: "incident.depress-mir97.response.sealAndShelter",
        crewHoursCost: 1,
        effect: () => {},
      },
      {
        id: "ignoreLeak",
        i18nKey: "incident.depress-mir97.response.ignoreLeak",
        effect: (ctx) => {
          ctx.state.atmosphere.o2Kg = Math.max(
            0,
            ctx.state.atmosphere.o2Kg - incidentConstants.depressMir97LeakRateKgPerHour.value * 8,
          );
        },
      },
    ],
    defaultResponseId: "ignoreLeak",
    briefKey: "incident.depress-mir97.brief",
  },

  {
    id: "o2tank-apollo13",
    analogue: "Apollo 13 oxygen tank failure, 1970",
    sourceId: "INC-O2TANK-APOLLO13-PENDING",
    station: "lifeSupport",
    trigger: { kind: "componentRisk", system: "oxygenGenerator", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 2,
    physicsEffect: (ctx) => {
      const before = ctx.state.atmosphere.o2Kg;
      ctx.state.atmosphere.o2Kg = before * (1 - incidentConstants.o2TankFailureLossFraction.value);
      ctx.log.log({
        kind: "hazard",
        severity: "critical",
        code: "incident.o2tank-apollo13.rupture",
        data: { lostKg: round(before - ctx.state.atmosphere.o2Kg) },
      });
    },
    responses: [
      {
        id: "switchToBackup",
        i18nKey: "incident.o2tank-apollo13.response.switchToBackup",
        sparesCost: 1,
        crewHoursCost: 2,
        effect: (ctx) => {
          ctx.state.atmosphere.o2Kg *= 1.5;
        },
      },
      {
        id: "rationO2",
        i18nKey: "incident.o2tank-apollo13.response.rationO2",
        crewHoursCost: 1,
        effect: () => {},
      },
      {
        id: "noResponse",
        i18nKey: "incident.o2tank-apollo13.response.noResponse",
        effect: (ctx) => {
          ctx.state.atmosphere.o2Kg *= 0.5;
        },
      },
    ],
    defaultResponseId: "noResponse",
    briefKey: "incident.o2tank-apollo13.brief",
  },

  {
    id: "coolant-ms22",
    analogue: "Soyuz MS-22 coolant leak, December 2022",
    sourceId: "INC-COOLANT-MS22-PENDING",
    station: "incidentCommand",
    trigger: { kind: "componentRisk", system: "waterRecovery", baseChancePerHour: incidentConstants.componentRiskBaseChancePerHour.value },
    warningTimeHours: 3,
    // A failed coolant loop stops regulating cabin temperature at all, so it drifts toward
    // the (very cold, airless-body) exterior rather than overheating — the same lethal
    // cold path models/crew.ts already tracks for a thermalControl failure, reused here
    // rather than a separate, untracked hyperthermia mechanic this sim has no model for.
    physicsEffect: (ctx) => {
      const dropC = incidentConstants.coolantLeakMs22RateFraction.value * 20;
      ctx.state.thermal.habitatTempC -= dropC;
      ctx.log.log({
        kind: "hazard",
        severity: "warning",
        code: "incident.coolant-ms22.overheating",
        data: { riseC: round(dropC) },
      });
    },
    responses: [
      {
        id: "reroute",
        i18nKey: "incident.coolant-ms22.response.reroute",
        sparesCost: 1,
        crewHoursCost: 3,
        effect: (ctx) => {
          ctx.state.thermal.habitatTempC += 6;
        },
      },
      {
        id: "ventHeat",
        i18nKey: "incident.coolant-ms22.response.ventHeat",
        crewHoursCost: 1,
        effect: (ctx) => {
          ctx.state.thermal.habitatTempC += 2;
        },
      },
      {
        id: "noResponse",
        i18nKey: "incident.coolant-ms22.response.noResponse",
        effect: (ctx) => {
          ctx.state.thermal.habitatTempC -= 10;
        },
      },
    ],
    defaultResponseId: "noResponse",
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
