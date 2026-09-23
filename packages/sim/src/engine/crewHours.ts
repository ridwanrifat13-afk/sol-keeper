/**
 * M7.7 §1: the real, pooled, per-day crew-hours budget and its deferred-work queue —
 * replacing `crewHoursCost` fields that docs/DECISION_AUDIT.md found declared everywhere and
 * enforced nowhere. One pool across the living crew (health/morale-scaled, the same pattern
 * `models/crew.ts`'s own — until now dead — `availableCrewHours()` already used, finally
 * wired in as the brief's single source of truth), reset every 24 Earth-hours (BVAD-2022's
 * crewtime figures are stated per Earth-CM-day, not per sol — the same reasoning
 * `units.ts`'s `perDayToPerHour` already uses everywhere else).
 */
import { availableCrewHours } from "../models/crew.js";
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

export function crewHoursStage(ctx: TickContext): void {
  const { state } = ctx;

  // Day 0's budget is already set by engine/state.ts's createInitialState; only reset on
  // later boundaries so hour 0 isn't double-applied.
  if (state.hour > 0 && state.hour % 24 === 0) {
    state.crewHours.budgetTodayHours = availableCrewHours(ctx);
    state.crewHours.spentTodayHours = 0;
  }

  payDownQueue(ctx);
}
