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
import { management } from "../data/constants.js";
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
