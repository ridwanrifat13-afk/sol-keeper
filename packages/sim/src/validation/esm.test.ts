/**
 * scenarioEsmBreakdown is deliberately partial — see the comment above it in engine/esm.ts
 * for why hardware mass, cooling and crew-time are left out rather than padded with guessed
 * masses. These tests pin the arithmetic for the four terms it does compute, and guard
 * against the two easiest ways that honesty could quietly slip: counting the reactor as a
 * linear rate instead of the one real unit NASA-FSP actually describes, and forgetting that
 * turning the reactor off (fissionReactorKwe: 0) must zero its whole mass line, not scale it.
 */
import { describe, expect, it } from "vitest";
import { management, power } from "../data/constants.js";
import { equivalentSystemMass, scenarioEsmBreakdown } from "../engine/esm.js";
import { jezeroOutpost } from "../data/scenarios/jezero.js";
import type { Scenario } from "../types.js";

describe("equivalentSystemMass", () => {
  it("sums all five BVAD terms", () => {
    const result = equivalentSystemMass({
      massKg: 100,
      volumeM3: 2,
      powerKw: 1,
      coolingKw: 0.5,
      crewHoursPerDay: 1,
      durationDays: 10,
    });
    expect(result.massKg).toBe(100);
    expect(result.volumeKg).toBeCloseTo(2 * management.esmTransitVolumeKgPerM3.value, 6);
    expect(result.totalKg).toBeCloseTo(
      result.massKg + result.volumeKg + result.powerKg + result.coolingKg + result.crewTimeKg,
      6,
    );
  });

  it("a zeroed input contributes nothing for that term", () => {
    const result = equivalentSystemMass({
      massKg: 0,
      volumeM3: 0,
      powerKw: 1,
      coolingKw: 0,
      crewHoursPerDay: 0,
      durationDays: 10,
    });
    expect(result.volumeKg).toBe(0);
    expect(result.coolingKg).toBe(0);
    expect(result.crewTimeKg).toBe(0);
    expect(result.powerKg).toBeGreaterThan(0);
  });
});

describe("scenarioEsmBreakdown", () => {
  it("gives every scenario system its own line, in the scenario's own order", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    expect(breakdown.perSystem.map((l) => l.system)).toEqual(
      jezeroOutpost.systems.map((s) => s.id),
    );
  });

  it("each system's equivalent mass is its power times the surface-mid factor", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid");
    for (const line of breakdown.perSystem) {
      expect(line.equivalentKg).toBeCloseTo(
        line.powerKw * management.esmSurfacePowerKgPerKwMid.value,
        6,
      );
    }
  });

  it("habitat volume converts through the BVAD transit-volume factor", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    expect(breakdown.habitatVolumeKg).toBeCloseTo(
      jezeroOutpost.initial.habitatVolumeM3 * management.esmTransitVolumeKgPerM3.value,
      6,
    );
  });

  it("battery mass is capacity divided by specific energy, not multiplied", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const expectedKg =
      (jezeroOutpost.initial.batteryCapacityKwh * 1000) / power.batterySpecificEnergyWhPerKg.value;
    expect(breakdown.batteryMassKg).toBeCloseTo(expectedKg, 6);
    // Sanity: doubling capacity should double the mass, not the other direction.
    const doubled = scenarioEsmBreakdown({
      ...jezeroOutpost,
      initial: { ...jezeroOutpost.initial, batteryCapacityKwh: jezeroOutpost.initial.batteryCapacityKwh * 2 },
    });
    expect(doubled.batteryMassKg).toBeCloseTo(breakdown.batteryMassKg * 2, 6);
  });

  it("Jezero carries no reactor, so the reactor line is exactly zero", () => {
    expect(jezeroOutpost.initial.fissionReactorKwe).toBe(0);
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    expect(breakdown.reactorMassKg).toBe(0);
  });

  it("a scenario carrying a reactor is charged its full stated mass, not a scaled rate", () => {
    const withReactor: Scenario = {
      ...jezeroOutpost,
      initial: { ...jezeroOutpost.initial, fissionReactorKwe: 40 },
    };
    const breakdown = scenarioEsmBreakdown(withReactor);
    expect(breakdown.reactorMassKg).toBe(power.fissionSurfacePowerMassKg.value);

    // A reactor running at a fraction of its rated output still costs its whole mass — it
    // is one physical unit, not a per-kW rate. This is the case a linear-scaling bug would
    // get wrong: 10 kWe must charge the same 6000 kg as 40 kWe, not a quarter of it.
    const partialLoad: Scenario = {
      ...jezeroOutpost,
      initial: { ...jezeroOutpost.initial, fissionReactorKwe: 10 },
    };
    expect(scenarioEsmBreakdown(partialLoad).reactorMassKg).toBe(breakdown.reactorMassKg);
  });

  it("the grand total is exactly the sum of its parts", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const powerKg = breakdown.perSystem.reduce((sum, l) => sum + l.equivalentKg, 0);
    expect(breakdown.totalKg).toBeCloseTo(
      powerKg + breakdown.habitatVolumeKg + breakdown.batteryMassKg + breakdown.reactorMassKg,
      6,
    );
  });

  it("a higher-mass power infrastructure choice never produces a lower total", () => {
    const low = scenarioEsmBreakdown(jezeroOutpost, "surfaceLow");
    const mid = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid");
    const high = scenarioEsmBreakdown(jezeroOutpost, "surfaceHigh");
    expect(mid.totalKg).toBeGreaterThan(low.totalKg);
    expect(high.totalKg).toBeGreaterThan(mid.totalKg);
  });
});
