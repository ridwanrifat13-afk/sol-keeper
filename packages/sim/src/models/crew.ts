/**
 * Stage 10 (Phase 2) — per-crew physiology and the condition ladder.
 *
 * Phase 1 tracked one soft `healthFraction` scalar nudged by small tuned deltas — nothing
 * was a hard deadline, and the mission always succeeded. `docs/INCIDENTS_AND_THRESHOLDS.md`
 * gives real, sourced anchors for four lethal clocks (thirst, hunger, cold, hypoxia); this
 * stage advances each one every hour and reduces them to a single `crewCondition()` per
 * member — nominal/impaired/critical/lost — that Station rules (engine/stations.ts) and the
 * outcome state machine (engine/outcome.ts) both read.
 *
 * `healthFraction` is kept, not removed: the Ripple Web and existing UI read it as a quick
 * 0-1 summary, so it's now *derived* from the condition ladder rather than driving it.
 */
import { crew as crewConstants, physiology, radiation as radConstants, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import type { CrewCondition, CrewMember } from "../types.js";
import { clamp, hoursToDays } from "../units.js";
import { pio2MmHg } from "./atmosphere.js";

/** Metabolic rate multiplier for a raised body temperature (OCHMO TB-047). */
export function feverMetabolicMultiplier(bodyTempC: number): number {
  const excess = Math.max(0, bodyTempC - 37);
  return 1 + excess * crewConstants.feverMetabolicIncreasePerDegC.value;
}

/**
 * M7.7 §1/§3: the real daily crew-hours budget — living crew count x the BVAD-2022 planetary
 * -surface assignable-work figure (physiology... no, `crew.dailyAssignableWorkHoursPerCrew`),
 * scaled down by average health and morale, floored at BVAD's own stated sustainable minimum
 * (never letting a badly degraded crew's budget collapse toward zero). `engine/crewHours.ts`
 * calls this at every day boundary — the one place this number is computed, per
 * docs/DECISION_AUDIT.md's finding that a second, unused copy of "available crew hours"
 * already existed here without ever being wired to anything.
 */
export function availableCrewHours(ctx: TickContext): number {
  const living = ctx.state.crew.filter((c) => c.alive);
  if (living.length === 0) return 0;

  const avgHealth = living.reduce((sum, c) => sum + c.healthFraction, 0) / living.length;
  const avgMorale = living.reduce((sum, c) => sum + c.moraleFraction, 0) / living.length;
  const scale = clamp(0.5 + 0.5 * avgHealth, 0, 1) * clamp(0.5 + 0.5 * avgMorale, 0, 1);

  const raw = living.length * crewConstants.dailyAssignableWorkHoursPerCrew.value * scale;
  const floor = living.length * crewConstants.minSustainedAssignableWorkHoursPerCrew.value;
  return Math.max(floor, raw);
}

/** g(T) in survivalHoursAir(T) = 12h x kAir x g(T) — linear between the floor at freezing
 *  and 1.0 at the immersion anchor's own reference temperature, per docs/INCIDENTS_AND_THRESHOLDS.md
 *  S1.5 ("a cabin at or below freezing converges toward the immersion figure"). */
function hypothermiaAirG(habitatTempC: number): number {
  const refTempC = physiology.hypothermiaImmersionRefTempC.value;
  const floor = physiology.hypothermiaAirGFloorFraction.value;
  if (habitatTempC <= 0) return floor;
  const t = clamp(habitatTempC / refTempC, 0, 1);
  return floor + (1 - floor) * t;
}

/** M7.6 Part D.10: true while any living crew member is sheltering from a radiation event —
 *  spe-1972's own "halts science and EVA, interrupts crop light" residual cost. Read from
 *  models/comms.ts, models/isru.ts and models/food.ts rather than each duplicating the same
 *  crew-location scan. */
export function isSheltering(crew: readonly CrewMember[]): boolean {
  return crew.some((c) => c.alive && c.location === "stormShelter");
}

/** The worst rung across every clock/threshold this member currently has. Pure and total:
 *  callers (Station rules, the outcome state machine, the UI) never need to know which
 *  specific clock is responsible, only how bad it is right now. */
export function crewCondition(member: CrewMember): CrewCondition {
  if (!member.alive) return "lost";

  const stages: CrewCondition[] = [];

  stages.push(fractionStage(member.hydrationClock, physiology.hydrationImpairedFraction.value, physiology.hydrationCriticalFraction.value));
  stages.push(fractionStage(member.starvationClock, physiology.starvationImpairedFraction.value, physiology.starvationCriticalFraction.value));
  stages.push(fractionStage(member.hypothermiaClock, physiology.hypothermiaImpairedFraction.value, physiology.hypothermiaCriticalFraction.value));

  if (member.hypoxiaClock >= 1) stages.push("lost");
  else if (member.pio2MmHg < physiology.pio2CriticalMmHg.value) stages.push("critical");
  else if (member.pio2MmHg < physiology.pio2HypoxiaLowerLimitMmHg.value) stages.push("impaired");
  else stages.push("nominal");

  if (member.eventDoseMSv >= radConstants.arsLethalMSv.value) stages.push("lost");
  else if (member.eventDoseMSv >= radConstants.arsSevereMSv.value) stages.push("critical");
  else if (member.eventDoseMSv >= radConstants.arsOnsetMSv.value) stages.push("impaired");

  // Fatigue is a performance modifier, never independently lethal — capped at impaired.
  if (member.fatigueFraction >= 0.5) stages.push("impaired");

  if (member.injuryFraction >= 0.75) stages.push("critical");
  else if (member.injuryFraction >= 0.3) stages.push("impaired");

  // Heat stress (M7.5, docs/INCIDENT_MAGNITUDES.md #3) — capped at "critical", never "lost":
  // no sourced heat-death timeline exists the way cold has one, so this is scoped honestly
  // to "makes stations perform worse" rather than inventing a lethal threshold.
  if (member.heatStressClock >= 1) stages.push("critical");
  else if (member.heatStressClock > 0) stages.push("impaired");

  return worstOf(stages);
}

const CONDITION_RANK: Record<CrewCondition, number> = { nominal: 0, impaired: 1, critical: 2, lost: 3 };
function worstOf(stages: readonly CrewCondition[]): CrewCondition {
  return stages.reduce((worst, s) => (CONDITION_RANK[s] > CONDITION_RANK[worst] ? s : worst), "nominal" as CrewCondition);
}
function fractionStage(clock: number, impairedAt: number, criticalAt: number): CrewCondition {
  if (clock >= 1) return "lost";
  if (clock >= criticalAt) return "critical";
  if (clock >= impairedAt) return "impaired";
  return "nominal";
}

/** healthFraction is now a *display* summary derived from the condition ladder, not the
 *  other way around — kept for the Ripple Web and any UI that still reads a single 0-1
 *  number, but crewCondition() is the real model. */
function healthFractionFor(member: CrewMember, condition: CrewCondition): number {
  const worstClock = Math.max(member.hydrationClock, member.starvationClock, member.hypothermiaClock, member.hypoxiaClock);
  const base = clamp(1 - worstClock, 0, 1);
  return condition === "lost" ? 0 : base;
}

export function crewStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const mode = survivalModes[state.food.mode];
  const dtDays = hoursToDays(ctx.dtHours);

  const pio2 = pio2MmHg(state.atmosphere.o2PartialPressureMmHg, state.atmosphere.co2PartialPressureMmHg);

  for (const member of state.crew) {
    if (!member.alive) continue;

    member.pio2MmHg = pio2;
    let moraleDelta = -0.0002 * ctx.dtHours; // slow natural drift downwards

    // --- Hydration clock (docs/INCIDENTS_AND_THRESHOLDS.md S1.3) ---
    const fEnv = state.thermal.habitatTempC > 25 ? physiology.thirstFEnvHeatFactor.value : 1.0;
    const fWork = member.location === "eva" ? physiology.thirstFWorkEvaFactor.value : 1.0;
    const survivalHours = clamp(
      physiology.thirstSurvivalIdealHours.value * fEnv * fWork,
      physiology.thirstSurvivalFloorHours.value,
      physiology.thirstSurvivalIdealHours.value,
    );
    const hydrationRate = Math.max(0, 1 - state.water.intakeFraction) / survivalHours;
    member.hydrationClock = clamp(member.hydrationClock + ctx.dtHours * hydrationRate, 0, 1);

    // --- Starvation clock (S1.4): energy-deficit integrator, not a simple clock. ---
    const requiredKcal = mode.kcalPerCrewDay.value;
    const intakeKcal = requiredKcal * state.food.intakeFraction;
    const deficitKcal = Math.max(0, requiredKcal - intakeKcal);
    // Metabolic adaptation after sustained restriction (disclosed simplification: ramped
    // against the clock's own progress rather than a separate elapsed-time tracker, since a
    // severe deficit's clock rises too fast for the literal "two weeks" to matter, and a
    // mild deficit's clock rise IS a reasonable proxy for how long restriction has lasted).
    const adaptation = clamp(member.starvationClock / 0.3, 0, 1) * physiology.starvationAdaptationMaxFraction.value;
    const effectiveDeficitKcal = deficitKcal * (1 - adaptation);
    member.starvationClock = clamp(
      member.starvationClock + (dtDays * effectiveDeficitKcal) / physiology.starvationLethalDeficitKcal.value,
      0,
      1,
    );

    // --- Hypothermia clock (S1.5): cabin-cold path only. The suit/EVA immersion-anchor path
    // applies via a specific incident's effect (engine/incidents.ts), not every EVA hour —
    // a real suit has its own thermal control; this models a *failure* of it, not its
    // absence. Cabin-cool (15-22 degC) is a comfort/morale penalty only, no lethality. ---
    if (state.thermal.habitatTempC < 15) {
      const survivalHoursAir = clamp(
        physiology.hypothermiaImmersion4CHours.value *
          physiology.hypothermiaAirFactorKAir.value *
          hypothermiaAirG(state.thermal.habitatTempC),
        physiology.hypothermiaImmersion4CHours.value,
        480,
      );
      member.hypothermiaClock = clamp(member.hypothermiaClock + ctx.dtHours / survivalHoursAir, 0, 1);
    } else if (state.thermal.habitatTempC < mode.habitatTempC.value - 5) {
      moraleDelta -= 0.001 * ctx.dtHours;
      log.logEdge({
        kind: "crew",
        severity: "warning",
        code: "crew.cold",
        data: { crew: member.name, habitatTempC: round(state.thermal.habitatTempC) },
      });
    }

    // --- Heat-stress clock (M7.5, docs/INCIDENT_MAGNITUDES.md #3): "ADD A WET-BULB CHECK to
    // the thermal model... mirroring the cold path." Recovers once back below the threshold,
    // same as hypoxia does — this is a standing thermal check, not exclusive to any one
    // incident, since a jammed heater or a bad repair can overheat the cabin too.
    if (state.thermal.habitatTempC > physiology.heatStressWetBulbTempC.value) {
      member.heatStressClock = clamp(
        member.heatStressClock + ctx.dtHours / physiology.heatStressCriticalToImpairedHours.value,
        0,
        1,
      );
    } else {
      member.heatStressClock = clamp(
        member.heatStressClock - ctx.dtHours / physiology.heatStressCriticalToImpairedHours.value,
        0,
        1,
      );
    }

    // --- Hypoxia clock (S1.1): time-at-critical-PIO2. Recovers once back above critical. ---
    if (pio2 < physiology.pio2CriticalMmHg.value) {
      member.hypoxiaClock = clamp(member.hypoxiaClock + ctx.dtHours / physiology.hypoxiaCriticalToLostHours.value, 0, 1);
    } else {
      member.hypoxiaClock = clamp(member.hypoxiaClock - ctx.dtHours / physiology.hypoxiaCriticalToLostHours.value, 0, 1);
    }

    // CO2 above the mode's limit still raises body temperature and, past the IDLH figure,
    // is an immediate hazard in its own right (logged; the acute-CO2 failure mode is the
    // fever/heat path already modelled below plus this warning).
    const co2Limit = mode.co2LimitMmHg.value;
    if (state.atmosphere.co2PartialPressureMmHg > co2Limit) {
      const excess = state.atmosphere.co2PartialPressureMmHg - co2Limit;
      member.bodyTempC += 0.002 * excess * ctx.dtHours;
    }
    if (state.atmosphere.co2PartialPressureMmHg >= physiology.co2ImmediatelyDangerousMmHg.value) {
      log.logEdge({
        kind: "crew",
        severity: "critical",
        code: "crew.co2Idlh",
        data: { crew: member.name, co2MmHg: round(state.atmosphere.co2PartialPressureMmHg) },
      });
    }

    // Fatigue: rises while covering a second station (engine/stations.ts), decays at rest.
    // Computed by whoever calls crewStage's caller today has no station context yet in M7's
    // engine-only scope beyond what stations.ts itself derives per-tick from primary/backup
    // assignment — read there rather than duplicated here.

    member.bodyTempC = clamp(member.bodyTempC - 0.01 * ctx.dtHours, 36.5, 42);
    member.moraleFraction = clamp(member.moraleFraction + moraleDelta, 0, 1);

    const condition = crewCondition(member);
    member.healthFraction = healthFractionFor(member, condition);

    // M7.7 §6: stamp when "critical" starts, clear the moment it improves — the sustained
    // -duration signal engine/outcome.ts's shouldConsiderAbort reads for "no repair path".
    if (condition === "critical") {
      member.criticalSinceHour ??= state.hour;
    } else {
      delete member.criticalSinceHour;
    }

    if (condition === "lost" && member.alive) {
      member.alive = false;
      const cause = worstCauseCode(member);
      log.log({
        kind: "crew",
        severity: "critical",
        code: cause,
        data: { crew: member.name, hour: state.hour },
      });
    }
  }
}

/** Which clock actually pushed this member to `lost`, for the Black Box — "someone died" is
 *  not an explanation; "died of thirst at hour 412" is. Exported for
 *  validation/physiology.test.ts, which pins each failure mode to its own cause code rather
 *  than trusting "the run ended somehow" (docs/INCIDENTS_AND_THRESHOLDS.md S5). */
export function worstCauseCode(member: CrewMember): string {
  if (member.eventDoseMSv >= radConstants.arsLethalMSv.value) return "crew.lost.radiation";
  if (member.hypoxiaClock >= 1) return "crew.lost.hypoxia";
  if (member.hydrationClock >= 1) return "crew.lost.thirst";
  if (member.starvationClock >= 1) return "crew.lost.starvation";
  if (member.hypothermiaClock >= 1) return "crew.lost.hypothermia";
  return "crew.lost";
}

const round = (x: number): number => Math.round(x * 100) / 100;
