/**
 * Three headless play strategies (Phase 2 brief plan §5), used by the balance harness
 * (validation/balance.test.ts) and by `runWithBot.ts`'s driver. Each is deliberately small:
 * the brief's own targets (idleBot rarely succeeds, prudentBot usually does, greedyBot sits
 * strictly between them) come from a genuine behavioural gap, not from tuned win-rate
 * shortcuts baked into the bots themselves.
 *
 * Scope, disclosed: `SystemState.priority` and `CrewMember.primaryStation`/`backupStation`
 * are `readonly` (brief rule 2 — `Scenario`/state stay plain, and per-crew station
 * assignment is fixed at mission start, not a tick-by-tick lever). A bot therefore cannot
 * reorder power priority or manually reassign a station the way the plan's prose sketch
 * described; unstaffed-station coverage still happens automatically through the primary
 * -> backup fallback (engine/stations.ts). What a bot *can* actually act on with today's
 * mutable state — rationing (`food.mode`) and incident response choice — is enough to
 * produce three genuinely different outcomes, which is what this file demonstrates.
 *
 * M7.5 §1 fairness audit: every value each bot reads is either a gauge a player already sees
 * (current food stock and ration mode, an incident's declared response menu and its stated
 * crew-hours/spares cost) or state only visible once an incident has actually triggered.
 * The one violation found and removed: prudentBot used to read `scenario.scripted` directly
 * to shelter the crew a fixed number of hours *before* a scripted solar particle event —
 * knowledge of the future schedule no player has. It now only reacts once the event's own
 * incident actually triggers, the same single hour of warning every strategy gets.
 */
import { food as foodConstants, management as managementConstants } from "../data/constants.js";
import { rationKgPerCrewDay } from "../models/food.js";
import type { ActiveIncident, SurvivalMode } from "../types.js";
import type { TickContext } from "./context.js";
import { wouldResolveThisHour, type IncidentDefinition, type IncidentResponse } from "./incidents.js";

export type BotId = "idle" | "greedy" | "prudent" | "worst";

export interface Bot {
  readonly id: BotId;
  /** Proactive decisions made once per tick, before incidents are resolved. Optional: the
   *  idle bot makes none. */
  planHour?(ctx: TickContext): void;
  /** Which response to give an incident that has just triggered (or is still unanswered). */
  chooseIncidentResponse(
    ctx: TickContext,
    incident: ActiveIncident,
    definition: IncidentDefinition,
  ): string;
}

function totalCost(response: IncidentResponse): number {
  return (response.crewHoursCost ?? 0) + (response.sparesCost ?? 0) * 2;
}

/** Days of stored food left at the crew's current ration, `Infinity` with nobody alive. */
function foodDaysRemaining(ctx: TickContext): number {
  const living = ctx.state.crew.filter((c) => c.alive).length;
  if (living === 0) return Infinity;
  return ctx.state.food.storedDryMassKg / (living * rationKgPerCrewDay(ctx.state.food.mode));
}

/** Never intervenes. Always takes whichever response the catalog names as the one nobody
 *  chose — the "no decision" consequence itself is this bot's entire strategy. */
export const idleBot: Bot = {
  id: "idle",
  chooseIncidentResponse: (_ctx, _incident, definition) => definition.defaultResponseId,
};

/** Keeps rations at nominal even on a thin margin (never proactively rations down) and, when
 *  an incident does force a decision, always does *something* — unlike idle, which always
 *  takes the "nobody decided" default — but picks whichever non-default response costs the
 *  least crew time right now, rather than the most thorough one. Short-term thinking, not
 *  the worst option, but not the best one either. (Every incident's default response is
 *  deliberately its own free, do-nothing option — engine/incidents.ts — so "cheapest of all
 *  responses" would silently collapse to "the default every time"; excluding the default
 *  first is what actually makes this bot behave differently from idle.) */
