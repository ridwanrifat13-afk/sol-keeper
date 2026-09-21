/**
 * risk.ts had no test at all before the Launch Packing screen (M6) started depending on
 * it — these pin its arithmetic against the sourced constants directly, the same way every
 * other model in this package is checked, rather than trusting a UI to exercise it.
 */
import { describe, expect, it } from "vitest";
import { management } from "../data/constants.js";
import { contingencyFraction, failureRatePerHour, requiredMarginFraction, riskBand } from "../engine/risk.js";

describe("failureRatePerHour", () => {
  it("at TRL 9 equals the base rate exactly (the penalty exponent is zero)", () => {
    expect(failureRatePerHour(9)).toBeCloseTo(management.trlBaseFailureRatePerHour.value, 12);
  });

  it("a lower TRL multiplies in the penalty once per level below 9", () => {
    const base = management.trlBaseFailureRatePerHour.value;
    const penalty = management.trlFailureRatePenaltyPerLevel.value;
    expect(failureRatePerHour(8)).toBeCloseTo(base * penalty, 12);
    expect(failureRatePerHour(1)).toBeCloseTo(base * Math.pow(penalty, 8), 12);
  });

  it("clamps out-of-range TRL to 1..9 rather than extrapolating", () => {
    expect(failureRatePerHour(0)).toBeCloseTo(failureRatePerHour(1), 12);
    expect(failureRatePerHour(10)).toBeCloseTo(failureRatePerHour(9), 12);
  });

  it("failure rate strictly increases as TRL drops — lower maturity is never safer", () => {
    for (let trl = 9; trl > 1; trl--) {
      expect(failureRatePerHour(trl - 1)).toBeGreaterThan(failureRatePerHour(trl));
    }
  });
});

describe("contingencyFraction", () => {
  it("reads each maturity stage from its own sourced constant", () => {
    expect(contingencyFraction("concept")).toBe(management.contingencyConceptFraction.value);
    expect(contingencyFraction("design")).toBe(management.contingencyDesignFraction.value);
    expect(contingencyFraction("priorBuild")).toBe(management.contingencyPriorBuildFraction.value);
    expect(contingencyFraction("fabrication")).toBe(management.contingencyFabricationFraction.value);
    expect(contingencyFraction("flight")).toBe(management.contingencyFlightFraction.value);
  });

  it("contingency shrinks monotonically from concept to flight — the whole teaching point", () => {
    const stages = ["concept", "design", "priorBuild", "fabrication", "flight"] as const;
    const fractions = stages.map(contingencyFraction);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]!).toBeLessThan(fractions[i - 1]!);
    }
  });
});

describe("requiredMarginFraction", () => {
  it("reads each review phase from its own sourced constant", () => {
    expect(requiredMarginFraction("srr")).toBe(management.marginSrrFraction.value);
    expect(requiredMarginFraction("pdr")).toBe(management.marginPdrFraction.value);
    expect(requiredMarginFraction("cdr")).toBe(management.marginCdrFraction.value);
    expect(requiredMarginFraction("sir")).toBe(management.marginSirFraction.value);
  });

  it("required margin shrinks monotonically from SRR to SIR", () => {
    const phases = ["srr", "pdr", "cdr", "sir"] as const;
    const fractions = phases.map(requiredMarginFraction);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]!).toBeLessThan(fractions[i - 1]!);
    }
  });
});

describe("riskBand", () => {
  it("bands the 5x5 matrix by the likelihood x consequence product", () => {
    expect(riskBand(1, 1)).toBe("low");
    expect(riskBand(2, 3)).toBe("medium"); // score 6
    expect(riskBand(5, 5)).toBe("high"); // score 25
    expect(riskBand(3, 5)).toBe("high"); // score 15, the documented high threshold
  });

  it("clamps out-of-range inputs to the 1..5 grid rather than throwing", () => {
    expect(riskBand(0, 0)).toBe("low");
    expect(riskBand(9, 9)).toBe("high");
  });
});
