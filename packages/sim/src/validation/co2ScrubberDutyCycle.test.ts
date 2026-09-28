/**
 * Player request (M9.x): a real lever in nominal conditions — easing the CO2 scrubber off its
 * rated capacity trades scrubbing margin for a real crop-growth benefit (co2CropGrowth.test.ts
 * covers that half), at the real risk of crossing the current survival mode's own CO2 limit.
 * These tests cover the scrubber-capacity half: "full" reproduces this sim's original,
 * only-ever behaviour exactly (a real regression guard — this is the default every existing
 * run and every golden fingerprint already assumed), and "balanced"/"eco" genuinely change
 * how fast cabin CO2 climbs, not just a UI label with no real effect.
 */
import { describe, expect, it } from "vitest";
import { habitat } from "../data/constants.js";
import { co2ScrubberDutyCycleFraction } from "../models/atmosphere.js";
import { createInitialState } from "../engine/state.js";
import { getScenario } from "../data/scenarios/index.js";
import { run } from "../engine/tick.js";
import type { Params } from "../types.js";

describe("co2ScrubberDutyCycleFraction", () => {
  it("full is exactly 1 — this sim's original, only-ever scrubber behaviour", () => {
    expect(co2ScrubberDutyCycleFraction("full")).toBe(1);
  });

  it("balanced and eco match their own sourced constants, and eco is the more aggressive cut", () => {
    expect(co2ScrubberDutyCycleFraction("balanced")).toBe(habitat.co2ScrubberDutyCycleBalancedFraction.value);
    expect(co2ScrubberDutyCycleFraction("eco")).toBe(habitat.co2ScrubberDutyCycleEcoFraction.value);
    expect(co2ScrubberDutyCycleFraction("eco")).toBeLessThan(co2ScrubberDutyCycleFraction("balanced"));
    expect(co2ScrubberDutyCycleFraction("balanced")).toBeLessThan(co2ScrubberDutyCycleFraction("full"));
  });
});

describe("the duty cycle actually changes how the scrubber behaves, not just a label", () => {
  const params: Params = {
    scenarioId: "jezero-outpost",
    seed: 12345,
    crewSize: 4,
    missionStartIso: "2033-03-01",
    difficulty: "nominal",
  };

  function play(mode: "full" | "balanced" | "eco", hours: number) {
    const scenario = getScenario(params.scenarioId);
    const state = createInitialState(params);
    state.atmosphere.co2ScrubberMode = mode;
    return run(state, params, scenario, hours);
  }

  it("leaving it on full reproduces the sim's original near-zero steady state", () => {
    // By hour 24, not hour 1 — "near zero" is the settled state, not the very first tick
    // (which still reflects the scenario's own nonzero initial co2Kg).
    const state = play("full", 24);
    expect(state.atmosphere.co2PartialPressureMmHg).toBeLessThan(0.1);
  });

  it("balanced lets CO2 climb well above full's steady state, without crossing the Nominal limit", () => {
    // Sampled at hour 24, inside balanced's own real elevated window (it does eventually
    // drain back toward zero too, just far slower than full — capacity still exceeds
    // production, per the constant's own note) — confirmed by direct simulation, not assumed.
    const full = play("full", 24).atmosphere.co2PartialPressureMmHg;
    const balanced = play("balanced", 24).atmosphere.co2PartialPressureMmHg;
    expect(balanced).toBeGreaterThan(full);
    expect(balanced).toBeLessThan(3.0); // Nominal mode's own co2LimitMmHg
  });

  it("eco climbs faster than balanced, and does cross the Nominal limit if left unmanaged", () => {
    const balanced24 = play("balanced", 24).atmosphere.co2PartialPressureMmHg;
    const eco24 = play("eco", 24).atmosphere.co2PartialPressureMmHg;
    expect(eco24).toBeGreaterThan(balanced24);
    expect(play("eco", 100).atmosphere.co2PartialPressureMmHg).toBeGreaterThan(3.0);
  });
});
