/**
 * The outcome state machine (Phase 2 brief). Replaces Phase 1's two-branch `"won"|"lost"`
 * check with four real outcomes — success, partial, abort, loss — each with its own cause.
 *
 * `determineOutcome` runs every tick (engine/tick.ts's `endConditions` stage) and handles
 * the automatic exits only. `requestAbort` is a separate, explicit action a player or bot
 * calls — abort is something *chosen*, never something the tick loop decides on its own.
 */
import { environment, physiology, radiation as radConstants } from "../data/constants.js";
import type { CrewMember } from "../types.js";
import { daysToHours } from "../units.js";
import type { TickContext } from "./context.js";
import { checkGoal } from "./goals.js";

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
    return;
  }

  if (state.hour >= scenario.durationHours) {
    const goalMet = checkGoal(scenario.primaryGoal, state);
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
  }
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
