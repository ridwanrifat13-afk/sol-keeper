/**
 * The headline number of human Mars exploration: a 360-day cruise at the MSL RAD cruise
 * dose rate already exceeds the NASA-STD-3001 career limit, before any time on the surface.
 * That is the fact the Reality Dial's Commander level is meant to let a student verify.
 */
import { describe, expect, it } from "vitest";
import { radiation } from "../data/constants.js";
import {
  effectiveShieldingGPerCm2,
  gcrTransmission,
  speTransmission,
} from "../models/radiation.js";

describe("radiation validation", () => {
  it("360 days of cruise exceeds the 600 mSv career limit", () => {
    const cruiseDays = 360;
    const doseMSv = cruiseDays * radiation.deepSpaceCruiseMSvPerDay.value;

    expect(doseMSv).toBeCloseTo(662.4, 1);
    expect(doseMSv).toBeGreaterThan(radiation.careerLimitMSv.value);
  });

  it("surface rates sit below the cruise rate", () => {
    expect(radiation.marsSurfaceMSvPerDay.value).toBeLessThan(
      radiation.deepSpaceCruiseMSvPerDay.value,
    );
    expect(radiation.moonSurfaceMSvPerDay.value).toBeLessThan(
      radiation.deepSpaceCruiseMSvPerDay.value,
    );
  });

  it("Mars surface dose is far above Earth background", () => {
    const marsPerYear = radiation.marsSurfaceMSvPerDay.value * 365;
    expect(marsPerYear / radiation.earthBackgroundMSvPerYear.value).toBeGreaterThan(50);
  });

  describe("shielding curves behave as the two regimes require", () => {
    it("solar particle event dose falls steeply with areal density", () => {
      expect(speTransmission(0)).toBeCloseTo(1, 5);
      // An order of magnitude knocked off by roughly 20 g/cm^2.
      expect(speTransmission(20)).toBeLessThan(0.1);
      expect(speTransmission(40)).toBeLessThan(speTransmission(20));
    });

    it("cosmic ray dose falls weakly and saturates above a floor", () => {
      expect(gcrTransmission(0)).toBeCloseTo(1, 5);
      expect(gcrTransmission(20)).toBeGreaterThan(0.6);
      // No achievable thickness removes it: the curve flattens onto the floor.
      const deep = gcrTransmission(500);
      expect(deep).toBeGreaterThan(radiation.gcrSaturationFloorFraction.value - 0.001);
      expect(gcrTransmission(1000) - deep).toBeGreaterThan(-0.01);
    });

    it("cosmic rays are always harder to stop than a solar particle event", () => {
      for (const x of [5, 10, 20, 50]) {
        expect(gcrTransmission(x)).toBeGreaterThan(speTransmission(x));
      }
    });
  });

  it("the storm shelter is meaningfully better than the open habitat", () => {
    const habitat = effectiveShieldingGPerCm2("habitat", 10);
    const shelter = effectiveShieldingGPerCm2("stormShelter", 10);
    const eva = effectiveShieldingGPerCm2("eva", 10);

    expect(shelter).toBeGreaterThan(habitat);
    expect(eva).toBeLessThan(habitat);
    expect(speTransmission(shelter)).toBeLessThan(speTransmission(habitat) / 2);
  });
});
