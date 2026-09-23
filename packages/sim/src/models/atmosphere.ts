/**
 * Stage 4 — atmosphere.
 *
 * Crew breathe oxygen and exhale carbon dioxide; the scrubber removes CO2 when it has
 * power. Partial pressures come from the ideal gas law rather than a lookup, so the
 * Commander level of the Reality Dial can show the actual equation.
 */
import { crew as crewConstants, habitat, physics, physiology, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { partialPressureMmHg, perDayToPerHour } from "../units.js";

/** The CO2 partial-pressure limit for the currently selected rationing mode. */
export function co2LimitMmHg(mode: keyof typeof survivalModes): number {
  return survivalModes[mode].co2LimitMmHg.value;
}

/**
 * Cabin total pressure, under the fixed-diluent-gas simplification
 * (`physiology.diluentGasPressureMmHg` — see its own note for why). The sim tracks only O2
 * and CO2 partial pressure, not a full nitrogen mass balance.
 */
export function totalPressureMmHg(o2MmHg: number, co2MmHg: number): number {
  return o2MmHg + co2MmHg + physiology.diluentGasPressureMmHg.value;
}

/**
 * Inspired O2 partial pressure (PIO2), the quantity every hypoxia/hyperoxia threshold in
 * `docs/INCIDENTS_AND_THRESHOLDS.md` S1.1 is actually stated in — not cabin ppO2. OCHMO-TB-003's
 * own formula: PIO2 = (P_total - 47 mmHg) x FO2, where 47 mmHg is water-vapour pressure at
 * body temperature and FO2 is the cabin's O2 mole fraction. Algebraically identical to
 * `ppO2 - 47 x FO2` since `ppO2 = P_total x FO2` by definition — a cabin can sit above the
 * mild-hypoxia ppO2 line and still be hypoxic once this correction is applied, which is
 * exactly why every physiology check must go through this function rather than reading
 * `o2PartialPressureMmHg` directly.
 */
export function pio2MmHg(o2MmHg: number, co2MmHg: number): number {
  const total = totalPressureMmHg(o2MmHg, co2MmHg);
  if (total <= 0) return 0;
  const fo2 = o2MmHg / total;
  return o2MmHg - physiology.waterVapourPressureBodyMmHg.value * fo2;
}

export function atmosphereStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const a = state.atmosphere;
  const living = state.crew.filter((c) => c.alive).length;

  const o2ConsumedKg =
    living * perDayToPerHour(crewConstants.o2ConsumptionKgPerCrewDay.value) * ctx.dtHours;
  const co2ProducedKg =
    living * perDayToPerHour(crewConstants.co2ProductionKgPerCrewDay.value) * ctx.dtHours;

  a.o2Kg = Math.max(0, a.o2Kg - o2ConsumedKg);
  a.co2Kg += co2ProducedKg;

  // Scrubbing. A scenario without a co2Scrubber system at all (none exist today, but the
  // model must not assume one) just accumulates CO2 unchecked, with no "offline" log — a
  // system that was never fitted was never taken offline.
  const scrubber = state.systems.co2Scrubber;
  if (scrubber !== undefined && scrubber.operational && scrubber.poweredThisHour) {
    // scrubberEfficiencyFraction is the M7.5 o2tank-apollo13 residual cost — an improvised
    // fix is never as good as the original hardware, permanently, once applied.
    const capacityKgPerHour = habitat.co2ScrubberKgPerHour.value * a.scrubberEfficiencyFraction;
    const removedKg = Math.min(a.co2Kg, capacityKgPerHour * ctx.dtHours);
    a.co2Kg -= removedKg;
  } else if (scrubber !== undefined) {
    log.logEdge({
      kind: "fault",
      severity: "warning",
      code: "atmosphere.scrubberOffline",
      system: "co2Scrubber",
      data: { co2Kg: round(a.co2Kg) },
    });
  }

  a.o2PartialPressureMmHg = partialPressureMmHg(
    a.o2Kg,
    physics.molarMassO2GPerMol.value,
    a.habitatVolumeM3,
    state.thermal.habitatTempC,
  );
  a.co2PartialPressureMmHg = partialPressureMmHg(
    a.co2Kg,
    physics.molarMassCo2GPerMol.value,
    a.habitatVolumeM3,
    state.thermal.habitatTempC,
  );

  const limit = co2LimitMmHg(state.food.mode);
  if (a.co2PartialPressureMmHg > limit) {
    log.logEdge({
      kind: "crew",
      severity: a.co2PartialPressureMmHg > limit * 2 ? "critical" : "warning",
      code: "atmosphere.co2AboveLimit",
      data: {
        co2MmHg: round(a.co2PartialPressureMmHg),
        limitMmHg: limit,
        mode: state.food.mode,
      },
    });
  }

  // Hypoxia risk below roughly 120 mmHg of oxygen partial pressure.
  if (a.o2PartialPressureMmHg < 120) {
    log.logEdge({
      kind: "crew",
      severity: a.o2PartialPressureMmHg < 90 ? "critical" : "warning",
      code: "atmosphere.lowOxygen",
      data: { o2MmHg: round(a.o2PartialPressureMmHg) },
    });
  }
}

const round = (x: number): number => Math.round(x * 100) / 100;
