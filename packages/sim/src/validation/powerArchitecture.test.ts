/**
 * engine/powerArchitecture.ts's sizing, regression-anchored against the two existing
 * scenarios' own hand-derived numbers (first-light's battery comment, the-long-night's real
 * fission setup) so a future change to the underlying constants can't silently drift this
 * without a test noticing.
 */
import { describe, expect, it } from "vitest";
import { sizePowerArchitecture } from "../engine/powerArchitecture.js";
import { LANDING_SITES } from "../data/landingSites.js";
import { power as powerConstants } from "../data/constants.js";

// first-light's own real peak demand — see data/scenarios/firstLight.ts's systems list and
// its own battery-sizing comment (4646 kWh at 80% depth of discharge for a 354h night).
const FIRST_LIGHT_PEAK_DEMAND_KW = 0.1 + 0.4 + 0.6 + 7.0 + 1.0 + 0.5 + 0.3 + 0.6;

// the-long-night's own real peak demand — see data/scenarios/theLongNight.ts's systems list.
const LONG_NIGHT_PEAK_DEMAND_KW = 0.1 + 0.8 + 1.2 + 8.0 + 2.0 + 0.9 + 0.5 + 1.2;

describe("sizePowerArchitecture", () => {
  it("solarBattery: battery capacity matches first-light's own hand-derived 4646 kWh, for a site sharing its 354h night", () => {
    // MOON-EQUATORIAL's maxDarkHours (354h, environment.lunarNightHours) is the same real
    // figure first-light's own comment is built on, even though first-light's own scenario
    // file uses a different (placeholder) "Shackleton Ridge" site — this test is checking the
    // sizing FORMULA against a known-correct worked example, not first-light's exact site.
    const site = LANDING_SITES["MOON-EQUATORIAL"];
    const sized = sizePowerArchitecture("solarBattery", FIRST_LIGHT_PEAK_DEMAND_KW, site, "moon");
    // first-light's own comment: "3717 kWh, or 4646 kWh at 80% depth of discharge" for 10.5 kW
    // over 354h. Allow a small tolerance for the peak-demand figure's own rounding.
    expect(sized.batteryCapacityKwh).toBeCloseTo(4646, 0);
    expect(sized.batteryEnergyKwh).toBe(sized.batteryCapacityKwh);
    expect(sized.fissionReactorKwe).toBe(0);
    expect(sized.solarArrayAreaM2).toBeGreaterThan(0);
  });

  it("solarBattery: the sized array actually generates at least the margin-adjusted target on the Moon", () => {
    const site = LANDING_SITES["MOON-EQUATORIAL"];
    const sized = sizePowerArchitecture("solarBattery", 10, site, "moon");
    const generatedKw =
      (sized.solarArrayAreaM2 * powerConstants.solarConstant1AuWPerM2.value * powerConstants.cellEfficiencyFraction.value) /
      1000;
    expect(generatedKw).toBeCloseTo(10 * powerConstants.setupArrayMarginFraction.value, 3);
  });

  it("fission: reactor is the real, non-scaling NASA-FSP figure regardless of demand", () => {
    const site = LANDING_SITES["MOON-EQUATORIAL"];
    const sizedSmall = sizePowerArchitecture("fission", 5, site, "moon");
    const sizedBig = sizePowerArchitecture("fission", LONG_NIGHT_PEAK_DEMAND_KW, site, "moon");
    expect(sizedSmall.fissionReactorKwe).toBe(powerConstants.fissionSurfacePowerKwe.value);
    expect(sizedBig.fissionReactorKwe).toBe(powerConstants.fissionSurfacePowerKwe.value);
    expect(sizedSmall.solarArrayAreaM2).toBe(0);
  });

  it("fission: buffer battery is the same order of magnitude as the-long-night's own real 80 kWh buffer", () => {
    const site = LANDING_SITES["MOON-EQUATORIAL"];
    const sized = sizePowerArchitecture("fission", LONG_NIGHT_PEAK_DEMAND_KW, site, "moon");
    // the-long-night's own real setup: 80 kWh capacity against 14.7 kW peak demand (~5.4h).
    // fissionBufferHours (6h) is a deliberately rounded constant, not meant to reproduce this
    // exactly — a loose sanity range, not an exact-match regression.
    expect(sized.batteryCapacityKwh).toBeGreaterThan(60);
    expect(sized.batteryCapacityKwh).toBeLessThan(100);
  });

  it("hybrid: keeps the full reactor and adds a daytime-only array, smaller than solarBattery's", () => {
    const site = LANDING_SITES["MOON-EQUATORIAL"];
    const hybrid = sizePowerArchitecture("hybrid", FIRST_LIGHT_PEAK_DEMAND_KW, site, "moon");
    const solarOnly = sizePowerArchitecture("solarBattery", FIRST_LIGHT_PEAK_DEMAND_KW, site, "moon");
    expect(hybrid.fissionReactorKwe).toBe(powerConstants.fissionSurfacePowerKwe.value);
    expect(hybrid.solarArrayAreaM2).toBeGreaterThan(0);
    expect(hybrid.solarArrayAreaM2).toBeLessThan(solarOnly.solarArrayAreaM2);
  });

  it("solarBattery: a Mars site needs a larger array than a Moon site for the same demand (weaker irradiance)", () => {
    const marsSite = LANDING_SITES["MARS-JEZERO"];
    const moonSite = LANDING_SITES["MOON-EQUATORIAL"];
    const mars = sizePowerArchitecture("solarBattery", 10, marsSite, "mars");
    const moon = sizePowerArchitecture("solarBattery", 10, moonSite, "moon");
    expect(mars.solarArrayAreaM2).toBeGreaterThan(moon.solarArrayAreaM2);
  });
});
