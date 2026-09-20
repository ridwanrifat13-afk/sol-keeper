/**
 * Equivalent System Mass (BVAD).
 *
 * ESM = M + V*Veq + P*Peq + C*Ceq + CT*D*CTeq
 *
 * It converts volume, power, cooling and crew time into the one currency that actually
 * constrains a mission: mass to the surface. This is the P1 "ESM budget as currency"
 * mechanic — the player spends kilograms, not coins.
 *
 * All five terms are live. The crew-time (1.25 kg/CM-h) and cooling (0.14 kg/W) factors
 * were zero placeholders until the 2026-09 verification pass supplied the standard NASA
 * values, so ESM totals from before that date are lower than they should be.
 */
import { management, power } from "../data/constants.js";
import type { Scenario, SystemId } from "../types.js";
import { kwToWatts } from "../units.js";

export interface EsmInputs {
  /** Hardware mass, kg. */
  readonly massKg: number;
  /** Pressurised volume occupied, m^3. */
  readonly volumeM3: number;
  /** Continuous electrical power drawn, kW. */
  readonly powerKw: number;
  /** Heat rejected, kW. */
  readonly coolingKw: number;
  /** Crew time to operate and maintain, crew-hours per day. */
  readonly crewHoursPerDay: number;
  /** Mission duration, days. */
  readonly durationDays: number;
}

export type PowerInfrastructure = "transit" | "surfaceLow" | "surfaceMid" | "surfaceHigh";

function powerEquivalencyKgPerKw(kind: PowerInfrastructure): number {
  switch (kind) {
    case "transit":
      return management.esmTransitPowerKgPerKwe.value;
    case "surfaceLow":
      return management.esmSurfacePowerKgPerKwLow.value;
    case "surfaceMid":
      return management.esmSurfacePowerKgPerKwMid.value;
    case "surfaceHigh":
      return management.esmSurfacePowerKgPerKwHigh.value;
  }
}

export interface EsmBreakdown {
  readonly massKg: number;
  readonly volumeKg: number;
  readonly powerKg: number;
  readonly coolingKg: number;
  readonly crewTimeKg: number;
  readonly totalKg: number;
}

export function equivalentSystemMass(
  inputs: EsmInputs,
  powerInfrastructure: PowerInfrastructure = "surfaceMid",
): EsmBreakdown {
  const volumeKg = inputs.volumeM3 * management.esmTransitVolumeKgPerM3.value;
  const powerKg = inputs.powerKw * powerEquivalencyKgPerKw(powerInfrastructure);
  // The cooling equivalency is stated per watt, so the kilowatt input converts here
  // rather than the literal being pre-multiplied in constants.ts.
  const coolingKg = kwToWatts(inputs.coolingKw) * management.esmCoolingKgPerW.value;
  const crewTimeKg =
    inputs.crewHoursPerDay * inputs.durationDays * management.esmCrewTimeKgPerCrewHour.value;

  return {
    massKg: inputs.massKg,
    volumeKg,
    powerKg,
    coolingKg,
    crewTimeKg,
    totalKg: inputs.massKg + volumeKg + powerKg + coolingKg + crewTimeKg,
  };
}

// ---------------------------------------------------------------------------
// Scenario-level ESM: the "live readout" the Operate view shows during a run.
// ---------------------------------------------------------------------------

/**
 * `equivalentSystemMass` above needs each system's own hardware mass, volume, cooling load
 * and crew-time to operate — real numbers, but ones no source in docs/DATA_SOURCES.md
 * currently states for these specific systems. Nine individual research attempts (MOXIE,
 * the ISS Oxygen Generation Assembly, CO2 removal, water recovery, thermal control) turned
 * up leads but nothing pinned to a document anyone could actually open and check, so per
 * rule 1 this stays undone rather than shipping nine invented "placeholder" masses.
 *
 * What *is* fully sourced today: each system's continuous power draw (already tracked, for
 * the power-priority simulation), the habitat's pressurised volume, the battery's specific
 * energy, and the fission reactor's own stated mass. Those four route straight through the
 * BVAD equivalency factors above with nothing invented, so the readout uses only them —
 * a real, honest partial ESM, not a complete one padded out with guesses.
 */
export interface ScenarioEsmLine {
  readonly system: SystemId;
  readonly powerKw: number;
  readonly equivalentKg: number;
}

export interface ScenarioEsmBreakdown {
  readonly perSystem: readonly ScenarioEsmLine[];
  readonly habitatVolumeKg: number;
  readonly batteryMassKg: number;
  readonly reactorMassKg: number;
  readonly totalKg: number;
}

export function scenarioEsmBreakdown(
  scenario: Scenario,
  powerInfrastructure: PowerInfrastructure = "surfaceMid",
): ScenarioEsmBreakdown {
  const kgPerKw = powerEquivalencyKgPerKw(powerInfrastructure);

  const perSystem = scenario.systems.map((spec) => ({
    system: spec.id,
    powerKw: spec.nominalPowerKw,
    equivalentKg: spec.nominalPowerKw * kgPerKw,
  }));

  const habitatVolumeKg = scenario.initial.habitatVolumeM3 * management.esmTransitVolumeKgPerM3.value;
  const batteryMassKg =
    (scenario.initial.batteryCapacityKwh * 1000) / power.batterySpecificEnergyWhPerKg.value;
  // The fission reactor is a real, discrete NASA-FSP unit at a stated mass, not a rate — a
  // scenario either carries the whole reactor or none of it, so this is not a linear scale.
  const reactorMassKg =
    scenario.initial.fissionReactorKwe > 0 ? power.fissionSurfacePowerMassKg.value : 0;

  const powerKg = perSystem.reduce((sum, line) => sum + line.equivalentKg, 0);

  return {
    perSystem,
    habitatVolumeKg,
    batteryMassKg,
    reactorMassKg,
    totalKg: powerKg + habitatVolumeKg + batteryMassKg + reactorMassKg,
  };
}
