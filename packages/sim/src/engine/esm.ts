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
import { hardwareEsm, management, power } from "../data/constants.js";
import type { Scenario, SystemId } from "../types.js";
import { hoursToDays, kwToWatts, perYearToPerDay } from "../units.js";

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
 * `equivalentSystemMass` above needs each system's own hardware mass, cooling load and
 * crew-time to operate. Nine research attempts at M4 came up short on all of them, so the
 * readout shipped with only the power term. The research team has since supplied real,
 * ISS- and Mars-architecture-derived M/C/CT figures (`data/constants.ts`'s `hardwareEsm`)
 * for every system except `lifeSupport` — deliberately: BVAD only baselines individual
 * life-support *functions*, and the team judged that giving "life support" its own hardware
 * mass on top of the five subsystems below that already model real life-support equipment
 * (CO2 scrubber, thermal control, oxygen generator, water recovery, greenhouse) would double
 * -count the same hardware under two names. `waterRecovery` also has no cooling figure in
 * the source material. Both gaps are real absences of data, not zeros — `hardwareTermsFor`
 * below returns `undefined` for a missing term, and this function never substitutes 0 for
 * it, so a system's line simply omits the term the source doesn't state rather than
 * silently claiming it costs nothing.
 */
function totalGreenhouseAreaM2(scenario: Scenario): number {
  return scenario.initial.cropTrays.reduce((sum, tray) => sum + tray.areaM2, 0);
}

interface HardwareTerms {
  readonly massKg?: number;
  readonly coolingKw?: number;
  readonly crewHoursPerYear?: number;
}

function hardwareTermsFor(id: SystemId, scenario: Scenario): HardwareTerms | undefined {
  switch (id) {
    case "co2Scrubber":
      return {
        massKg: hardwareEsm.co2Scrubber.massKg.value,
        coolingKw: hardwareEsm.co2Scrubber.coolingKw.value,
        crewHoursPerYear: hardwareEsm.co2Scrubber.crewHoursPerYear.value,
      };
    case "thermalControl":
      return {
        massKg: hardwareEsm.thermalControl.massKg.value,
        coolingKw: hardwareEsm.thermalControl.coolingKw.value,
        crewHoursPerYear: hardwareEsm.thermalControl.crewHoursPerYear.value,
      };
    case "oxygenGenerator":
      return {
        massKg: hardwareEsm.oxygenGenerator.massKg.value,
        coolingKw: hardwareEsm.oxygenGenerator.coolingKw.value,
        crewHoursPerYear: hardwareEsm.oxygenGenerator.crewHoursPerYear.value,
      };
    case "waterRecovery":
      return {
        massKg: hardwareEsm.waterRecovery.massKg.value,
        crewHoursPerYear: hardwareEsm.waterRecovery.crewHoursPerYear.value,
      };
    case "moxie":
      return { massKg: hardwareEsm.moxie.massKg.value };
    case "powerDistribution":
      return { massKg: hardwareEsm.powerDistribution.massKg.value };
    case "comms":
      return { massKg: hardwareEsm.comms.massKg.value };
    case "greenhouse": {
      const areaM2 = totalGreenhouseAreaM2(scenario);
      return {
        massKg: hardwareEsm.greenhousePerM2.massKgPerM2.value * areaM2,
        coolingKw: hardwareEsm.greenhousePerM2.coolingKwPerM2.value * areaM2,
        crewHoursPerYear: hardwareEsm.greenhousePerM2.crewHoursPerYearPerM2.value * areaM2,
      };
    }
    case "lifeSupport":
      return undefined;
  }
}

export interface ScenarioEsmLine {
  readonly system: SystemId;
  readonly powerKw: number;
  readonly powerKg: number;
  /** `undefined` when the source material states no figure for this system — not a zero. */
  readonly massKg?: number | undefined;
  readonly coolingKg?: number | undefined;
  readonly crewTimeKg?: number | undefined;
  readonly equivalentKg: number;
  /** True once every M/C/CT term the general BVAD formula wants has a sourced value. */
  readonly fullySourced: boolean;
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
  const durationDays = hoursToDays(scenario.durationHours);

  const perSystem = scenario.systems.map((spec): ScenarioEsmLine => {
    const powerKg = spec.nominalPowerKw * kgPerKw;
    const hw = hardwareTermsFor(spec.id, scenario);
    const massKg = hw?.massKg;
    const coolingKg =
      hw?.coolingKw !== undefined
        ? kwToWatts(hw.coolingKw) * management.esmCoolingKgPerW.value
        : undefined;
    const crewTimeKg =
      hw?.crewHoursPerYear !== undefined
        ? perYearToPerDay(hw.crewHoursPerYear) * durationDays * management.esmCrewTimeKgPerCrewHour.value
        : undefined;

    return {
      system: spec.id,
      powerKw: spec.nominalPowerKw,
      powerKg,
      massKg,
      coolingKg,
      crewTimeKg,
      equivalentKg: powerKg + (massKg ?? 0) + (coolingKg ?? 0) + (crewTimeKg ?? 0),
      fullySourced: massKg !== undefined && coolingKg !== undefined && crewTimeKg !== undefined,
    };
  });

  const habitatVolumeKg = scenario.initial.habitatVolumeM3 * management.esmTransitVolumeKgPerM3.value;
  const batteryMassKg =
    (scenario.initial.batteryCapacityKwh * 1000) / power.batterySpecificEnergyWhPerKg.value;
  // The fission reactor is a real, discrete NASA-FSP unit at a stated mass, not a rate — a
  // scenario either carries the whole reactor or none of it, so this is not a linear scale.
  const reactorMassKg =
    scenario.initial.fissionReactorKwe > 0 ? power.fissionSurfacePowerMassKg.value : 0;

  const perSystemKg = perSystem.reduce((sum, line) => sum + line.equivalentKg, 0);

  return {
    perSystem,
    habitatVolumeKg,
    batteryMassKg,
    reactorMassKg,
    totalKg: perSystemKg + habitatVolumeKg + batteryMassKg + reactorMassKg,
  };
}
