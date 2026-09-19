/**
 * Pins the values corrected during the 2026-09 verification pass, when a teammate checked
 * 50 parameters against the NASA fact sheets and literature.
 *
 * Four of them were outright mismatches against numbers the project brief had dictated.
 * Without a test, the obvious "fix" for each is to put the familiar textbook figure back —
 * -63 degC for Mars, 3.71 m/s^2, 610 Pa — so each one records what it is and what it is not.
 */
import { describe, expect, it } from "vitest";
import { environment, food, management, power, radiation } from "../data/constants.js";
import { equivalentSystemMass } from "../engine/esm.js";
import { requiredMarginFraction } from "../engine/risk.js";
import { irradianceAtAu } from "../units.js";

describe("values corrected by the 2026-09 verification pass", () => {
  it("Mars gravity is 3.73, not the widely quoted 3.71", () => {
    expect(environment.marsGravityMPerS2.value).toBe(3.73);
  });

  it("Mars mean surface pressure is 636 Pa (6.36 mb), not 610", () => {
    expect(environment.marsSurfacePressurePa.value).toBe(636);
  });

  it("Mars mean surface temperature is -59 degC (214 K), not -63", () => {
    expect(environment.marsMeanSurfaceTempC.value).toBe(-59);
    // Cross-check the kelvin figure the fact sheet actually prints.
    expect(environment.marsMeanSurfaceTempC.value + 273.15).toBeCloseTo(214, 0);
  });

  it("lunar equatorial range is -178..+117 degC (95-390 K), not -173..+127", () => {
    expect(environment.moonEquatorMinTempC.value).toBe(-178);
    expect(environment.moonEquatorMaxTempC.value).toBe(117);
    expect(environment.moonEquatorMinTempC.value + 273.15).toBeCloseTo(95, 0);
    expect(environment.moonEquatorMaxTempC.value + 273.15).toBeCloseTo(390, 0);
  });

  it("Mars irradiance from inverse square matches the fact sheet's 586.2 W/m^2", () => {
    const computed = irradianceAtAu(
      power.solarConstant1AuWPerM2.value,
      environment.marsMeanDistanceAu.value,
    );
    expect(computed).toBeCloseTo(586.2, 0);
    expect(power.marsMeanIrradianceWPerM2.value).toBe(586.2);
  });

  it("Mars synodic period and CO2 fraction carry the precise figures", () => {
    expect(environment.marsConjunctionPeriodDays.value).toBe(779.94);
    expect(environment.marsAtmosphereCo2Fraction.value).toBe(0.9532);
  });
});

describe("placeholders the verification pass resolved", () => {
  it("dust loss is now sourced, at 0.28-0.33% of array power per sol", () => {
    expect(power.dustLossPerSolFraction.confidence).toBe("measured");
    expect(power.dustLossPerSolFraction.value).toBeGreaterThanOrEqual(0.0028);
    expect(power.dustLossPerSolFraction.value).toBeLessThanOrEqual(0.0033);
  });

  it("crop area per person is confirmed against BVAD", () => {
    expect(food.cropAreaPerPersonFullDietM2.confidence).toBe("measured");
    expect(food.cropAreaPerPersonFullDietM2.min).toBe(40);
    expect(food.cropAreaPerPersonFullDietM2.max).toBe(50);
  });

  it("both ESM equivalency factors are live, not zeroed out", () => {
    expect(management.esmCrewTimeKgPerCrewHour.value).toBe(1.25);
    expect(management.esmCoolingKgPerW.value).toBe(0.14);

    // Both terms must now actually move the total, which was the bug with zero placeholders.
    const withLoad = equivalentSystemMass({
      massKg: 100,
      volumeM3: 0,
      powerKw: 0,
      coolingKw: 1,
      crewHoursPerDay: 2,
      durationDays: 100,
    });
    expect(withLoad.coolingKg).toBeCloseTo(140, 6); // 1 kW = 1000 W x 0.14 kg/W
    expect(withLoad.crewTimeKg).toBeCloseTo(250, 6); // 2 h/day x 100 days x 1.25 kg/CM-h
    expect(withLoad.totalKg).toBeCloseTo(490, 6);
  });
});

describe("radiation limits follow the standard's own units", () => {
  it("the SPE limit is 250 mGy-Eq over 30 days, not 250 mSv per event", () => {
    expect(radiation.solarParticleEvent30DayLimitMGyEq.value).toBe(250);
    expect(radiation.solarParticleEvent30DayLimitMGyEq.unit).toBe("mGy-Eq");
  });

  it("the career limit stays 600 mSv", () => {
    expect(radiation.careerLimitMSv.value).toBe(600);
    expect(radiation.careerLimitMSv.unit).toBe("mSv");
  });
});

describe("mass margin follows the four Ames review milestones", () => {
  it("is 30/20/15/5 from SRR through SIR", () => {
    expect(requiredMarginFraction("srr")).toBe(0.3);
    expect(requiredMarginFraction("pdr")).toBe(0.2);
    expect(requiredMarginFraction("cdr")).toBe(0.15);
    expect(requiredMarginFraction("sir")).toBe(0.05);
  });

  it("margin only ever loosens as the design matures", () => {
    const schedule = (["srr", "pdr", "cdr", "sir"] as const).map(requiredMarginFraction);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i]!).toBeLessThan(schedule[i - 1]!);
    }
  });

  it("contingency by maturity is 25/15/7.5/4/2", () => {
    expect(management.contingencyConceptFraction.value).toBe(0.25);
    expect(management.contingencyDesignFraction.value).toBe(0.15);
    expect(management.contingencyPriorBuildFraction.value).toBe(0.075);
    expect(management.contingencyFabricationFraction.value).toBe(0.04);
    expect(management.contingencyFlightFraction.value).toBe(0.02);
  });
});