export const greedyBot: Bot = {
  id: "greedy",
  chooseIncidentResponse: (_ctx, _incident, definition) => {
    const eligible = definition.responses.filter((r) => r.id !== definition.defaultResponseId);
    const pool = eligible.length > 0 ? eligible : definition.responses;
    const cheapest = [...pool].sort((a, b) => (a.crewHoursCost ?? 0) - (b.crewHoursCost ?? 0))[0];
    return cheapest?.id ?? definition.defaultResponseId;
  },
};

/**
 * Rations down proactively when the food margin is thin (a gauge any player already sees),
 * and — when an incident forces a decision — always picks the most thorough (highest-cost,
 * non-default) response: this catalog's own design makes the priciest response the most
 * effective one, so "spend the resources" is a real, meaningful choice this bot makes
 * differently from greedy's short-termism, not a shortcut to a target win rate.
 *
 * Does NOT pre-emptively shelter ahead of a solar particle event — see M7.5 §1's fairness
 * audit below. It still shelters the crew the moment one actually starts, via the normal
 * `chooseIncidentResponse` path once spe-1972 triggers (the incident's own 1-hour warning is
 * all any strategy gets), which is exactly what a real, attentive player could do too.
 */
export const prudentBot: Bot = {
  id: "prudent",
  planHour: (ctx) => {
    const { state } = ctx;

    const daysRemaining = foodDaysRemaining(ctx);
    const currentMode = state.food.mode;
    if (daysRemaining < foodConstants.rationDownAtDaysRemaining.value) {
      state.food.mode = nextStricterMode(currentMode);
    } else if (daysRemaining > foodConstants.rationRecoverAtDaysRemaining.value) {
      state.food.mode = nextLooserMode(currentMode);
    }
  },
  chooseIncidentResponse: (ctx, _incident, definition) => {
    const eligible = definition.responses.filter((r) => r.id !== definition.defaultResponseId);
    const pool = eligible.length > 0 ? eligible : definition.responses;
    // M7.7: a response whose declared sparesCost exceeds what's actually on the shelf right
    // now is a known, visible-to-any-player gamble (docs/DECISION_AUDIT.md's improvised-repair
    // pattern — worse success odds and a permanent efficiency penalty even if it works).
    // Prudent avoids picking one when a fully-stocked alternative exists in the same pool,
    // same spirit as always avoiding the free default; it only gambles when every option would.
    const wellStocked = pool.filter((r) => {
      if (r.sparesCost === undefined || r.sparesCost <= 0 || r.sparesFromSystem === undefined) return true;
      return (ctx.state.systems[r.sparesFromSystem]?.spares ?? 0) >= r.sparesCost;
    });
    const stockedPool0 = wellStocked.length > 0 ? wellStocked : pool;
    // M7.8 Part B (docs/M7.8_DIAGNOSIS.md): a response flagged `permanentPenalty` (a
    // never-recovers degradation — o2tank-apollo13's improviseAdapter permanently thins
    // co2Scrubber's efficiency) costs more the longer the mission has left to run it degraded.
    // On a long mission (The Long Night, 2124h) that made it a worse pick than a real but
    // non-permanent alternative (rationActivity); on the two short scenarios (~720-750h) it
    // wasn't. Only steps in with a genuine non-permanent alternative on the table — an
    // incident whose every real option is permanent (depress-mir97: sealModule always is)
    // keeps picking among them exactly as before.
    const remainingHours = ctx.scenario.durationHours - ctx.state.hour;
    const nonPermanent = stockedPool0.filter((r) => r.permanentPenalty !== true);
    const stockedPool =
      remainingHours > managementConstants.longMissionRemainingHours.value && nonPermanent.length > 0
        ? nonPermanent
        : stockedPool0;
    // M7.8 Part A/B (docs/M7.8_DIAGNOSIS.md): "most thorough" is only a good rule among
    // options that actually finish THIS hour. A costlier pick that doesn't fit today's
    // crew-hours budget gets queued into tomorrow's payoff (engine/crewHours.ts) while the
    // incident's own ongoing effect keeps running — fine for a slow repair, fatal for
    // something like depress-mir97's leak, which kills a small crew in single-digit hours.
    // `wouldResolveThisHour` mirrors exactly what `applyResponse` will do with this pick, so
    // this is the same "will this be unavailable or displace other work" fact M7.7 §1 says a
    // real Decision Card must show a player, not a hidden engine internal.
    const completesNow = stockedPool.filter((r) => wouldResolveThisHour(ctx, definition, r.id));
    if (completesNow.length > 0) {
      return completesNow
        .reduce((best, r) => (totalCost(r) > totalCost(best) ? r : best), completesNow[0] as IncidentResponse)
        .id;
    }
    // Nothing fits today's remaining crew-hours budget at all — every option here queues into
    // tomorrow's payoff. "Most thorough" stops being a virtue in that case (a fast-killing
    // incident's ongoing effect doesn't wait for a slow queue either way): prefer whichever
    // declared crewHoursCost is smallest, so the smallest possible remainder is left queued and
    // it finishes soonest, instead of picking the priciest option purely because it's priciest.
    return stockedPool
      .reduce((best, r) => ((r.crewHoursCost ?? 0) < (best.crewHoursCost ?? 0) ? r : best), stockedPool[0] as IncidentResponse)
      .id;
  },
};

