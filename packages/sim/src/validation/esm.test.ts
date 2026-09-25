/**
 * scenarioEsmBreakdown mixes fully-sourced per-system hardware data (M/C/CT, supplied by
 * the research team 2026-09) with the systems that still lack it. These tests pin the
 * arithmetic for both cases, guard the "missing term is not a zero" rule (`lifeSupport` has
 * no hardware data at all; `waterRecovery` has mass and crew-time but no cooling figure),
 * and guard against the two easiest ways the reactor line could quietly go wrong: counting
 * it as a linear rate instead of the one real unit NASA-FSP actually describes, and
 * forgetting that turning it off (fissionReactorKwe: 0) must zero its whole mass line, not
 * scale it.
 */
import { describe, expect, it } from "vitest";
import { hardwareEsm, management, power } from "../data/constants.js";
import { equivalentSystemMass, scenarioEsmBreakdown } from "../engine/esm.js";
import { jezeroOutpost } from "../data/scenarios/jezero.js";
import type { Scenario } from "../types.js";
import { hoursToDays, kwToWatts, perYearToPerDay } from "../units.js";

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

  it("every line's power contribution is its power times the surface-mid factor", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid");
    for (const line of breakdown.perSystem) {
      expect(line.powerKg).toBeCloseTo(line.powerKw * management.esmSurfacePowerKgPerKwMid.value, 6);
    }
  });

  it("a system with full sourced hardware data (CO2 scrubber) sums power, mass, cooling and crew-time", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid");
    const line = breakdown.perSystem.find((l) => l.system === "co2Scrubber");
    expect(line).toBeDefined();
    const durationDays = hoursToDays(jezeroOutpost.durationHours);
    const expectedMassKg = hardwareEsm.co2Scrubber.massKg.value;
    const expectedCoolingKg =
      kwToWatts(hardwareEsm.co2Scrubber.coolingKw.value) * management.esmCoolingKgPerW.value;
    const expectedCrewTimeKg =
      perYearToPerDay(hardwareEsm.co2Scrubber.crewHoursPerYear.value) *
      durationDays *
      management.esmCrewTimeKgPerCrewHour.value;

    expect(line?.massKg).toBeCloseTo(expectedMassKg, 6);
    expect(line?.coolingKg).toBeCloseTo(expectedCoolingKg, 6);
    expect(line?.crewTimeKg).toBeCloseTo(expectedCrewTimeKg, 6);
    expect(line?.fullySourced).toBe(true);
    expect(line?.equivalentKg).toBeCloseTo(
      (line?.powerKg ?? 0) + expectedMassKg + expectedCoolingKg + expectedCrewTimeKg,
      6,
    );
  });

  it("lifeSupport has no hardware data at all — its line is power only, never padded to zero", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const line = breakdown.perSystem.find((l) => l.system === "lifeSupport");
    expect(line).toBeDefined();
    expect(line?.massKg).toBeUndefined();
    expect(line?.coolingKg).toBeUndefined();
    expect(line?.crewTimeKg).toBeUndefined();
    expect(line?.fullySourced).toBe(false);
    expect(line?.equivalentKg).toBeCloseTo(line?.powerKg ?? -1, 6);
  });

  it("waterRecovery has mass and crew-time but no cooling figure, and is not fullySourced", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const line = breakdown.perSystem.find((l) => l.system === "waterRecovery");
    expect(line?.massKg).toBeCloseTo(hardwareEsm.waterRecovery.massKg.value, 6);
    expect(line?.coolingKg).toBeUndefined();
    expect(line?.crewTimeKg).toBeGreaterThan(0);
    expect(line?.fullySourced).toBe(false);
  });

  it("greenhouse scales its per-square-metre hardware terms by the scenario's total crop-tray area", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const line = breakdown.perSystem.find((l) => l.system === "greenhouse");
    const totalAreaM2 = jezeroOutpost.initial.cropTrays.reduce((sum, t) => sum + t.areaM2, 0);
    expect(totalAreaM2).toBeGreaterThan(0);
    expect(line?.massKg).toBeCloseTo(hardwareEsm.greenhousePerM2.massKgPerM2.value * totalAreaM2, 6);
    expect(line?.fullySourced).toBe(true);
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
      powerKg +
        breakdown.habitatVolumeKg +
        breakdown.batteryMassKg +
        breakdown.reactorMassKg +
        breakdown.consumablesMassKg +
        breakdown.shieldingCrewTimeKg,
      6,
    );
  });

  it("consumables mass is the scenario's own starting O2/CO2/food/water, previously omitted entirely", () => {
    const breakdown = scenarioEsmBreakdown(jezeroOutpost);
    const expectedKg =
      jezeroOutpost.initial.o2Kg +
      jezeroOutpost.initial.co2Kg +
      jezeroOutpost.initial.foodDryMassKg +
      jezeroOutpost.initial.potableWaterKg;
    expect(breakdown.consumablesMassKg).toBeCloseTo(expectedKg, 6);
    expect(breakdown.consumablesMassKg).toBeGreaterThan(0);
  });

  it("shielding crew-time is zero by default, and scales with the optional crew-hours argument", () => {
    const withoutBerm = scenarioEsmBreakdown(jezeroOutpost);
    expect(withoutBerm.shieldingCrewTimeKg).toBe(0);

    const withBerm = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid", 80);
    expect(withBerm.shieldingCrewTimeKg).toBeCloseTo(80 * management.esmCrewTimeKgPerCrewHour.value, 6);
    expect(withBerm.totalKg).toBeCloseTo(withoutBerm.totalKg + withBerm.shieldingCrewTimeKg, 6);
  });

  it("a higher-mass power infrastructure choice never produces a lower total", () => {
    const low = scenarioEsmBreakdown(jezeroOutpost, "surfaceLow");
    const mid = scenarioEsmBreakdown(jezeroOutpost, "surfaceMid");
    const high = scenarioEsmBreakdown(jezeroOutpost, "surfaceHigh");
    expect(mid.totalKg).toBeGreaterThan(low.totalKg);
    expect(high.totalKg).toBeGreaterThan(mid.totalKg);
  });
});
