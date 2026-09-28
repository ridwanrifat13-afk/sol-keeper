/**
 * Player request (M9.x, batch 2): a third nominal-conditions lever — trims thermalControl's
 * shared heater/radiator capacity to save power. habitat.thermalPowerSaveDutyCycleFraction's
 * own value was set by direct simulation of all three scenarios' full durations across
 * several seeds (a first hand-derived steady-state guess was checked against, and corrected
 * by, that real run before this value was chosen — thermalStage's heater/radiator law is
 * bang-bang, not a proportional controller, so a steady-state balance does not predict it).
 * These tests are a regression anchor for that same real behaviour, not a re-derivation.
 */
import { describe, expect, it } from "vitest";
import { habitat } from "../data/constants.js";
import { thermalControlDutyCycleFraction } from "../models/thermal.js";
import { createInitialState } from "../engine/state.js";
import { getScenario } from "../data/scenarios/index.js";
import { run, tick } from "../engine/tick.js";
import type { Params } from "../types.js";

describe("thermalControlDutyCycleFraction", () => {
  it("comfort is exactly 1 — this sim's original, only-ever thermalControl behaviour", () => {
    expect(thermalControlDutyCycleFraction("comfort")).toBe(1);
  });

  it("powerSave matches its own sourced, tuned constant", () => {
    expect(thermalControlDutyCycleFraction("powerSave")).toBe(habitat.thermalPowerSaveDutyCycleFraction.value);
    expect(thermalControlDutyCycleFraction("powerSave")).toBeLessThan(1);
  });
});

describe("the duty cycle actually changes cabin temperature, not just a label", () => {
  function play(scenarioId: Params["scenarioId"], crewSize: number, mode: "comfort" | "powerSave", hours: number) {
    const params: Params = { scenarioId, seed: 42, crewSize, missionStartIso: "2033-03-01", difficulty: "nominal" };
    const scenario = getScenario(scenarioId);
    const state = createInitialState(params);
    state.thermal.controlMode = mode;
    return run(state, params, scenario, hours);
  }

  it("comfort holds the cabin closer to the nominal-mode setpoint than powerSave over a Mars night", () => {
    const comfort = play("jezero-outpost", 4, "comfort", 22).thermal.habitatTempC;
    const powerSave = play("jezero-outpost", 4, "powerSave", 22).thermal.habitatTempC;
    expect(powerSave).toBeLessThan(comfort);
  });

  it("powerSave never crosses freezeRiskTempC across a full run on any of the three scenarios (the whole point of the chosen fraction, checked by direct simulation)", () => {
    const scenarios: readonly [Params["scenarioId"], number, number][] = [
      ["jezero-outpost", 4, 739],
      ["first-light", 2, 750],
      ["the-long-night", 4, 2124],
    ];
    for (const [scenarioId, crewSize, hours] of scenarios) {
      const params: Params = {
        scenarioId,
        seed: 42,
        crewSize,
        missionStartIso: "2033-03-01",
        difficulty: "nominal",
      };
      const scenario = getScenario(scenarioId);
      const state = createInitialState(params);
      state.thermal.controlMode = "powerSave";
      let minTempC = state.thermal.habitatTempC;
      for (let h = 0; h < hours && state.status === "running"; h++) {
        tick(state, params, scenario);
        minTempC = Math.min(minTempC, state.thermal.habitatTempC);
      }
      expect(minTempC).toBeGreaterThan(habitat.freezeRiskTempC.value);
    }
  });
});
