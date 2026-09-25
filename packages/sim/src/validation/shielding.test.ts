import { describe, expect, it } from "vitest";
import { sizeShielding } from "../engine/shielding.js";
import { habitat, management } from "../data/constants.js";

describe("sizeShielding", () => {
  it("hullOnly adds nothing — the base scenario's own numbers stand unchanged", () => {
    const sized = sizeShielding("hullOnly");
    expect(sized.shieldingGPerCm2Delta).toBe(0);
    expect(sized.potableWaterKgDelta).toBe(0);
    expect(sized.constructionCrewHours).toBe(0);
  });

  it("waterWall adds launched water mass, no direct shielding delta or crew-hours — the existing per-tick water-wall formula does the rest", () => {
    const sized = sizeShielding("waterWall");
    expect(sized.potableWaterKgDelta).toBe(2000);
    expect(sized.shieldingGPerCm2Delta).toBe(0);
    expect(sized.constructionCrewHours).toBe(0);
    // Sanity check against the constant's own note: "a full 2000 kg tank adds about 5 g/cm^2".
    const impliedGPerCm2 = sized.potableWaterKgDelta * habitat.waterWallShieldingGPerCm2PerKg.value;
    expect(impliedGPerCm2).toBeCloseTo(5, 1);
  });

  it("regolithBerm adds a direct shielding delta and crew-hours, no launched mass", () => {
    const sized = sizeShielding("regolithBerm");
    expect(sized.shieldingGPerCm2Delta).toBe(habitat.regolithBermShieldingGPerCm2.value);
    expect(sized.potableWaterKgDelta).toBe(0);
    expect(sized.constructionCrewHours).toBe(management.regolithBermConstructionCrewHours.value);
    expect(sized.constructionCrewHours).toBeGreaterThan(0);
  });
});
