/**
 * Player request (M9.x, batch 2): a fourth nominal-conditions lever, reusing two constants
 * (crew.overtimeCeilingFractionOfAverage, crew.overtimeFatiguePerHourAboveCeiling) that were
 * already sourced (BVAD-2022) and declared in constants.ts, but never read by any model
 * before engine/crewHours.ts's own day-boundary bookkeeping wired them in.
 */
import { describe, expect, it } from "vitest";
import { crew as crewConstants } from "../data/constants.js";
import { availableCrewHours } from "../models/crew.js";
import { createInitialState } from "../engine/state.js";
import { getScenario } from "../data/scenarios/index.js";
import { tick } from "../engine/tick.js";
import type { Params } from "../types.js";
import type { TickContext } from "../engine/context.js";
import { EventLogger } from "../engine/log.js";
import { Rng } from "../engine/rng.js";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 12345,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

function ctxFor(state: ReturnType<typeof createInitialState>, scenario: ReturnType<typeof getScenario>): TickContext {
  return { state, params, scenario, rng: new Rng(state.rng), log: new EventLogger(state.log, state.hour), dtHours: 1 };
}

describe("overtimeAuthorized", () => {
  const scenario = getScenario(params.scenarioId);

  it("off by default reproduces this sim's original day-boundary budget exactly", () => {
    const state = createInitialState(params);
    // crewHours runs first in PIPELINE (tick.ts), before crew — so hour 24's own boundary
    // reads health/morale as hour 23 left them, not hour 24's own later drift. Captured here
    // right after hour 23 (crewStage already applied for that hour) so the comparison uses
    // exactly the same health/morale the real boundary computation read.
    for (let h = 0; h < 23; h++) tick(state, params, scenario);
    const baseline = availableCrewHours(ctxFor(state, scenario));
    tick(state, params, scenario); // hour 24 — the day-1 boundary
    expect(state.crewHours.budgetTodayHours).toBeCloseTo(baseline, 6);
  });

  it("authorized raises the next day's budget by exactly overtimeCeilingFractionOfAverage", () => {
    const state = createInitialState(params);
    state.crewHours.overtimeAuthorized = true;
    for (let h = 0; h < 23; h++) tick(state, params, scenario);
    const baseline = availableCrewHours(ctxFor(state, scenario));
    tick(state, params, scenario); // hour 24 — the day-1 boundary
    expect(state.crewHours.budgetTodayHours).toBeCloseTo(
      baseline * crewConstants.overtimeCeilingFractionOfAverage.value,
      6,
    );
    expect(state.crewHours.unboostedBudgetTodayHours).toBeCloseTo(baseline, 6);
  });

  it("authorizing overtime that goes unspent costs nothing — no fatigue added", () => {
    const state = createInitialState(params);
    state.crewHours.overtimeAuthorized = true;
    // Two full days with nothing ever drawing on the crew-hours pool (no incidents queued,
    // no clean-array/BPA spend) — every living member's fatigue should stay exactly 0.
    for (let h = 0; h < 49; h++) tick(state, params, scenario);
    for (const member of state.crew) {
      expect(member.fatigueFraction).toBe(0);
    }
  });

  it("spending past the un-boosted ceiling while authorized adds real, felt fatigue at day's end", () => {
    const state = createInitialState(params);
    state.crewHours.overtimeAuthorized = true;
    for (let h = 0; h < 24; h++) tick(state, params, scenario); // reach day 1's boundary/reset
    const unboosted = state.crewHours.unboostedBudgetTodayHours;
    // Force a real excess: pretend the whole crew already spent past the un-boosted ceiling
    // today (the same "queue/clean-array/BPA all draw from this one pool" pattern every other
    // real spend in this codebase already uses) — 5 hours of genuine overtime.
    state.crewHours.spentTodayHours = unboosted + 5;
    for (let h = 0; h < 24; h++) tick(state, params, scenario); // cross the next day boundary
    const expectedGain = crewConstants.overtimeFatiguePerHourAboveCeiling.value * 5;
    for (const member of state.crew) {
      if (!member.alive) continue;
      expect(member.fatigueFraction).toBeCloseTo(expectedGain, 6);
    }
  });
});
