/**
 * The lunar night problem: 354 hours of darkness is what makes batteries alone absurd and
 * a fission reactor the honest answer. This test pins the arithmetic behind that argument.
 */
import { describe, expect, it } from "vitest";
import { environment, power } from "../data/constants.js";
import { solarGenerationKw } from "../models/power.js";
import { irradianceAtAu, kwForHoursToKwh } from "../units.js";

describe("power validation", () => {
  it("10 kW through a 354 h lunar night needs about 17.7 t of batteries", () => {
    const loadKw = 10;
    const nightHours = environment.lunarNightHours.value;
    const energyKwh = kwForHoursToKwh(loadKw, nightHours);

    expect(energyKwh).toBe(3540);

    const massKg = (energyKwh * 1000) / power.batterySpecificEnergyWhPerKg.value;
    expect(massKg).toBeCloseTo(17700, 0);
    // Before the depth-of-discharge factor, which makes the real number worse still.
    expect(massKg / 1000).toBeCloseTo(17.7, 1);
  });

  it("depth of discharge makes the honest battery mass larger", () => {
    const usableFraction = power.batteryDepthOfDischargeFraction.value;
    const naiveKg = (3540 * 1000) / power.batterySpecificEnergyWhPerKg.value;
    const realKg = naiveKg / usableFraction;
    expect(realKg).toBeGreaterThan(naiveKg);
    expect(realKg).toBeCloseTo(22125, 0);
  });

  it("one fission reactor beats that battery stack on mass", () => {
    expect(power.fissionSurfacePowerMassKg.value).toBeLessThan(17700);
    expect(power.fissionSurfacePowerKwe.value).toBeGreaterThanOrEqual(10);
  });

  it("inverse-square irradiance at Mars matches the published mean", () => {
    const atMars = irradianceAtAu(
      power.solarConstant1AuWPerM2.value,
      environment.marsMeanDistanceAu.value,
    );
    // Published Mars mean is 586-590 W/m^2; the inverse square law should land in that band.
    expect(atMars).toBeGreaterThan(power.marsMeanIrradianceWPerM2.min ?? 586);
    expect(atMars).toBeLessThan(power.marsMeanIrradianceWPerM2.max ?? 590);
  });

  it("array output scales with area, irradiance and cell efficiency", () => {
    const kw = solarGenerationKw(100, 500);
    expect(kw).toBeCloseTo((100 * 500 * power.cellEfficiencyFraction.value) / 1000, 6);
    expect(solarGenerationKw(100, 0)).toBe(0);
    expect(solarGenerationKw(200, 500)).toBeCloseTo(2 * kw, 6);
  });
});
