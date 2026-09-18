/**
 * The case for the Brine Processor Assembly, in one number: over a 500-day mission with
 * 4 crew, moving recovery from 93.5% to 98% saves about 390 kg of launched water.
 */
import { describe, expect, it } from "vitest";
import { crew, lifeSupport } from "../data/constants.js";
import { missionWaterLossKg } from "../models/water.js";

describe("water loop validation", () => {
  const crewSize = 4;
  const days = 500;
  const dailyUse = crew.waterUseTotalKgPerCrewDay.value;

  it("loses about 565 kg at 93.5% recovery", () => {
    const lossKg = missionWaterLossKg(
      crewSize,
      days,
      dailyUse,
      lifeSupport.waterRecoveryFractionBaseline.value,
    );
    expect(lossKg).toBeCloseTo(565.5, 1);
  });

  it("loses about 174 kg at 98% recovery", () => {
    const lossKg = missionWaterLossKg(
      crewSize,
      days,
      dailyUse,
      lifeSupport.waterRecoveryFractionWithBrineProcessor.value,
    );
    expect(lossKg).toBeCloseTo(174, 1);
  });

  it("the brine processor saves roughly 390 kg on this mission", () => {
    const baseline = missionWaterLossKg(
      crewSize,
      days,
      dailyUse,
      lifeSupport.waterRecoveryFractionBaseline.value,
    );
    const improved = missionWaterLossKg(
      crewSize,
      days,
      dailyUse,
      lifeSupport.waterRecoveryFractionWithBrineProcessor.value,
    );
    expect(baseline - improved).toBeCloseTo(391.5, 1);
  });

  it("closing the loop beats open-loop resupply by a wide margin", () => {
    const openLoopKg = crewSize * days * lifeSupport.openLoopResupplyKgPerCrewDay.value;
    const closedLoopKg = missionWaterLossKg(
      crewSize,
      days,
      dailyUse,
      lifeSupport.waterRecoveryFractionWithBrineProcessor.value,
    );
    expect(openLoopKg).toBe(20000);
    expect(closedLoopKg).toBeLessThan(openLoopKg / 100);
  });
});
