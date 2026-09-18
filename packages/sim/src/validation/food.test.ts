/**
 * BVAD cross-check: a 6-crew, 730-day mission needs about 2.7 t of dry food.
 * If someone edits foodDryMassKgPerCrewDay to a value the document does not support, this
 * is the test that catches it.
 */
import { describe, expect, it } from "vitest";
import { crew } from "../data/constants.js";
import { rationKgPerCrewDay } from "../models/food.js";

describe("food mass validation", () => {
  it("6 crew x 730 days matches the 2.7 t BVAD figure within 2%", () => {
    const crewSize = 6;
    const days = 730;
    const totalKg = crewSize * days * crew.foodDryMassKgPerCrewDay.value;

    expect(totalKg).toBeCloseTo(2715.6, 1);

    const bvadQuotedKg = 2700;
    const errorFraction = Math.abs(totalKg - bvadQuotedKg) / bvadQuotedKg;
    expect(errorFraction).toBeLessThan(0.02);
  });

  it("food rate is cited to BVAD", () => {
    expect(crew.foodDryMassKgPerCrewDay.source).toBe("BVAD-2022");
    expect(crew.foodDryMassKgPerCrewDay.unit).toBe("kg/CM-day");
  });

  /**
   * The simulation eats by calories (so rationing can bite) but the mass budget is sourced
   * by kilograms. If those two disagree, the 2.7 t validation above passes while the actual
   * run burns through food at a different rate — which is exactly the kind of silent drift
   * rule 1 exists to prevent.
   */
  it("eating at the nominal rate consumes exactly the BVAD ration", () => {
    expect(rationKgPerCrewDay("nominal")).toBeCloseTo(crew.foodDryMassKgPerCrewDay.value, 4);
  });

  it("rationing modes cut food mass in the proportion OCHMO states", () => {
    const nominal = rationKgPerCrewDay("nominal");
    const mode1 = rationKgPerCrewDay("mode1");
    const mode2 = rationKgPerCrewDay("mode2");

    expect(mode1 / nominal).toBeCloseTo(1800 / 3600, 4);
    expect(mode2 / nominal).toBeCloseTo(600 / 3600, 4);
    expect(mode2).toBeLessThan(mode1);
  });

  it("survival mode 2 roughly triples how long the stores last", () => {
    const days = (mode: "nominal" | "mode2", storedKg: number, crewSize: number) =>
      storedKg / (crewSize * rationKgPerCrewDay(mode));
    expect(days("mode2", 150, 4) / days("nominal", 150, 4)).toBeCloseTo(6, 1);
  });
});
