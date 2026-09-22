/**
 * Stage 6 — food.
 *
 * Stored rations deplete at a rate set by the selected survival mode; crop trays accumulate
 * lit hours only while the greenhouse actually has power, so a long brownout shows up weeks
 * later as a missed harvest. That delay is the point — it is what the Black Box exists to
 * make visible.
 */
import { food as foodConstants, physics, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import type { CropTray } from "../types.js";
import { clamp, daysToHours, perDayToPerHour } from "../units.js";

/** Cycle length in days for a crop. */
export function cropCycleDays(crop: CropTray["crop"]): number {
  switch (crop) {
    case "lettuce":
      return foodConstants.cropCycleDaysLettuce.value;
    case "wheat":
      return foodConstants.cropCycleDaysWheat.value;
    case "soybean":
      return foodConstants.cropCycleDaysSoybean.value;
    case "potato":
      return foodConstants.cropCycleDaysPotato.value;
  }
}

/** Lit hours a tray needs before it can be harvested. */
export function cropRequiredLightHours(crop: CropTray["crop"]): number {
  return (daysToHours(cropCycleDays(crop)) * foodConstants.cropLightHoursPerDay.value) / 24;
}

/**
 * Dry mass yielded by a tray. Derived from the crop-area figure: if `cropAreaPerPersonFullDiet`
 * square metres feed one person, then one square metre yields that share of a daily ration
 * across a full cycle.
 */
export function trayHarvestKg(tray: CropTray): number {
  const perM2PerDay = 0.62 / foodConstants.cropAreaPerPersonFullDietM2.value; // kg/day per m^2, full-diet basis
  return perM2PerDay * tray.areaM2 * cropCycleDays(tray.crop) * tray.healthFraction;
}

/** Daily ration mass for the selected mode, scaled from the nominal BVAD figure by calories. */
export function rationKgPerCrewDay(mode: keyof typeof survivalModes): number {
  const kcal = survivalModes[mode].kcalPerCrewDay.value;
  return kcal / physics.kcalPerKgFoodDryMass.value;
}

export function foodStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const f = state.food;
  const living = state.crew.filter((c) => c.alive).length;

  const eatenKg = living * perDayToPerHour(rationKgPerCrewDay(f.mode)) * ctx.dtHours;
  if (eatenKg <= f.storedDryMassKg) {
    f.storedDryMassKg -= eatenKg;
    f.intakeFraction = 1;
  } else {
    // The starvation clock (crewStage) needs to know this hour's actual ration, not just
    // that stores hit zero — see WaterState.intakeFraction for the same reasoning.
    f.intakeFraction = eatenKg > 0 ? clamp(f.storedDryMassKg / eatenKg, 0, 1) : 1;
    f.storedDryMassKg = 0;
    log.logEdge({
      kind: "crew",
      severity: "critical",
      code: "food.exhausted",
      data: { crew: living, mode: f.mode },
    });
  }

  // Crops only grow when the greenhouse is lit.
  const greenhouse = state.systems.greenhouse;
  const lit = greenhouse !== undefined && greenhouse.operational && greenhouse.poweredThisHour;
  for (const tray of f.trays) {
    if (!lit) continue;
    tray.lightHours += ctx.dtHours;

    const required = cropRequiredLightHours(tray.crop);
    if (tray.lightHours >= required) {
      const harvestKg = trayHarvestKg(tray);
      f.storedDryMassKg += harvestKg;
      f.cumulativeHarvestKg += harvestKg;
      tray.lightHours = 0;
      log.log({
        kind: "milestone",
        severity: "info",
        code: "food.harvest",
        system: "greenhouse",
        data: { tray: tray.id, crop: tray.crop, harvestKg: round(harvestKg) },
      });
    }
  }

  if (!lit && greenhouse !== undefined && greenhouse.operational) {
    log.logEdge({
      kind: "resource",
      severity: "caution",
      code: "food.growLightsOff",
      system: "greenhouse",
      data: { trays: f.trays.length },
    });
  }

  for (const tray of f.trays) {
    tray.healthFraction = clamp(tray.healthFraction, 0, 1);
  }

  const daysRemaining =
    living > 0 ? f.storedDryMassKg / (living * rationKgPerCrewDay(f.mode)) : Infinity;
  if (daysRemaining < 5 && living > 0) {
    log.logEdge({
      kind: "resource",
      severity: daysRemaining < 2 ? "critical" : "warning",
      code: "food.lowReserve",
      data: { daysRemaining: round(daysRemaining), storedKg: round(f.storedDryMassKg) },
    });
  }
}

const round = (x: number): number => Math.round(x * 100) / 100;
