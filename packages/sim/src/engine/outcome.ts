/**
 * The outcome state machine (Phase 2 brief). Replaces Phase 1's two-branch `"won"|"lost"`
 * check with four real outcomes — success, partial, abort, loss — each with its own cause.
 *
 * `determineOutcome` runs every tick (engine/tick.ts's `endConditions` stage) and handles
 * the automatic exits only. `requestAbort` is a separate, explicit action a player or bot
 * calls — abort is something *chosen*, never something the tick loop decides on its own.
 */
import {
  abort as abortConstants,
  crew as crewConstants,
  environment,
  physiology,
  radiation as radConstants,
} from "../data/constants.js";
import { rationKgPerCrewDay } from "../models/food.js";
import type { CrewMember } from "../types.js";
import { daysToHours, perDayToPerHour } from "../units.js";
import type { TickContext } from "./context.js";
import { checkGoal } from "./goals.js";

/** M7.7 §4: computed once whenever a run actually ends, whatever the outcome — "wired into
 *  scoring" without inventing a fifth `RunStatus`. Worth knowing even on a LOSS or ABORT
 *  (did they get the crops in before it went wrong?), not just on SUCCESS. */
function finalizeStretchGoal(ctx: TickContext): void {
  ctx.state.stretchGoalMet = checkGoal(ctx.scenario.stretchGoal, ctx.state, ctx.scenario);
}

export function determineOutcome(ctx: TickContext): void {
  const { state, scenario, log } = ctx;
  if (state.status !== "running") return;

  const living = state.crew.filter((c) => c.alive);

  if (living.length === 0) {
    state.status = "loss";
    state.endReasonCode = "end.crewLost";
    log.log({
      kind: "milestone",
      severity: "critical",
      code: "end.crewLost",
      data: { hour: state.hour },
    });
    finalizeStretchGoal(ctx);
    return;
  }

  // Cumulative dose beyond the career limit is a mission failure, not a death (brief) — it
  // ends the run the moment it's crossed, not just at natural duration end, because the
  // damage is already done and every further hour only adds to it.
  const overExposed: CrewMember | undefined = state.crew.find(
    (c) => c.alive && c.cumulativeDoseMSv >= radConstants.careerLimitMSv.value,
  );
  if (overExposed !== undefined) {
    state.status = "partial";
    state.endReasonCode = "end.doseLimitExceeded";
    log.log({
      kind: "milestone",
      severity: "critical",
      code: "end.doseLimitExceeded",
      data: {
        hour: state.hour,
        crew: overExposed.name,
        doseMSv: Math.round(overExposed.cumulativeDoseMSv),
        limitMSv: radConstants.careerLimitMSv.value,
      },
    });
    finalizeStretchGoal(ctx);
    return;
  }

  if (state.hour >= scenario.durationHours) {
    const goalMet = checkGoal(scenario.primaryGoal, state, scenario);
    state.status = goalMet ? "success" : "partial";
    state.endReasonCode = goalMet ? "end.missionComplete" : "end.goalMissed";
    log.log({
      kind: "milestone",
      severity: goalMet ? "info" : "warning",
      code: state.endReasonCode,
      // Duration is deliberately not restated in sols or days here (a presentation concern,
      // brief rule 4) — kept from Phase 1's identical comment on this exact point.
      data: { hour: state.hour, crewSurviving: living.length },
    });
    finalizeStretchGoal(ctx);
  }
}

/**
 * M7.7 §6: the abort signal every bot's `planHour` can check — a pure read, never itself
 * ends the run (only `requestAbort` does that, an explicit action, same as before). Any one
 * of: dose approaching the career limit, a crew member critical for a sustained stretch with
 * no incident actively addressing it ("no repair path"), or a consumable projected to run
 * out before the mission's own duration at the current rate.
 */
