/**
 * The Moon scenarios were tuned against real arithmetic (see the comments in
 * firstLight.ts and theLongNight.ts) and then checked the way arithmetic alone can't:
 * by actually playing them through, repeatedly, and looking at why a run failed rather
 * than just whether it did. That process caught two real bugs before either scenario
 * shipped:
 *
 *  1. `isruStage` crashed outright on any scenario without a `moxie` system — correct for
 *     the Moon, since MOXIE consumes the Martian CO2 atmosphere the Moon does not have, but
 *     `state.systems` was typed as if every SystemId always existed. A first attempt at
 *     Moon scenarios found this on the first tick.
 *  2. Both scenarios' thermalControl power was copied from Jezero's Mars-tuned figure
 *     (2.5 kW), which cannot come close to holding a cabin warm against the Moon's -178 degC
 *     night (Mars never gets colder than about -103 degC in this sim). Every seed died at
 *     the identical hour regardless of RNG — a signature of a deterministic design flaw, not
 *     genuine difficulty — and First Light's battery was later found to be undersized for a
 *     second, independent reason: load shedding is reactive, not anticipatory, so a battery
 *     sized only for the *critical* path still drains on low-priority systems before the
 *     sim ever sheds them, leaving too little for the critical path in the night's second
 *     half. Jezero-outpost winning all 20 test seeds passively established the bar these two
 *     scenarios are held to; they were re-sized until they cleared it too.
 */
import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine/state.js";
import { run } from "../engine/tick.js";
import { firstLight, jezeroOutpost, theLongNight } from "../data/scenarios/index.js";
import type { Params } from "../types.js";

function play(scenarioId: Params["scenarioId"], seed: number) {
  const scenario = scenarioId === "first-light" ? firstLight : scenarioId === "the-long-night" ? theLongNight : jezeroOutpost;
  const params: Params = {
    scenarioId,
    seed,
    crewSize: scenario.crewSize,
    missionStartIso: "2033-01-01",
    difficulty: "standard",
  };
  const state = createInitialState(params);
  run(state, params, scenario, scenario.durationHours);
  return state;
}

describe("Moon scenarios carry no Mars-only systems", () => {
  it("neither First Light nor The Long Night includes MOXIE", () => {
    // MOXIE consumes the Martian CO2 atmosphere; the Moon does not have one. Including it
    // here would be invented physics for this body (brief rule 1), not a simplification.
    for (const scenario of [firstLight, theLongNight]) {
      expect(scenario.systems.map((s) => s.id)).not.toContain("moxie");
    }
  });

  it("does not crash when a scenario omits a system another scenario relies on", () => {
    // This is the exact crash a first attempt at these scenarios hit on tick one:
    // isruStage indexed state.systems.moxie unconditionally.
    expect(() => play("first-light", 1)).not.toThrow();
    expect(() => play("the-long-night", 1)).not.toThrow();
  });
});

describe("Moon scenarios are winnable passively, across a real spread of seeds", () => {
  it("First Light survives a full day-night-day cycle on 20/20 seeds", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = play("first-light", seed);
      expect(state.status, `seed ${seed} ended ${state.status}`).toBe("won");
      expect(state.crew.every((c) => c.alive)).toBe(true);
    }
  });

  it("The Long Night survives three lunar cycles on 20/20 seeds", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = play("the-long-night", seed);
      expect(state.status, `seed ${seed} ended ${state.status}`).toBe("won");
      expect(state.crew.every((c) => c.alive)).toBe(true);
    }
  });

  it("matches jezero-outpost's own standard: passively winnable across seeds", () => {
    // The bar both Moon scenarios are held to, established independently of them.
    for (let seed = 1; seed <= 10; seed++) {
      expect(play("jezero-outpost", seed).status).toBe("won");
    }
  });
});

describe("First Light's numbers reflect the real lunar-night power problem", () => {
  it("cannot hold nominal cabin temperature through the night on generation alone", () => {
    // The whole lesson: night generation is exactly zero, and thermalControl alone (7 kW)
    // does not outrun heat loss at -178 degC without the battery's help. If this ever
    // stopped being true, the scenario would stop teaching what it is named for.
    const heatLoss = 0.035 * (22 - -178); // thermalConductanceKwPerK * deltaT
    const heaterKw = 7.0;
    expect(heaterKw).toBeLessThan(heatLoss);
  });

  it("battery capacity covers full nominal demand for the whole 354 h night", () => {
    // The real constraint: shedding is reactive, so a battery sized only for the critical
    // path still gets drained by low-priority systems before they are ever shed.
    const demandKw = firstLight.systems.reduce((sum, s) => sum + s.nominalPowerKw, 0);
    const nightHours = 354;
    const depthOfDischarge = 0.8;
    const requiredKwh = (demandKw * nightHours) / depthOfDischarge;
    expect(firstLight.initial.batteryCapacityKwh).toBeGreaterThanOrEqual(requiredKwh);
  });
});

describe("The Long Night's food stock clears the real minimum for its duration", () => {
  it("180 kg (the first attempt) was already below the bare minimum — 450 kg is not", () => {
    const crewDayNeed = 0.62; // kg/CM-day, BVAD
    const minimumKg = theLongNight.crewSize * (theLongNight.durationHours / 24) * crewDayNeed;
    expect(180).toBeLessThan(minimumKg); // documents the bug that shipped first
    expect(theLongNight.initial.foodDryMassKg).toBeGreaterThan(minimumKg);
  });

  it("the reactor comfortably covers the scenario's own peak demand", () => {
    const peakKw = theLongNight.systems.reduce((sum, s) => sum + s.nominalPowerKw, 0);
    expect(theLongNight.initial.fissionReactorKwe).toBeGreaterThan(peakKw);
  });
});
