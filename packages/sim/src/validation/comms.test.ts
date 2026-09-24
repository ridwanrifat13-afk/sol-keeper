/**
 * M8.4 Part C: the downlink-priority trade-off — the same real comms uptime accrues either
 * jezero-outpost's own science goal or crew morale, never both, decided by
 * `SimState.comms.priority`. Defaults to "science", preserving M7.7 §3's own unconditional
 * accrual for any run that never touches the new Comms console lever.
 */
import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine/state.js";
import { EventLogger } from "../engine/log.js";
import { Rng } from "../engine/rng.js";
import { commsStage } from "../models/comms.js";
import { jezeroOutpost } from "../data/scenarios/index.js";
import type { Params, SimState } from "../types.js";
import type { TickContext } from "../engine/context.js";

const PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-01-01",
  difficulty: "nominal",
};

function tickOnce(state: SimState): TickContext {
  state.hour += 1;
  return {
    state,
    params: PARAMS,
    scenario: jezeroOutpost,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };
}

/** `powerStage` (not run by these tests in isolation) is what normally sets `poweredThisHour`
 *  each hour — set it explicitly here so `commsStage`'s own "is comms up" gate reads real,
 *  intended values rather than its unset pre-first-tick default. */
function freshState(): SimState {
  const state = createInitialState(PARAMS);
  const comms = state.systems.comms;
  if (comms !== undefined) comms.poweredThisHour = true;
  return state;
}

describe("comms downlink priority (M8.4 Part C)", () => {
  it("defaults to science, accruing points as it always did", () => {
    const state = freshState();
    expect(state.comms.priority).toBe("science");
    const before = state.science.points;
    commsStage(tickOnce(state));
    expect(state.science.points).toBeGreaterThan(before);
  });

  it("prioritizing personal accrues crew morale instead of science", () => {
    const state = freshState();
    state.comms.priority = "personal";
    // Give morale room to rise from its 1.0 starting point's own clamp ceiling.
    for (const member of state.crew) member.moraleFraction = 0.9;

    const scoreBefore = state.science.points;
    const moraleBefore = state.crew.map((c) => c.moraleFraction);

    commsStage(tickOnce(state));

    expect(state.science.points).toBe(scoreBefore);
    state.crew.forEach((c, i) => {
      expect(c.moraleFraction).toBeGreaterThan(moraleBefore[i]!);
    });
  });

  it("neither accrues while comms is down — no free bonus during a blackout", () => {
    const state = freshState();
    state.comms.priority = "personal";
    for (const member of state.crew) member.moraleFraction = 0.9;
    state.comms.blackout = true;

    const scoreBefore = state.science.points;
    const moraleBefore = state.crew.map((c) => c.moraleFraction);

    commsStage(tickOnce(state));

    expect(state.science.points).toBe(scoreBefore);
    state.crew.forEach((c, i) => {
      expect(c.moraleFraction).toBe(moraleBefore[i]);
    });
  });
});
