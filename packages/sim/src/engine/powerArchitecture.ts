/**
 * M9: sizing a player-chosen power architecture at setup time, not a tick-by-tick model —
 * `models/power.ts`'s `powerStage` already generates/allocates power hour by hour from
 * whatever `Scenario.initial` says; this is the one-time function that decides what those
 * starting numbers should be, given a real site and a real peak demand.
 *
 * Every input this needs is already a real, sourced constant (`data/constants.ts`'s `power`
 * group) except the two setup-only sizing margins declared right there alongside them
 * (`setupArrayMarginFraction`, `fissionBufferHours`) — deliberately not reverse-engineered
 * from the three existing scenarios' own array/battery numbers, whose exact ratios this
 * project has no record of the original reasoning for; see those constants' own notes.
 */
import { environment, power as powerConstants } from "../data/constants.js";
import { solarGenerationKw } from "../models/power.js";
import type { Body, LandingSite, PowerArchitecture } from "../types.js";
import { irradianceAtAu } from "../units.js";

export interface SizedPowerArchitecture {
  readonly solarArrayAreaM2: number;
  readonly fissionReactorKwe: number;
  readonly batteryEnergyKwh: number;
  readonly batteryCapacityKwh: number;
}

/** Top-of-surface solar irradiance at a body, W/m^2 — Mars via the inverse-square law at its
 *  real mean distance; the Moon shares Earth's 1 AU distance, so the solar constant applies
 *  directly (no distance penalty), matching `first-light`'s own "full 1361 W/m^2" comment. */
function surfaceIrradianceWPerM2(body: Body): number {
  if (body === "moon") return powerConstants.solarConstant1AuWPerM2.value;
  return irradianceAtAu(powerConstants.solarConstant1AuWPerM2.value, environment.marsMeanDistanceAu.value);
}

/** The array area that generates `targetKw` at this body's surface irradiance — the inverse
 *  of `models/power.ts`'s own `solarGenerationKw`, so a setup-time sizing choice and the
 *  tick-by-tick generation it produces can never quietly drift apart. */
function areaForGenerationKw(targetKw: number, body: Body): number {
  const irradianceWPerM2 = surfaceIrradianceWPerM2(body);
  if (irradianceWPerM2 <= 0) return 0;
  // solarGenerationKw(area, irr) = wattsToKw(area * irr * cellEfficiency); solve for area at
  // a trial area of 1 m^2 and scale, rather than duplicating the efficiency term here — one
  // formula, not two copies that could drift.
  const kwPerM2 = solarGenerationKw(1, irradianceWPerM2);
  if (kwPerM2 <= 0) return 0;
  return targetKw / kwPerM2;
}

/**
 * Sizes a player-chosen `PowerArchitecture` for a given peak demand, site, and body. Pure —
 * no DOM/fetch/Date.now/Math.random (brief rule 2) — called once at mission setup
 * (`engine/setup.ts`'s `buildCustomScenario`), never during a tick.
 */
export function sizePowerArchitecture(
  architecture: PowerArchitecture,
  peakDemandKw: number,
  site: LandingSite,
  body: Body,
): SizedPowerArchitecture {
  const dod = powerConstants.batteryDepthOfDischargeFraction.value;
  // Unlike solarBattery's night-survival bank below, the fission/hybrid buffer is never meant
  // to be deep-cycled (the reactor recharges it continuously) — sized as plain hours of peak
  // demand, not divided by depth-of-discharge, matching how the-long-night's own real fission
  // setup actually sits (80 kWh capacity against a 14.7 kW peak, ~5.4h, not (~5.4/0.8)h).
  const fissionBufferKwh = peakDemandKw * powerConstants.fissionBufferHours.value;

  if (architecture === "fission") {
    return {
      solarArrayAreaM2: 0,
      fissionReactorKwe: powerConstants.fissionSurfacePowerKwe.value,
      batteryCapacityKwh: fissionBufferKwh,
      batteryEnergyKwh: fissionBufferKwh,
    };
  }

  if (architecture === "hybrid") {
    // No sourced smaller-reactor mass exists to invent a scaled-down unit (the NASA-FSP
    // figure states one 40 kWe/6000 kg design, not a family) — hybrid uses the same full
    // reactor as fission-only, plus a partial array sized to daytime demand only, as
    // redundancy/duty-cycle relief rather than a cost saving. Disclose this in setup UI copy.
    const dayArrayAreaM2 = areaForGenerationKw(peakDemandKw, body);
    const bufferKwh = fissionBufferKwh;
    return {
      solarArrayAreaM2: dayArrayAreaM2,
      fissionReactorKwe: powerConstants.fissionSurfacePowerKwe.value,
      batteryCapacityKwh: bufferKwh,
      batteryEnergyKwh: bufferKwh,
    };
  }

  // solarBattery: array sized with headroom (setupArrayMarginFraction) for same-day battery
  // recharge and dust/inefficiency losses; battery sized to cover the site's own longest dark
  // stretch (maxDarkHours) at full peak demand — literally first-light's own hand-derived
  // "4646 kWh at 80% depth of discharge" comment, generalized to any site/demand.
  const arrayAreaM2 = areaForGenerationKw(peakDemandKw * powerConstants.setupArrayMarginFraction.value, body);
  const nightCapacityKwh = (peakDemandKw * site.maxDarkHours.value) / dod;
  return {
    solarArrayAreaM2: arrayAreaM2,
    fissionReactorKwe: 0,
    batteryCapacityKwh: nightCapacityKwh,
    batteryEnergyKwh: nightCapacityKwh,
  };
}