/**
 * M7.6 Part C.6: acts on every decision, unlike idleBot — but seeks out the exact three traps
 * M7.8 found and taught prudentBot to avoid (docs/M7.8_DIAGNOSIS.md), using the same visible,
 * fair information prudentBot itself reads to dodge them: prefers a spares-shortfall gamble
 * over a fully-stocked option, prefers a response that will NOT complete this hour (queues
 * into tomorrow's payoff while a fast-killing incident's own effect keeps running) over one
 * that will, and prefers a `permanentPenalty` response over a real non-permanent alternative
 * regardless of how much mission is left. Among whatever that leaves, picks the priciest —
 * still "does something," just always the costliest way to do it worst.
 *
 * An earlier version was simply "always priciest, no filters" (literally prudentBot's own
 * heuristic before M7.8's fixes) and measurably did NOT satisfy `worstChoiceBot < greedyBot`
 * everywhere: on Jezero, blindly attempting depress-mir97's patchHull (an improvised gamble
 * there) sometimes lands its full fix and no permanent power loss, occasionally beating
 * greedy's guaranteed-but-permanent sealModule outright. Deliberately seeking bad odds finds
 * a strategy that is reliably worse, not just usually more expensive.
 */
export const worstChoiceBot: Bot = {
  id: "worst",
  chooseIncidentResponse: (ctx, _incident, definition) => {
    const eligible = definition.responses.filter((r) => r.id !== definition.defaultResponseId);
    const pool = eligible.length > 0 ? eligible : definition.responses;

    const shortfall = pool.filter((r) => {
      if (r.sparesCost === undefined || r.sparesCost <= 0 || r.sparesFromSystem === undefined) return false;
      return (ctx.state.systems[r.sparesFromSystem]?.spares ?? 0) < r.sparesCost;
    });
    const gambledPool = shortfall.length > 0 ? shortfall : pool;

    const queuesLater = gambledPool.filter((r) => !wouldResolveThisHour(ctx, definition, r.id));
    const timedPool = queuesLater.length > 0 ? queuesLater : gambledPool;

    const permanent = timedPool.filter((r) => r.permanentPenalty === true);
    const finalPool = permanent.length > 0 ? permanent : timedPool;

    return finalPool
      .reduce((worst, r) => (totalCost(r) > totalCost(worst) ? r : worst), finalPool[0] as IncidentResponse)
      .id;
  },
};

function nextStricterMode(mode: SurvivalMode): SurvivalMode {
  if (mode === "nominal") return "mode1";
  return "mode2";
}

function nextLooserMode(mode: SurvivalMode): SurvivalMode {
  if (mode === "mode2") return "mode1";
  return "nominal";
}

export const BOTS: readonly Bot[] = [idleBot, worstChoiceBot, greedyBot, prudentBot];

export function getBot(id: BotId): Bot {
  const bot = BOTS.find((b) => b.id === id);
  if (bot === undefined) throw new Error(`Unknown bot "${id}"`);
  return bot;
}
