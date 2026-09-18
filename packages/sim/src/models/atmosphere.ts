/**
 * Stage 4 — atmosphere.
 *
 * Crew breathe oxygen and exhale carbon dioxide; the scrubber removes CO2 when it has
 * power. Partial pressures come from the ideal gas law rather than a lookup, so the
 * Commander level of the Reality Dial can show the actual equation.
 */
import { crew as crewConstants, habitat, physics, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { partialPressureMmHg, perDayToPerHour } from "../units.js";

/** The CO2 partial-pressure limit for the currently selected rationing mode. */
export function co2LimitMmHg(mode: keyof typeof survivalModes): number {
  return survivalModes[mode].co2LimitMmHg.value;
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

  // Scrubbing
  const scrubber = state.systems.co2Scrubber;
  if (scrubber.operational && scrubber.poweredThisHour) {
    const removedKg = Math.min(a.co2Kg, habitat.co2ScrubberKgPerHour.value * ctx.dtHours);
    a.co2Kg -= removedKg;
  } else {
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
