/**
 * Player request: "apply visual effects on the habitat according to the mission logs sol by
 * sol." A plain function of a real `SimState`, so mutations apply the normal way (no
 * React/Zustand SSR limitation in the way — habitat.test.tsx's own doc comment covers why
 * that path can't observe a post-reset mutation).
 */
import { describe, expect, it } from "vitest";
import { createRun, getScenario, type Params } from "@sol-keeper/sim";
import { habitatEffects } from "../src/dial/habitatEffects.js";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

describe("habitatEffects", () => {
  it("a fresh mission has no lasting effects at all", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createRun(params, scenario);
    expect(habitatEffects(state, scenario)).toEqual({
      arrayLossFraction: 0,
      hasFireHistory: false,
      improvisedRepairSystemCount: 0,
    });
  });

  it("arrayLossFraction is the real fraction of the scenario's own rated array area lost", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createRun(params, scenario);
    state.power.arrayAreaLossM2 = scenario.initial.solarArrayAreaM2 * 0.4;
    expect(habitatEffects(state, scenario).arrayLossFraction).toBeCloseTo(0.4, 6);
  });

  it("arrayLossFraction never exceeds 1, even if somehow more area is lost than the array had", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createRun(params, scenario);
    state.power.arrayAreaLossM2 = scenario.initial.solarArrayAreaM2 * 5;
    expect(habitatEffects(state, scenario).arrayLossFraction).toBe(1);
  });

  it("hasFireHistory reads the log's own stable code, true for any fire-mir97 code and false for an unrelated one", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createRun(params, scenario);
    state.log.push({ id: "10:0", hour: 10, kind: "hazard", severity: "critical", code: "incident.fire-mir97.resolved", data: {} });
    expect(habitatEffects(state, scenario).hasFireHistory).toBe(true);

    const state2 = createRun(params, scenario);
    state2.log.push({ id: "10:0", hour: 10, kind: "resource", severity: "warning", code: "power.brownout", data: {} });
    expect(habitatEffects(state2, scenario).hasFireHistory).toBe(false);
  });

  it("improvisedRepairSystemCount counts every system with a real efficiency penalty, not just one", () => {
    const scenario = getScenario(params.scenarioId);
    const state = createRun(params, scenario);
    const thermalControl = state.systems.thermalControl;
    const waterRecovery = state.systems.waterRecovery;
    if (thermalControl === undefined || waterRecovery === undefined) {
      throw new Error("jezero-outpost is expected to carry both systems");
    }
    thermalControl.efficiencyPenaltyFraction = 0.2;
    waterRecovery.efficiencyPenaltyFraction = 0.1;
    expect(habitatEffects(state, scenario).improvisedRepairSystemCount).toBe(2);
  });
});
