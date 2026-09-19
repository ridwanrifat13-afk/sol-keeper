/**
 * Derives the six resource readouts — status, fraction, and Reality-Dial-level text — from
 * a `SimState`. Both OperateView (live) and DebriefView (after the fact) need exactly these
 * same numbers computed exactly the same way; this is the one place that computation lives,
 * so a status shown mid-mission and the same status shown in the debrief can never disagree.
 */
import {
  crew as crewConstants,
  rationKgPerCrewDay,
  survivalModes,
  type SimState,
} from "@sol-keeper/sim";
import {
  statusFromBand,
  statusFromCeiling,
  statusFromReserve,
  type StatusPresentation,
} from "../components/status.js";
import { survivalModeLabel } from "./labels.js";
import {
  presentBattery,
  presentCabin,
  presentCo2,
  presentFood,
  presentOxygen,
  presentWater,
  type GaugeText,
} from "./present.js";
import type { DialLevel } from "./types.js";

export interface ResourceReadout {
  readonly status: StatusPresentation;
  readonly fraction: number;
  readonly text: GaugeText;
}

export interface ResourceSummary {
  readonly livingCrew: number;
  readonly waterDays: number;
  readonly foodDays: number;
  readonly oxygen: ResourceReadout;
  readonly co2: ResourceReadout;
  readonly water: ResourceReadout;
  readonly food: ResourceReadout;
  readonly battery: ResourceReadout;
  readonly cabin: ResourceReadout;
}

export function buildResourceSummary(state: SimState, level: DialLevel): ResourceSummary {
  const living = state.crew.filter((c) => c.alive).length;
  const mode = survivalModes[state.food.mode];

  const waterDays =
    living > 0 ? state.water.potableKg / (living * crewConstants.waterUseTotalKgPerCrewDay.value) : 0;
  const foodDays =
    living > 0 ? state.food.storedDryMassKg / (living * rationKgPerCrewDay(state.food.mode)) : 0;

  const batteryFraction = state.power.batteryEnergyKwh / state.power.batteryCapacityKwh;

  const o2Status = statusFromBand(state.atmosphere.o2PartialPressureMmHg, 120, 200);
  const co2Status = statusFromCeiling(
    state.atmosphere.co2PartialPressureMmHg,
    mode.co2LimitMmHg.value,
  );
  const waterStatus = statusFromReserve(Math.min(1, waterDays / 30));
  const foodStatus = statusFromReserve(Math.min(1, foodDays / 30));
  const batteryStatus = statusFromReserve(batteryFraction);
  const cabinStatus = statusFromBand(state.thermal.habitatTempC, mode.habitatTempC.value - 6, 30);

  return {
    livingCrew: living,
    waterDays,
    foodDays,
    oxygen: {
      status: o2Status,
      fraction: state.atmosphere.o2PartialPressureMmHg / 200,
      text: presentOxygen(level, o2Status.level, state.atmosphere.o2Kg),
    },
    co2: {
      status: co2Status,
      fraction: state.atmosphere.co2PartialPressureMmHg / mode.co2LimitMmHg.value,
      text: presentCo2(level, co2Status.level, mode.co2LimitMmHg.value, survivalModeLabel(state.food.mode, level)),
    },
    water: {
      status: waterStatus,
      fraction: Math.min(1, waterDays / 30),
      text: presentWater(level, waterStatus.level, waterDays),
    },
    food: {
      status: foodStatus,
      fraction: Math.min(1, foodDays / 30),
      text: presentFood(level, foodStatus.level, foodDays, state.food.cumulativeHarvestKg),
    },
    battery: {
      status: batteryStatus,
      fraction: batteryFraction,
      text: presentBattery(
        level,
        batteryStatus.level,
        state.power.generationKw,
        state.power.servedKw,
        state.power.demandKw,
      ),
    },
    cabin: {
      status: cabinStatus,
      fraction: Math.max(0, Math.min(1, (state.thermal.habitatTempC + 10) / 40)),
      text: presentCabin(level, cabinStatus.level, state.environment.outsideTempC, state.environment.isDaylight),
    },
  };
}
