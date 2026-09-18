/**
 * Scale check on MOXIE. It worked, it was a real milestone, and it was tiny: keeping one
 * person breathing takes about three of them running flat out.
 */
import { describe, expect, it } from "vitest";
import { crew, lifeSupport } from "../data/constants.js";
import { hourlyCrewO2Grams, moxiesPerCrewMember } from "../models/isru.js";
import { kgToGrams, perDayToPerHour } from "../units.js";

describe("ISRU validation", () => {
  it("one crew member needs about 35 g of oxygen per hour", () => {
    expect(hourlyCrewO2Grams()).toBeCloseTo(35, 1);
    expect(hourlyCrewO2Grams()).toBeCloseTo(
      kgToGrams(perDayToPerHour(crew.o2ConsumptionKgPerCrewDay.value)),
      9,
    );
  });

  it("that is about 2.9 MOXIEs at the 12 g/h peak rate", () => {
    expect(moxiesPerCrewMember()).toBeCloseTo(2.917, 2);
    expect(moxiesPerCrewMember()).toBeGreaterThan(2.5);
    expect(moxiesPerCrewMember()).toBeLessThan(3.5);
  });

  it("MOXIE's whole-mission output is under one hour of one crew member's demand", () => {
    expect(lifeSupport.moxieTotalProducedGrams.value).toBeLessThan(hourlyCrewO2Grams() * 4);
  });

  it("electrolysis stoichiometry is the textbook ratio", () => {
    // 2 H2O -> 2 H2 + O2 : 36.03 g water yields 32.00 g oxygen.
    expect(lifeSupport.electrolysisWaterPerO2KgPerKg.value).toBeCloseTo(36.03 / 32.0, 2);
  });

  it("the practical energy cost of electrolysis exceeds the thermodynamic minimum", () => {
    expect(lifeSupport.electrolysisEnergyKwhPerKgO2Practical.value).toBeGreaterThan(
      lifeSupport.electrolysisEnergyKwhPerKgO2Theoretical.value,
    );
  });
});