export function shouldConsiderAbort(ctx: TickContext): { readonly reasonCode: string } | undefined {
  const { state, scenario } = ctx;

  const doseThresholdMSv = radConstants.careerLimitMSv.value * abortConstants.doseFractionOfCareerLimit.value;
  if (state.crew.some((c) => c.alive && c.cumulativeDoseMSv >= doseThresholdMSv)) {
    return { reasonCode: "abort.signal.doseApproachingLimit" };
  }

  // "No repair path": critical for a sustained stretch (models/crew.ts's crewStage stamps
  // criticalSinceHour the moment crewCondition() first reads "critical", clears it the
  // moment it improves) while nothing is actively being worked to address it.
  const anyIncidentInFlight = state.activeIncidents.some((i) => i.resolvedAtHour === undefined);
  const sustainedCritical = state.crew.some(
    (c) =>
      c.alive &&
      c.criticalSinceHour !== undefined &&
      state.hour - c.criticalSinceHour >= abortConstants.crewCriticalSustainedHours.value,
  );
  if (!anyIncidentInFlight && sustainedCritical) {
    return { reasonCode: "abort.signal.crewCriticalNoRepairPath" };
  }

  // A consumable projected to run dry before the mission's own scheduled duration, at its
  // current draw rate — "consumables below the margin needed to reach the end of the plan".
  // Water and food each have a real per-crew-day rate already used elsewhere (models/water.ts,
  // food.ts); O2 is covered indirectly (a genuine O2 shortfall shows up as hypoxia, which the
  // sustained-critical check above already catches) so it is not double-counted here.
  const living = state.crew.filter((c) => c.alive).length;
  const hoursRemaining = scenario.durationHours - state.hour;
  if (living > 0 && hoursRemaining > 0) {
    const waterKgPerHour = living * perDayToPerHour(crewConstants.waterUseTotalKgPerCrewDay.value);
    const waterHoursLeft = waterKgPerHour > 0 ? state.water.potableKg / waterKgPerHour : Infinity;

    const foodKgPerHour = living * perDayToPerHour(rationKgPerCrewDay(state.food.mode));
    const foodHoursLeft = foodKgPerHour > 0 ? state.food.storedDryMassKg / foodKgPerHour : Infinity;

    if (waterHoursLeft < hoursRemaining || foodHoursLeft < hoursRemaining) {
      return { reasonCode: "abort.signal.consumablesShortOfDuration" };
    }
  }

  return undefined;
}

export interface AbortResult {
  readonly allowed: boolean;
  readonly reasonCode: string;
}

/**
 * Moon: allowed at any time, costs the sourced ~6-day return transit (NASA-ORION-FS) added
 * to elapsed hours before the run ends. Mars: gated to the synodic departure window; an
 * attempt outside it is rejected with a stated reason, not silently disabled — that
 * rejection is "make the player feel why" (brief).
 */
export function requestAbort(ctx: TickContext): AbortResult {
  const { state, scenario, log } = ctx;
  if (state.status !== "running") {
    return { allowed: false, reasonCode: "abort.rejected.alreadyEnded" };
  }

  if (scenario.body === "moon") {
    const transitHours = daysToHours(physiology.lunarReturnTransitNominalDays.value);
    state.hour += transitHours;
    state.status = "abort";
    state.endReasonCode = "end.abort";
    log.log({
      kind: "milestone",
      severity: "warning",
      code: "end.abort",
      data: { hour: state.hour, transitHours: Math.round(transitHours) },
    });
    return { allowed: true, reasonCode: "end.abort" };
  }

  if (!inMarsDepartureWindow(ctx)) {
    log.log({
      kind: "decision",
      severity: "warning",
      code: "abort.rejected.window",
      data: {
        hour: state.hour,
        conjunctionPeriodDays: environment.marsConjunctionPeriodDays.value,
        windowDays: environment.marsDepartureWindowDays.value,
      },
    });
    return { allowed: false, reasonCode: "abort.rejected.window" };
  }

  state.status = "abort";
  state.endReasonCode = "end.abort";
  log.log({ kind: "milestone", severity: "warning", code: "end.abort", data: { hour: state.hour } });
  return { allowed: true, reasonCode: "end.abort" };
}

/** True during the low-delta-v window at the start of each synodic cycle. */
export function inMarsDepartureWindow(ctx: TickContext): boolean {
  const periodHours = daysToHours(environment.marsConjunctionPeriodDays.value);
  const windowHours = daysToHours(environment.marsDepartureWindowDays.value);
  return ctx.state.hour % periodHours < windowHours;
}
