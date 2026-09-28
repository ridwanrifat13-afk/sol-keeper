/**
 * Player request #8: "visible lunar/mars environmental effects on food production." Cabin
 * CO2 speeding crop growth toward WHEELER-2024-CO2-SALAD's own documented beneficial range
 * (and never past it — see co2EnrichmentMaxGrowthBonusFraction's own note on why this sim
 * only models the "helps" half of the paper's real, non-monotonic finding).
 */
import { describe, expect, it } from "vitest";
import { food } from "../data/constants.js";
import { co2GrowthBonusFraction, co2Ppm } from "../models/food.js";

describe("co2Ppm", () => {
  it("matches the nominal-cabin ppm the constants themselves already document (~1 mmHg CO2 near 760 mmHg total)", () => {
    const ppm = co2Ppm(160, 1);
    expect(ppm).toBeGreaterThan(1000);
    expect(ppm).toBeLessThan(1600);
  });

  it("is 0 at 0 mmHg CO2", () => {
    expect(co2Ppm(160, 0)).toBe(0);
  });
});

describe("co2GrowthBonusFraction", () => {
  it("is 0 at 0 ppm", () => {
    expect(co2GrowthBonusFraction(0)).toBe(0);
  });

  it("peaks at the sourced beneficial ppm, at exactly the sourced max bonus", () => {
    const beneficial = food.co2EnrichmentBeneficialPpm.value;
    expect(co2GrowthBonusFraction(beneficial)).toBeCloseTo(food.co2EnrichmentMaxGrowthBonusFraction.value, 6);
  });

  it("ramps up monotonically from 0 to the beneficial point", () => {
    const beneficial = food.co2EnrichmentBeneficialPpm.value;
    const low = co2GrowthBonusFraction(beneficial * 0.25);
    const mid = co2GrowthBonusFraction(beneficial * 0.5);
    const high = co2GrowthBonusFraction(beneficial * 0.75);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(high).toBeLessThan(co2GrowthBonusFraction(beneficial));
  });

  it("ramps back down to 0 by the sourced super-elevated ppm, and stays 0 beyond it", () => {
    const superElevated = food.co2SuperElevatedPpm.value;
    expect(co2GrowthBonusFraction(superElevated)).toBeCloseTo(0, 6);
    expect(co2GrowthBonusFraction(superElevated * 2)).toBe(0);
  });

  it("never goes negative anywhere", () => {
    for (let ppm = 0; ppm <= 20000; ppm += 250) {
      expect(co2GrowthBonusFraction(ppm)).toBeGreaterThanOrEqual(0);
    }
  });
});
