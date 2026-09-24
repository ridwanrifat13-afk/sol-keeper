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
import { incidents as incidentConstants, management, missionDifficulty, physics, power as powerConstants } from "../data/constants.js";
import type { SourceId } from "../data/sources.js";
import { crewCondition } from "../models/crew.js";
import { effectiveShieldingGPerCm2, gcrTransmission, speTransmission } from "../models/radiation.js";
import type { ActiveIncident, CrewMember, QueuedWork, SimState, StationId, SystemId } from "../types.js";
import {
  chokedOrificeEffectiveVelocityMPerS,
  chokedOrificeLeakTimeConstantHours,
  clamp,
  massKgForPartialPressureMmHg,
} from "../units.js";
import type { TickContext } from "./context.js";
import { stationPerformance } from "./stations.js";

export interface IncidentResponse {
  readonly id: string;
  /** i18n key root for the 3-depth response text shown on the Decision Card (M8). */
  readonly i18nKey: string;
  readonly effect: (ctx: TickContext, incident: ActiveIncident) => void;
  readonly crewHoursCost?: number;
  readonly sparesCost?: number;
  /** M7.7 §2: which system's spares `sparesCost` actually draws from — required whenever
   *  `sparesCost` is set (docs/DECISION_AUDIT.md found declared costs going completely
   *  unenforced; this is what makes them real). */
  readonly sparesFromSystem?: SystemId;
  /** M7.5: true when this response does NOT address the incident's root physical cause, so
   *  `ongoingEffect` keeps running hour after hour even once "resolved" — the leak keeps
   *  leaking, the CO2 keeps rising. Omitted (false) means this response stops it. Without
   *  this, "resolved" and "fixed" would be the same thing, which is exactly wrong for a
   *  default/do-nothing response: docs/INCIDENT_MAGNITUDES.md's whole point is that ignoring
   *  a real physical process lets it keep getting worse, not that it politely stops once the
   *  warning window lapses. */
  readonly leavesOngoing?: boolean;
  /** M7.8 Part B: true when this response's `effect` unconditionally applies a permanent
   *  degradation to shared state (`o2tank-apollo13`'s `improviseAdapter` — a real M7.5
   *  residual cost, not a probabilistic improvised-repair penalty; that one already shows up
   *  through spares-shortfall detection). Declared, visible information a real Decision Card
   *  would show ("this component never runs at full capacity again"), so `prudentBot` can
   *  weigh it against how much mission is actually left — see its own note on why. */
  readonly permanentPenalty?: boolean;
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

/** M7.6 Part D.11: a cleaning EVA's own real, physics-based dose cost — the crew member sent
 *  out (picked the same way fire-mir97 picks who gets hurt: `rng.stream("incidents").pick`,
 *  not the outpost lead choosing the least-exposed member, since that knowledge is a bot/
 *  player's decision, not a fairness violation to model here) is exposed at the "eva"
 *  shielding factor for `hours`, using the exact GCR transmission physics `radiationStage`
 *  itself runs (models/radiation.ts) — not an invented EVA dose rate. */
function applyCleaningEvaDose(ctx: TickContext, hours: number): void {
  const { state } = ctx;
  const crewMember = ctx.rng.stream("incidents").pick(state.crew.filter((c) => c.alive));
  if (crewMember === undefined) return;
  const shielding = effectiveShieldingGPerCm2("eva", state.radiation.shieldingGPerCm2);
  const doseMSv = (state.radiation.ambientMSvPerDay / 24) * gcrTransmission(shielding) * hours;
  crewMember.cumulativeDoseMSv += doseMSv;
  crewMember.eventDoseMSv += doseMSv;
}

/** M7.6 Part D.11: "deep battery discharge cycles permanently reduce usable capacity" — a
 *  real property of battery chemistry in general, magnitude tuned (see
 *  duststorm2018BatteryDegradationFraction's own note). Checked once, from whichever response
 *  actually resolves this incident (including its own default), since the storm's own power
 *  crisis — not the cleanup choice made afterward — is what drove the battery down. */
function applyDeepDischargeBatteryDegradation(ctx: TickContext): void {
  const { state, log } = ctx;
  const p = state.power;
  const dodFloorKwh = p.batteryCapacityKwh * (1 - powerConstants.batteryDepthOfDischargeFraction.value);
  if (p.batteryEnergyKwh > dodFloorKwh) return;
  const lostKwh = p.batteryCapacityKwh * incidentConstants.duststorm2018BatteryDegradationFraction.value;
  p.batteryCapacityKwh = Math.max(0, p.batteryCapacityKwh - lostKwh);
  p.batteryEnergyKwh = Math.min(p.batteryEnergyKwh, p.batteryCapacityKwh);
  log.log({
    kind: "resource",
    severity: "warning",
    code: "incident.duststorm-2018.batteryDegraded",
    data: { lostKwh: round(lostKwh), newCapacityKwh: round(p.batteryCapacityKwh) },
  });
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
      const { state } = ctx;
      const living = state.crew.filter((c) => c.alive);
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
      // M7.6 Part D.9: two residual costs that apply regardless of which response is chosen,
      // since both are consequences of the fire itself, not of how the crew reacted to it.
      // "Damaged equipment stays damaged" — NASA-MIR-FIRE-25YR: some of Kvant-1's solar
      // panels were charred by the real fire.
      const powerSystem = state.systems.powerDistribution;
      if (powerSystem !== undefined) {
        powerSystem.efficiencyPenaltyFraction =
          1 - (1 - powerSystem.efficiencyPenaltyFraction) * (1 - incidentConstants.mirFirePanelDamageEfficiencyPenaltyFraction.value);
      }
      // "Cleanup costs crew-hours" — MIR-FIRE-LINENGER's own account of a real, extended
      // mop-up effort, billed the same hour regardless of response.
      state.crewHours.spentTodayHours += incidentConstants.mirFireCleanupCrewHours.value;
    },
    // "Smoke degrades air quality and crew performance for a recovery period" — every
    // response leaves this ongoing for mirFireSmokeRecoveryHours (MIR-FIRE-LINENGER), since
    // fighting, evacuating, or ignoring the fire all still leave the crew breathing the same
    // smoke afterward. The effect itself is a no-op once the window has passed, rather than
    // gating on leavesOngoing per response, so this stays a bounded tail, not a permanent one.
    // M7.6 Part D.9 revision: the crew's mirRespiratorCartridgeInitialStock of full-respirator
    // protection is consumed hour by hour of this same window; once exhausted they're on
    // filter masks (MIR-FIRE-LINENGER's own account) for the remainder, at a steeper fatigue
    // rate — a real, lesser level of protection, not a free unlimited one.
    ongoingEffect: (ctx, incident) => {
      const { state, log } = ctx;
      if (state.hour - incident.triggeredAtHour >= incidentConstants.mirFireSmokeRecoveryHours.value) return;
      const consumables = state.safetyConsumables;
      const hasCartridge = consumables.respiratorCartridges > 0;
      if (hasCartridge) consumables.respiratorCartridges -= 1;
      if (!hasCartridge) {
        log.logEdge({
          kind: "fault",
          severity: "warning",
          code: "incident.fire-mir97.respiratorsExhausted",
          data: {},
        });
      }
      const fatiguePerHour = hasCartridge
        ? incidentConstants.mirFireSmokeFatiguePerHour.value
        : incidentConstants.mirFireSmokeFatiguePerHourNoCartridge.value;
      for (const member of state.crew) {
        if (!member.alive) continue;
        member.fatigueFraction = clamp(member.fatigueFraction + fatiguePerHour * ctx.dtHours, 0, 1);
      }
    },
    responses: [
      {
        id: "fight",
        i18nKey: "incident.fire-mir97.response.fight",
        crewHoursCost: 4,
        leavesOngoing: true,
        effect: (ctx) => {
          const target = mostInjured(ctx.state);
          if (target !== undefined) target.injuryFraction = clamp(target.injuryFraction - 0.25, 0, 1);
          // M7.6 Part D.9 revision: draws from the dedicated safety-consumables store, not
          // powerDistribution's own repair spares (the wrong pool for firefighting gear).
          const consumables = ctx.state.safetyConsumables;
          const needed = incidentConstants.mirFireExtinguishersConsumedFighting.value;
          const shortfall = consumables.fireExtinguishers < needed;
          consumables.fireExtinguishers = Math.max(0, consumables.fireExtinguishers - needed);
          if (shortfall && target !== undefined) {
            target.injuryFraction = clamp(
              target.injuryFraction + incidentConstants.mirFireExtinguisherShortfallInjuryPenalty.value,
              0,
              1,
            );
            ctx.log.log({
              kind: "fault",
              severity: "warning",
              code: "incident.fire-mir97.extinguishersExhausted",
              data: {},
            });
          }
        },
      },
      {
        id: "evacuate",
        i18nKey: "incident.fire-mir97.response.evacuate",
        crewHoursCost: 2,
        leavesOngoing: true,
        effect: () => {}, // contains it without treating further; the initial injury stands
      },
      {
        id: "ignore",
        i18nKey: "incident.fire-mir97.response.ignore",
        leavesOngoing: true,
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
        // Not flagged permanentPenalty, despite genuinely being one (a permanent array-area
        // cut, unlike improviseAdapter's own flagged cost below): M7.8 Part C found
        // prudentBot's mission-duration-aware avoidance of that flag (bots.ts) was the wrong
        // lens for THIS specific cost. A recurring efficiency tax (improviseAdapter) compounds
        // with however much mission is left, which is exactly what that avoidance models. A
        // one-time capacity cut does not compound the same way — whether it actually hurts
        // depends on whether the scenario's total generation margin (a reactor's own spare
        // capacity, say) ever needs the lost capacity, not on how many hours remain. Measured:
        // flagging it made prudentBot avoid sealModule even on The Long Night, whose 40 kWe
        // reactor absorbs the loss without issue, pushing it toward patchHull there for no
        // real benefit and costing it the M7.6 Part C.6 strict ordering against worstChoiceBot
        // (which, unburdened by that avoidance, correctly still takes the cheap, reliable fix).
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
        sparesFromSystem: "thermalControl",
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
        sparesFromSystem: "co2Scrubber",
        permanentPenalty: true,
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
        // M7.7 §7: fixes docs/DECISION_AUDIT.md's one confirmed cosmetic decision — this used
        // to write the same nothing as "noResponse" below. Now a real, lasting trade-off:
        // less CO2/heat from the crew, less crew-hours available for everything else.
        id: "rationActivity",
        i18nKey: "incident.o2tank-apollo13.response.rationActivity",
        crewHoursCost: 1,
        leavesOngoing: true,
        effect: (ctx) => {
          ctx.state.crewActivityFraction = clamp(
            ctx.state.crewActivityFraction - incidentConstants.rationActivityMetabolicReductionFraction.value,
            0.4,
            1,
          );
          ctx.state.crewHours.spentTodayHours += incidentConstants.rationActivityCrewHoursPenaltyHours.value;
        },
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
    sourceId: "AGU-KNIPP-2018",
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
      // M7.6 Part D.10: "electronics take a degradation roll" — real particle flux hits
      // hardware regardless of where the crew sheltered, so this is independent of the
      // response chosen. comms is this sim's own established stand-in for sensitive
      // spacecraft electronics (coolant-ms22's equipment-strain check uses the same proxy).
      if (ctx.rng.stream("incidents").chance(incidentConstants.spe1972ElectronicsDegradationChance.value)) {
        const comms = state.systems.comms;
        if (comms !== undefined) {
          comms.efficiencyPenaltyFraction =
            1 - (1 - comms.efficiencyPenaltyFraction) * (1 - incidentConstants.spe1972ElectronicsDegradationFraction.value);
          log.log({
            kind: "fault",
            severity: "warning",
            code: "incident.spe-1972.electronicsDegraded",
            system: "comms",
            data: { fraction: incidentConstants.spe1972ElectronicsDegradationFraction.value },
          });
        }
      }
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
    sourceId: "JPL-DUSTSTORM2018-TAU",
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
      // M7.6 Part D.11: "dust accumulation on arrays is PERMANENT and cumulative" —
      // LORENZ-2020-INSIGHT-DUST. A property of the storm itself, not of how the crew
      // responds to it: even a well-cleaned array can never be brought below this
      // ever-rising floor again.
      const env = ctx.state.environment;
      env.dustObscurationFloorFraction = clamp(
        env.dustObscurationFloorFraction + incidentConstants.duststorm2018DustFloorIncreaseFraction.value,
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
          e.dustObscurationFraction = clamp(e.dustObscurationFraction - 0.15, e.dustObscurationFloorFraction, 0.95);
          // "Cleaning EVAs cost crew-hours (already declared above) and dose" — reuses the
          // same GCR physics/shielding radiationStage itself uses (models/radiation.ts), not
          // an invented EVA dose rate, for the duration this response's own crewHoursCost
          // implies.
          applyCleaningEvaDose(ctx, 3);
          applyDeepDischargeBatteryDegradation(ctx);
        },
      },
      {
        id: "shedNonEssential",
        i18nKey: "incident.duststorm-2018.response.shedNonEssential",
        crewHoursCost: 1,
        effect: (ctx) => {
          const e = ctx.state.environment;
          e.dustObscurationFraction = clamp(e.dustObscurationFraction - 0.05, e.dustObscurationFloorFraction, 0.95);
          applyDeepDischargeBatteryDegradation(ctx);
        },
      },
      {
        id: "noResponse",
        i18nKey: "incident.duststorm-2018.response.noResponse",
        effect: (ctx) => {
          applyDeepDischargeBatteryDegradation(ctx);
        },
      },
    ],
    defaultResponseId: "noResponse",
    briefKey: "incident.duststorm-2018.brief",
  },

  {
    id: "scrubber-iss",
    analogue: "ISS CO2 scrubber (CDRA) recurring failures",
    sourceId: "ICES-2019-CDRA",
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
        sparesFromSystem: "co2Scrubber",
        crewHoursCost: 2,
        effect: (ctx) => {
          const system = ctx.state.systems.co2Scrubber;
          if (system !== undefined) {
            system.operational = true;
            // M7.6 Part D.12: "a repaired bed runs at reduced capacity for the rest of the
            // mission" — ICES-2019-CDRA documents real, repeated sorbent-bed degradation
            // after many operating cycles. Stacks multiplicatively across repeated
            // swapCartridge successes on this same recurring-failure incident, same pattern
            // as the shortfall-driven improvised-repair penalty elsewhere — this one applies
            // every time, not only on a spares shortfall.
            system.efficiencyPenaltyFraction =
              1 - (1 - system.efficiencyPenaltyFraction) * (1 - incidentConstants.scrubberIssRepeatDegradationFraction.value);
          }
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
 *  physics-adjacent field a difficulty preset is allowed to touch (plan §6). Exported so a
 *  Decision Card (M8.2) can render a real countdown from the exact same figure the engine's
 *  own default-response fallback uses, rather than a second, invented one. */
export function scaledWarningTimeHours(ctx: TickContext, def: IncidentDefinition): number {
  return def.warningTimeHours * missionDifficulty[ctx.params.difficulty].warningTimeMultiplier.value;
}

/** M7.7 §1/§2: whether `def.ongoingEffect` should still run for `incident` this hour — keyed
 *  off `resolvedAtHour`, not `chosenResponseId`: a response can be *chosen* (queued, still
 *  being worked, or a failed attempt) without the incident actually being resolved yet, and
 *  the physical process doesn't care whether anyone's decided anything, only whether it's
 *  actually been fixed. Once genuinely resolved, `leavesOngoing` still governs whether the
 *  chosen response addressed the root cause at all. Exported so
 *  `validation/counterfactual.test.ts` (M7.6 Part C.5) can replay the exact same rule when
 *  proving two response choices diverge, instead of a second, drift-prone copy of it. */
export function shouldRunOngoingEffect(def: IncidentDefinition, incident: ActiveIncident): boolean {
  if (def.ongoingEffect === undefined) return false;
  if (incident.resolvedAtHour === undefined) return true;
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

/** Nobody decided — felt identically whether that's an idle bot or a player who never opened
 *  the Decision Card. Unconditional, no crew-hours/spares cost, no success roll: there was no
 *  attempt to charge for or that could fail. `incidentsStage` is the only caller. */
function applyDefaultResponse(ctx: TickContext, def: IncidentDefinition, incident: ActiveIncident): void {
  const response = responseById(def, def.defaultResponseId);
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

/**
 * M7.7 §2: the actual attempt — spares (if the response declares `sparesCost`, drawn from
 * `sparesFromSystem`; a shortfall doesn't block the attempt, it worsens the odds and, on a
 * success anyway, leaves a permanent `efficiencyPenaltyFraction` on that system — the
 * improvisation cost docs/INCIDENT_MAGNITUDES.md's pattern calls for) and a real success roll
 * from `stationPerformance`. On failure, spares/crew-hours already spent stay spent, the
 * effect does not apply, and `chosenResponseId` is cleared so the incident is eligible for
 * another attempt — or, past the warning window, the default. Exported so
 * `engine/crewHours.ts` can call it the moment a queued response's hours finish paying down;
 * `applyResponse` below calls it directly when a response's cost fits the same hour.
 */
export function resolveResponseAttempt(
  ctx: TickContext,
  def: IncidentDefinition,
  incident: ActiveIncident,
  responseId: string,
): void {
  const response = responseById(def, responseId);
  const { state, log } = ctx;

  const performance = stationPerformance(ctx, def.station, crewCondition);

  let sparesShortfall = false;
  if (response.sparesCost !== undefined && response.sparesCost > 0 && response.sparesFromSystem !== undefined) {
    const system = state.systems[response.sparesFromSystem];
    const available = system?.spares ?? 0;
    sparesShortfall = available < response.sparesCost;
    if (system !== undefined) {
      system.spares = Math.max(0, available - Math.min(response.sparesCost, available));
    }
  }

  const successChance = clamp(
    sparesShortfall ? performance * management.improvisedRepairPenaltyFraction.value : performance,
    0,
    1,
  );
  const succeeded = ctx.rng.stream("responses").chance(successChance);

  if (succeeded) {
    incident.chosenResponseId = response.id;
    incident.resolvedAtHour = state.hour;
    log.because(incident.cause, () => {
      response.effect(ctx, incident);
      if (sparesShortfall && response.sparesFromSystem !== undefined) {
        const system = state.systems[response.sparesFromSystem];
        if (system !== undefined) {
          system.efficiencyPenaltyFraction =
            1 - (1 - system.efficiencyPenaltyFraction) * (1 - management.improvisedRepairEfficiencyPenaltyFraction.value);
        }
      }
      log.log({
        kind: "decision",
        severity: "info",
        code: `incident.${def.id}.resolved`,
        data: { response: response.id, improvised: sparesShortfall ? 1 : 0 },
      });
    });
  } else {
    delete incident.chosenResponseId;
    log.because(incident.cause, () => {
      log.log({
        kind: "decision",
        severity: "warning",
        code: `incident.${def.id}.responseFailed`,
        data: { response: response.id },
      });
    });
  }
}

/**
 * M7.7 §1: the entry point a `DecisionStrategy` (engine/bots.ts today, a real player's
 * Decision Card in M8) calls once to act on an incident. A response's *effective* cost is
 * its declared `crewHoursCost` divided by the owning station's current performance. If that
 * fits what's left of today's crew-hours budget, resolution happens now
 * (`resolveResponseAttempt`); otherwise the remainder is queued (`engine/crewHours.ts` pays
 * it down FIFO from each later day's budget) — "work slips to the next sol," made real.
 *
 * A station with performance exactly 0 (nobody covers it — either the primary and backup are
 * both dead, or, First Light's 2-crew roster, that station was never staffed to begin with,
 * engine/stations.ts) cannot even *start* a response that costs real crew time, let alone
 * finish it. An earlier version queued it anyway with a capped-near-infinite `hoursRemaining`
 * — found empirically to be worse than doing nothing: setting `chosenResponseId` immediately
 * permanently blocked `incidentsStage`'s own "nobody decided" default-response fallback,
 * while the queued item could never actually pay down (its own crew-hours budget is 0 on an
 * unstaffed station), so the incident's ongoing effect ran unanswered for the rest of the
 * mission. Rejecting the attempt outright and leaving `chosenResponseId` unset instead lets
 * that same fallback fire once the (detection-anchored) warning window lapses — the honest
 * consequence of genuinely having nobody to send, not a silent permanent trap.
 */
/** M7.8 Part B: whether `responseId` would resolve THIS hour if chosen now — fits the day's
 *  remaining crew-hours budget through `def.station`'s current performance — rather than
 *  being queued into tomorrow's payoff (`engine/crewHours.ts`) or rejected outright as
 *  impossible. Exported so `bots.ts`'s `prudentBot` can prefer an option that will actually
 *  be *done* this hour over a costlier one that would sit unresolved while a fast-killing
 *  incident's own ongoing effect keeps running — the same "will this be UNAVAILABLE or
 *  displace other work" fact M7.7 §1 says a real Decision Card must surface to a player, not
 *  a hidden engine internal. Pure: reads state, changes nothing. */
export function wouldResolveThisHour(ctx: TickContext, def: IncidentDefinition, responseId: string): boolean {
  const response = responseById(def, responseId);
  const { state } = ctx;
  const performance = stationPerformance(ctx, def.station, crewCondition);
  const declaredHours = response.crewHoursCost ?? 0;
  if (performance === 0 && declaredHours > 0) return false;
  const effectiveHours = performance > 0 ? declaredHours / performance : 0;
  const remainingToday = Math.max(0, state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours);
  return effectiveHours <= remainingToday;
}

export function applyResponse(
  ctx: TickContext,
  def: IncidentDefinition,
  incident: ActiveIncident,
  responseId: string,
): void {
  const response = responseById(def, responseId);
  const { state } = ctx;

  const performance = stationPerformance(ctx, def.station, crewCondition);
  const declaredHours = response.crewHoursCost ?? 0;

  if (performance === 0 && declaredHours > 0) {
    ctx.log.because(incident.cause, () => {
      ctx.log.log({
        kind: "decision",
        severity: "warning",
        code: `incident.${def.id}.responseImpossible`,
        data: { response: response.id },
      });
    });
    return;
  }

  const effectiveHours = performance > 0 ? declaredHours / performance : 0;

  const remainingToday = Math.max(0, state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours);

  if (effectiveHours <= remainingToday) {
    state.crewHours.spentTodayHours += effectiveHours;
    resolveResponseAttempt(ctx, def, incident, responseId);
    return;
  }

  const paidNow = remainingToday;
  state.crewHours.spentTodayHours += paidNow;
  incident.chosenResponseId = response.id;

  const queued: QueuedWork = {
    id: `${incident.id}-${response.id}-${state.hour}`,
    incidentId: incident.id,
    definitionId: def.id,
    responseId: response.id,
    totalHours: effectiveHours,
    hoursRemaining: effectiveHours - paidNow,
    queuedAtHour: state.hour,
  };
  state.crewHours.queue.push(queued);

  ctx.log.because(incident.cause, () => {
    ctx.log.log({
      kind: "decision",
      severity: "info",
      code: `incident.${def.id}.queued`,
      data: { response: response.id, hoursRemaining: round(queued.hoursRemaining) },
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

  // M7.7 §2: detection delay — the incident's own physics run either way (below); only
  // whether the crew has *noticed* it, and can therefore respond at all, waits on this roll.
  // A staffed station detects faster, but even an unstaffed one (performance 0 — Incident
  // Command and Mission Command own no hardware and can go unstaffed by design on a small
  // crew, engine/stations.ts) still has automaticDetectionFloorChancePerHour: a real
  // caution-and-warning system notices a fire or a leak on its own.
  for (const incident of state.activeIncidents) {
    if (incident.detectedAtHour !== undefined) continue;
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined) continue;
    const performance = stationPerformance(ctx, def.station, crewCondition);
    const stationDetectChance =
      performance > 0 ? 1 / Math.max(1, management.incidentDetectionBaseDelayHours.value / performance) : 0;
    const detectChance = Math.max(stationDetectChance, management.automaticDetectionFloorChancePerHour.value);
    if (ctx.rng.stream("incidents").chance(detectChance)) {
      incident.detectedAtHour = state.hour;
      log.because(incident.cause, () => {
        log.log({ kind: "decision", severity: "info", code: `incident.${def.id}.detected`, data: {} });
      });
    }
  }

  // M7.5/§2: the physical process an incident models keeps evolving hour after hour for as
  // long as it hasn't actually been fixed — see `shouldRunOngoingEffect` above. Runs for
  // brand-new incidents too (the trigger hour gets its first hour of exposure, same as
  // physicsEffect always has), detected or not.
  for (const incident of state.activeIncidents) {
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined || !shouldRunOngoingEffect(def, incident)) continue;
    log.because(incident.cause, () => def.ongoingEffect?.(ctx, incident));
  }

  // The "nobody decided" consequence, once detected and the warning window (counted from
  // detection, not trigger) has lapsed with no decision in flight — a queued or already
  // -resolved response is left alone, only a genuinely undecided incident gets the default.
  for (const incident of state.activeIncidents) {
    if (incident.detectedAtHour === undefined) continue;
    if (incident.chosenResponseId !== undefined) continue;
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined) continue;
    if (state.hour - incident.detectedAtHour < scaledWarningTimeHours(ctx, def)) continue;

    applyDefaultResponse(ctx, def, incident);
  }
}
