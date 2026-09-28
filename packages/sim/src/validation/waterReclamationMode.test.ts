/**
 * Player request (M9.x, batch 2): a second nominal-conditions water lever. Both recovery
 * fractions were already sourced (NASA-WATER-2023) and declared in constants.ts, just never
 * read by any model until now — these tests cover the real behaviour the toggle switches
 * between, and the real crew-hours cost of running the Brine Processor Assembly.
 */
import { describe, expect, it } from "vitest";
import { lifeSupport } from "../data/constants.js";
import { waterReclamationFraction } from "../models/water.js";
import { createInitialState } from "../engine/state.js";
import { getScenario } from "../data/scenarios/index.js";
import { run } from "../engine/tick.js";
import type { Params } from "../types.js";

describe("waterReclamationFraction", () => {
  it("baseline matches this sim's original, only-ever recovery fraction", () => {
    expect(waterReclamationFraction("baseline")).toBe(lifeSupport.waterRecoveryFractionBaseline.value);
  });

  it("brineProcessor matches the sourced, higher recovery fraction", () => {
    expect(waterReclamationFraction("brineProcessor")).toBe(
      lifeSupport.waterRecoveryFractionWithBrineProcessor.value,
    );
    expect(waterReclamationFraction("brineProcessor")).toBeGreaterThan(waterReclamationFraction("baseline"));
  });
});

describe("the toggle actually changes water loss and the crew-hours budget, not just a label", () => {
  const params: Params = {
    scenarioId: "jezero-outpost",
    seed: 12345,
    crewSize: 4,
    missionStartIso: "2033-03-01",
    difficulty: "nominal",
  };

  function play(mode: "baseline" | "brineProcessor", hours: number) {
    const scenario = getScenario(params.scenarioId);
    const state = createInitialState(params);
    state.water.reclamationMode = mode;
    return run(state, params, scenario, hours);
  }

  it("brineProcessor conserves more potable water than baseline over the same window", () => {
    const baseline = play("baseline", 48).water.potableKg;
    const brineProcessor = play("brineProcessor", 48).water.potableKg;
    expect(brineProcessor).toBeGreaterThan(baseline);
  });

  it("baseline reproduces the sim's original recovery fraction on the first real tick", () => {
    const state = play("baseline", 1);
    expect(state.water.recoveryFraction).toBeCloseTo(lifeSupport.waterRecoveryFractionBaseline.value, 6);
  });

  it("running the Brine Processor Assembly spends its own real crew-hours cost every day, leaving less for everything else", () => {
    const baseline = play("baseline", 24);
    const brineProcessor = play("brineProcessor", 24);
    // Day 0's budget/spent bookkeeping is set by createInitialState, unaffected by
    // reclamationMode until the first later day boundary (engine/crewHours.ts) — sampled
    // after hour 24 crosses it.
    expect(brineProcessor.crewHours.spentTodayHours).toBeGreaterThanOrEqual(
      lifeSupport.brineProcessorCrewHoursPerDay.value,
    );
    expect(brineProcessor.crewHours.spentTodayHours).toBeGreaterThan(baseline.crewHours.spentTodayHours);
  });
});
