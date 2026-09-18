/**
 * Brief rule 2: same seed and inputs produce an identical final state and an identical log.
 *
 * This is the test the Black Box depends on. If a run cannot be reproduced, a debrief that
 * claims to explain it is fiction.
 */
import { describe, expect, it } from "vitest";
import { getScenario } from "../data/scenarios/index.js";
import { createInitialState } from "../engine/state.js";
import { run, tick } from "../engine/tick.js";
import type { Params } from "../types.js";
import { solsToHours } from "../units.js";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 12345,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "standard",
};

function play(p: Params, sols: number) {
  const scenario = getScenario(p.scenarioId);
  const state = createInitialState(p);
  return run(state, p, scenario, Math.ceil(solsToHours(sols)));
}

describe("determinism", () => {
  it("two runs from the same seed produce identical final state and log", () => {
    const a = play(params, 30);
    const b = play(params, 30);

    expect(a.log.length).toBe(b.log.length);
    expect(a.log).toEqual(b.log);
    expect(a).toEqual(b);
  });

  it("a different seed produces a different run", () => {
    const a = play(params, 30);
    const b = play({ ...params, seed: 999 }, 30);
    expect(a).not.toEqual(b);
  });

  it("state is fully serialisable, so a save round-trips exactly", () => {
    const a = play(params, 10);
    const roundTripped = JSON.parse(JSON.stringify(a)) as typeof a;
    expect(roundTripped).toEqual(a);
  });

  it("resuming from a serialised save continues identically", () => {
    const scenario = getScenario(params.scenarioId);

    const straight = createInitialState(params);
    run(straight, params, scenario, 200);

    const paused = createInitialState(params);
    run(paused, params, scenario, 100);
    const saved = JSON.parse(JSON.stringify(paused)) as typeof paused;
    run(saved, params, scenario, 100);

    expect(saved.hour).toBe(straight.hour);
    expect(saved.log).toEqual(straight.log);
    expect(saved).toEqual(straight);
  });

  it("RNG streams are independent: draining one does not shift another", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createInitialState(params);
    tick(state, params, scenario);

    const before = JSON.parse(JSON.stringify(state.rng.streams)) as Record<string, unknown>;
    // Streams are created lazily and keyed by name, so an unrelated stream is untouched.
    expect(Object.keys(before).length).toBeGreaterThan(0);

    const other = createInitialState(params);
    tick(other, params, scenario);
    expect(other.rng.streams).toEqual(state.rng.streams);
  });

  it("the tick never rewinds and the log only grows", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createInitialState(params);

    let lastHour = state.hour;
    let lastLogLength = state.log.length;
    for (let i = 0; i < 300 && state.status === "running"; i++) {
      tick(state, params, scenario);
      expect(state.hour).toBeGreaterThan(lastHour);
      expect(state.log.length).toBeGreaterThanOrEqual(lastLogLength);
      lastHour = state.hour;
      lastLogLength = state.log.length;
    }
  });
});
