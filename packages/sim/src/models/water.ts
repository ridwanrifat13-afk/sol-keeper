/**
 * Stage 5 — water loop.
 *
 * Water is the resource that teaches closure: at 93.5% recovery a 500-day mission loses
 * 565 kg, at 98% it loses 174 kg, and that difference is the whole argument for the Brine
 * Processor Assembly. Stored water also doubles as radiation shielding, so spending it
 * makes the crew more exposed — see the radiation model.
 */
import { crew as crewConstants, habitat, lifeSupport } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { perDayToPerHour } from "../units.js";

/**
 * Water lost over a mission, given the recovery fraction. Pure arithmetic, exported so the
 * validation tests and the Prepare-view planner can both call it.
 */
export function missionWaterLossKg(
  crewSize: number,
  days: number,
  dailyUseKgPerCrew: number,
  recoveryFraction: number,
): number {
  return crewSize * days * dailyUseKgPerCrew * (1 - recoveryFraction);
}

export function waterStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const w = state.water;
  const living = state.crew.filter((c) => c.alive).length;

  const recovery = state.systems.waterRecovery;
  w.recoveryFraction =
    recovery.operational && recovery.poweredThisHour
      ? lifeSupport.waterRecoveryFractionBaseline.value
      : 0;

  const usedKg =
    living * perDayToPerHour(crewConstants.waterUseTotalKgPerCrewDay.value) * ctx.dtHours;
  const recoveredKg = usedKg * w.recoveryFraction;
  const lostKg = usedKg - recoveredKg;

  w.potableKg = Math.max(0, w.potableKg - usedKg + recoveredKg);
  w.cumulativeLossKg += lostKg;

  // Electrolysis: making oxygen costs water and a lot of power. It is regulated against the
  // cabin set point rather than run flat out — otherwise the habitat drifts to a fire-risk
  // oxygen partial pressure while burning water it cannot spare.
  const generator = state.systems.oxygenGenerator;
  const needsOxygen =
    state.atmosphere.o2PartialPressureMmHg < habitat.targetO2PartialPressureMmHg.value;

  if (generator.operational && generator.poweredThisHour && needsOxygen) {
    const energyKwh = generator.nominalPowerKw * ctx.dtHours;
    const o2Kg = energyKwh / lifeSupport.electrolysisEnergyKwhPerKgO2Practical.value;
    const waterNeededKg = o2Kg * lifeSupport.electrolysisWaterPerO2KgPerKg.value;

    if (waterNeededKg <= w.potableKg) {
      w.potableKg -= waterNeededKg;
      state.atmosphere.o2Kg += o2Kg;
      state.isru.electrolysisO2ProducedKg += o2Kg;
    } else {
      log.logEdge({
        kind: "fault",
        severity: "critical",
        code: "water.insufficientForElectrolysis",
        system: "oxygenGenerator",
        data: { neededKg: round(waterNeededKg), availableKg: round(w.potableKg) },
      });
    }
  }

  if (!recovery.poweredThisHour && recovery.operational) {
    log.logEdge({
      kind: "resource",
      severity: "warning",
      code: "water.recoveryOffline",
      system: "waterRecovery",
      data: { lostPerHourKg: round(lostKg) },
    });
  }

  if (w.potableKg < living * crewConstants.waterUseTotalKgPerCrewDay.value) {
    log.logEdge({
      kind: "resource",
      severity: "critical",
      code: "water.belowOneDayReserve",
      data: { potableKg: round(w.potableKg), crew: living },
    });
  }

  // Stored water contributes shielding; spending it thins the water wall.
  state.radiation.shieldingGPerCm2 =
    ctx.scenario.initial.shieldingGPerCm2 +
    w.potableKg * habitat.waterWallShieldingGPerCm2PerKg.value;
}

const round = (x: number): number => Math.round(x * 100) / 100;
