/**
 * Drives `tick()`'s own pipeline with a `Bot` (engine/bots.ts) attached — the concrete thing
 * "a `DecisionStrategy`'s caller" (engine/incidents.ts's own doc comment) means. Two seams,
 * deliberately kept separate:
 *   - `bot.planHour` runs *before* the hour's pipeline, so a proactive decision (rationing
 *     down, pre-emptive shelter) is in place for the physics that hour, the same as a real
 *     player's morning choices would be.
 *   - `bot.chooseIncidentResponse` runs *after* the pipeline, once incidents that triggered
 *     this hour actually exist to be decided on.
 *
 * This does not call the public `tick()` — it replicates its short body (hour increment,
 * context construction, running `PIPELINE`) instead, because `planHour` and
 * `chooseIncidentResponse` both need the *same* `TickContext` `tick()` builds internally and
 * throws away. `tick()`'s own signature stays exactly as Phase 1 left it; this file is the
 * one place a strategy plugs in, and M8's real player loop reuses the identical seam with a
 * human-driven strategy in place of a bot.
 */
import type { Params, Scenario, SimState } from "../types.js";
import type { Bot } from "./bots.js";
import type { TickContext } from "./context.js";
import { EventLogger } from "./log.js";
import { INCIDENT_CATALOG, applyResponse } from "./incidents.js";
import { PIPELINE } from "./tick.js";
import { Rng } from "./rng.js";

/** One hour, with `bot` making every decision the hour offers. */
export function tickWithBot(state: SimState, params: Params, scenario: Scenario, bot: Bot): SimState {
  if (state.status !== "running") return state;

  state.hour += 1;

  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };

  bot.planHour?.(ctx);

  for (const stage of PIPELINE) {
    stage.run(ctx);
  }

  for (const incident of state.activeIncidents) {
    if (incident.resolvedAtHour !== undefined) continue;
    const definition = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (definition === undefined) continue;
    const responseId = bot.chooseIncidentResponse(ctx, incident, definition);
    applyResponse(ctx, definition, incident, responseId);
  }

  return state;
}

/** Runs until the mission ends or `maxHours` is reached, `bot` deciding everything along the
 *  way — the headless counterpart to `engine/tick.ts`'s own `run()`. */
export function runWithBot(
  state: SimState,
  params: Params,
  scenario: Scenario,
  maxHours: number,
  bot: Bot,
): SimState {
  for (let i = 0; i < maxHours && state.status === "running"; i++) {
    tickWithBot(state, params, scenario, bot);
  }
  return state;
}
