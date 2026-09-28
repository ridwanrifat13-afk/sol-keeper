/**
 * M7.7 §1: the real, pooled, per-day crew-hours budget and its deferred-work queue —
 * replacing `crewHoursCost` fields that docs/DECISION_AUDIT.md found declared everywhere and
 * enforced nowhere. One pool across the living crew (health/morale-scaled, the same pattern
 * `models/crew.ts`'s own — until now dead — `availableCrewHours()` already used, finally
 * wired in as the brief's single source of truth), reset every 24 Earth-hours (BVAD-2022's
 * crewtime figures are stated per Earth-CM-day, not per sol — the same reasoning
 * `units.ts`'s `perDayToPerHour` already uses everywhere else).
 */
import { crew as crewConstants, lifeSupport } from "../data/constants.js";
import { availableCrewHours } from "../models/crew.js";
import { clamp } from "../units.js";
import type { TickContext } from "./context.js";
import { INCIDENT_CATALOG, resolveResponseAttempt } from "./incidents.js";

const round = (x: number): number => Math.round(x * 100) / 100;

/** Pays down the queue FIFO from whatever's left of today's budget, applying (via
 *  `resolveResponseAttempt`, so a queued item goes through the same spares/success-roll
 *  logic a same-hour response would) any item that finishes. */
function payDownQueue(ctx: TickContext): void {
  const { state } = ctx;

  for (const item of state.crewHours.queue) {
    if (item.hoursRemaining <= 0) continue;
    const remaining = state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours;
    if (remaining <= 0) break;
    const pay = Math.min(remaining, item.hoursRemaining);
    item.hoursRemaining = round(item.hoursRemaining - pay);
    state.crewHours.spentTodayHours = round(state.crewHours.spentTodayHours + pay);
  }

  const completed = state.crewHours.queue.filter((item) => item.hoursRemaining <= 0);
  if (completed.length === 0) return;

  state.crewHours.queue = state.crewHours.queue.filter((item) => item.hoursRemaining > 0);
  for (const item of completed) {
    const incident = state.activeIncidents.find((i) => i.id === item.incidentId);
    const def = INCIDENT_CATALOG.find((d) => d.id === item.definitionId);
    if (incident === undefined || def === undefined) continue;
    resolveResponseAttempt(ctx, def, incident, item.responseId);
  }
}

/** M9.x (player request, batch 2): applies real fatigue for the day just ending, before its
 *  own budget/spent figures are overwritten by the next day's reset. Reads
 *  crew.overtimeFatiguePerHourAboveCeiling (BVAD-2022, already sourced and declared, never
 *  read by any model until now) against however many hours were actually spent past that
 *  day's own un-boosted ceiling — authorizing overtime that goes unused costs nothing; only
 *  hours actually worked above the ordinary budget do. */
function applyOvertimeFatigue(ctx: TickContext): void {
  const { state } = ctx;
  if (!state.crewHours.overtimeAuthorized) return;

  const excessHours = Math.max(
    0,
    state.crewHours.spentTodayHours - state.crewHours.unboostedBudgetTodayHours,
  );
  if (excessHours <= 0) return;

  const fatigueGain = crewConstants.overtimeFatiguePerHourAboveCeiling.value * excessHours;
  for (const member of state.crew) {
    if (!member.alive) continue;
    member.fatigueFraction = clamp(member.fatigueFraction + fatigueGain, 0, 1);
  }
}

export function crewHoursStage(ctx: TickContext): void {
  const { state } = ctx;

  // Day 0's budget is already set by engine/state.ts's createInitialState; only reset on
  // later boundaries so hour 0 isn't double-applied.
  if (state.hour > 0 && state.hour % 24 === 0) {
    applyOvertimeFatigue(ctx);
    const baseline = availableCrewHours(ctx);
    state.crewHours.unboostedBudgetTodayHours = baseline;
    state.crewHours.budgetTodayHours = state.crewHours.overtimeAuthorized
      ? baseline * crewConstants.overtimeCeilingFractionOfAverage.value
      : baseline;
    // M9.x (batch 2): running the Brine Processor Assembly (WaterReclamationMode) is a
    // recurring daily commitment, pre-spent the moment the new day's budget exists — the
    // same "felt against the pool, not a separate ledger" treatment the queue payout below
    // already gets.
    state.crewHours.spentTodayHours =
      state.water.reclamationMode === "brineProcessor"
        ? Math.min(state.crewHours.budgetTodayHours, lifeSupport.brineProcessorCrewHoursPerDay.value)
        : 0;
  }

  payDownQueue(ctx);
}
