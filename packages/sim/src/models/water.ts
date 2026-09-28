/**
 * Stage 5 — water loop.
 *
 * Water is the resource that teaches closure: at 93.5% recovery a 500-day mission loses
 * 565 kg, at 98% it loses 174 kg, and that difference is the whole argument for the Brine
 * Processor Assembly. Stored water also doubles as radiation shielding, so spending it
 * makes the crew more exposed — see the radiation model.
 */
import { habitat, lifeSupport, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import type { WaterReclamationMode } from "../types.js";
import { clamp, perDayToPerHour } from "../units.js";

const clamp01 = (x: number): number => clamp(x, 0, 1);

/**
 * Water lost over a mission, given the recovery fraction. Pure arithmetic, exported so the
 * validation tests and the Prepare-view planner can both call it. Pre-mission ESM/Launch-
 * Packing sizing deliberately keeps using `crew.waterUseTotalKgPerCrewDay` (the BVAD-2022
 * total-use figure) as its own `dailyUseKgPerCrew` input — a mission is packed and launched
 * assuming nominal operation, not planned around a rationing mode nobody's chosen yet.
 */
export function missionWaterLossKg(
  crewSize: number,
  days: number,
  dailyUseKgPerCrew: number,
  recoveryFraction: number,
): number {
  return crewSize * days * dailyUseKgPerCrew * (1 - recoveryFraction);
}

/**
 * Daily water ration for the selected survival mode — OCHMO-TB047's own per-mode figure
 * (`survivalModes[mode].waterLitersPerCrewDay`), the exact same source and shape as
 * `food.ts`'s `rationKgPerCrewDay`. 1 L of water is 1 kg (density ~1.00 kg/L at habitat
 * temperature) — a physical equivalence, not a tuned conversion, so the constant's own L
 * figure is used directly as a kg rate.
 */
export function waterRationKgPerCrewDay(mode: keyof typeof survivalModes): number {
  return survivalModes[mode].waterLitersPerCrewDay.value;
}

/** Player request (M9.x, batch 2): the real capacity behind WaterReclamationMode — both
 *  figures were already sourced and declared in constants.ts (NASA-WATER-2023) but never
 *  read by any model until now. Exported so the Life Support console can show the exact
 *  recovery percentage each mode promises, the same pattern
 *  models/atmosphere.ts's own co2ScrubberDutyCycleFraction already uses. */
export function waterReclamationFraction(mode: WaterReclamationMode): number {
  return mode === "brineProcessor"
    ? lifeSupport.waterRecoveryFractionWithBrineProcessor.value
    : lifeSupport.waterRecoveryFractionBaseline.value;
}

export function waterStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const w = state.water;
  const living = state.crew.filter((c) => c.alive).length;

  const recovery = state.systems.waterRecovery;
  // M7.7 §2: an improvised (spares-short) repair leaves a permanent efficiencyPenaltyFraction
  // on the repaired system — consumed here as the recovery loop's own output cut. M9.x (batch
  // 2): the baseline fraction is now whichever WaterReclamationMode the player has chosen.
  w.recoveryFraction =
    recovery !== undefined && recovery.operational && recovery.poweredThisHour
      ? waterReclamationFraction(w.reclamationMode) * (1 - recovery.efficiencyPenaltyFraction)
      : 0;

  // M9.x (player request #7): rationing already had a real, sourced per-mode water figure
  // declared (OCHMO-TB047's own waterLitersPerCrewDay) but it sat unused — this hour's usage
  // always drew the flat nominal-mode rate regardless of which mode was actually selected, so
  // switching to mode1/mode2 cut food and warmth but never actually stretched the water
  // supply. Wired in the same way food.ts/thermal.ts already read the mode's own figure.
  const usedKg =
    living * perDayToPerHour(waterRationKgPerCrewDay(state.food.mode)) * ctx.dtHours;
  const recoveredKg = usedKg * w.recoveryFraction;
  const lostKg = usedKg - recoveredKg;

  // The crew's actual intake this hour may fall short of `usedKg` if the tank plus recovery
  // can't cover it — the hydration clock (crewStage) needs to know that shortfall, not just
  // the tank level afterward, which alone can't distinguish "ran dry this hour" from
  // "already dry and stayed dry".
  const actuallyAvailableKg = w.potableKg + recoveredKg;
  w.intakeFraction = usedKg > 0 ? clamp01(actuallyAvailableKg / usedKg) : 1;

  w.potableKg = Math.max(0, w.potableKg - usedKg + recoveredKg);
  w.cumulativeLossKg += lostKg;

  // Electrolysis: making oxygen costs water and a lot of power. It is regulated against the
  // cabin set point rather than run flat out — otherwise the habitat drifts to a fire-risk
  // oxygen partial pressure while burning water it cannot spare.
  const generator = state.systems.oxygenGenerator;
  const needsOxygen =
    state.atmosphere.o2PartialPressureMmHg < habitat.targetO2PartialPressureMmHg.value;

  if (generator !== undefined && generator.operational && generator.poweredThisHour && needsOxygen) {
    const energyKwh = generator.nominalPowerKw * ctx.dtHours;
    const o2Kg =
      (energyKwh / lifeSupport.electrolysisEnergyKwhPerKgO2Practical.value) *
      (1 - generator.efficiencyPenaltyFraction);
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

  if (recovery !== undefined && !recovery.poweredThisHour && recovery.operational) {
    log.logEdge({
      kind: "resource",
      severity: "warning",
      code: "water.recoveryOffline",
      system: "waterRecovery",
      data: { lostPerHourKg: round(lostKg) },
    });
  }

  if (w.potableKg < living * waterRationKgPerCrewDay(state.food.mode)) {
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
