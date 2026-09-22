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
 * mutable state — rationing (`food.mode`), pre-emptive shelter (`crew.location`), and
 * incident response choice — is enough to produce three genuinely different outcomes, which
 * is what this file demonstrates.
 */
import { food as foodConstants } from "../data/constants.js";
import { rationKgPerCrewDay } from "../models/food.js";
import type { ActiveIncident, SurvivalMode } from "../types.js";
import type { TickContext } from "./context.js";
import type { IncidentDefinition, IncidentResponse } from "./incidents.js";

export type BotId = "idle" | "greedy" | "prudent";

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

/** How many hours ahead of a scripted solar particle event the prudent bot moves the crew
 *  into the storm shelter — long enough to matter, short enough that it is clearly a
 *  deliberate anticipation rather than "crew just happens to live in the shelter". */
const SPE_SHELTER_LEAD_HOURS = 6;

/** Rations down proactively when the food margin is thin, shelters the crew ahead of a
 *  scripted solar particle event using its own lead time, and — when an incident forces a
 *  decision — always picks the most thorough (highest-cost, non-default) response: this
 *  catalog's own design makes the priciest response the most effective one, so "spend the
 *  resources" is a real, meaningful choice this bot makes differently from greedy's
 *  short-termism, not a shortcut to a target win rate. */
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

    const upcomingSpe = ctx.scenario.scripted.find(
      (e) =>
        e.hazard === "solarParticleEvent" &&
        e.atHour - state.hour > 0 &&
        e.atHour - state.hour <= SPE_SHELTER_LEAD_HOURS,
    );
    if (upcomingSpe !== undefined) {
      for (const member of state.crew) {
        if (member.alive) member.location = "stormShelter";
      }
    }
  },
  chooseIncidentResponse: (_ctx, _incident, definition) => {
    const eligible = definition.responses.filter((r) => r.id !== definition.defaultResponseId);
    const pool = eligible.length > 0 ? eligible : definition.responses;
    return pool.reduce((best, r) => (totalCost(r) > totalCost(best) ? r : best), pool[0] as IncidentResponse)
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

export const BOTS: readonly Bot[] = [idleBot, greedyBot, prudentBot];

export function getBot(id: BotId): Bot {
  const bot = BOTS.find((b) => b.id === id);
  if (bot === undefined) throw new Error(`Unknown bot "${id}"`);
  return bot;
}
