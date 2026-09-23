/**
 * Explicit unit conversion (brief rule 3).
 *
 * Nothing here holds data — every number comes from data/constants.ts. These functions
 * exist so that a conversion is always visible at the call site rather than folded into a
 * literal somewhere. In particular, `SOL_HOURS` is never written as 24.6597 in a model.
 */
import { environment, physics } from "./data/constants.js";

/** Days in a Julian year — a calendar fact, not a mission parameter. */
export const DAYS_PER_YEAR = physics.daysPerJulianYear.value;

/** A per-year rate (e.g. ESM's CM-h/yr crew-time terms) expressed per day. */
export const perYearToPerDay = (perYear: number): number => perYear / DAYS_PER_YEAR;

export const HOURS_PER_EARTH_DAY = 24;
export const SECONDS_PER_HOUR = 3600;
export const MINUTES_PER_HOUR = 60;

/** Length of one Mars solar day, in hours. */
export const SOL_HOURS = environment.marsSolHours.value;

/** Mars sols to hours, and back. */
export const solsToHours = (sols: number): number => sols * SOL_HOURS;
export const hoursToSols = (hours: number): number => hours / SOL_HOURS;

/** Earth days to hours, and back. */
export const daysToHours = (days: number): number => days * HOURS_PER_EARTH_DAY;
export const hoursToDays = (hours: number): number => hours / HOURS_PER_EARTH_DAY;

/** A per-Earth-day rate expressed per hour. */
export const perDayToPerHour = (perDay: number): number => perDay / HOURS_PER_EARTH_DAY;

/** Energy bookkeeping: a steady power held for a span of hours. */
export const kwForHoursToKwh = (kw: number, hours: number): number => kw * hours;
export const kwhOverHoursToKw = (kwh: number, hours: number): number => kwh / hours;

export const wattsToKw = (w: number): number => w / 1000;
export const kwToWatts = (kw: number): number => kw * 1000;

export const gramsToKg = (g: number): number => g / 1000;
export const kgToGrams = (kg: number): number => kg * 1000;

/** Megajoules per day expressed as a steady wattage. */
export const mjPerDayToWatts = (mjPerDay: number): number =>
  (mjPerDay * 1_000_000) / (HOURS_PER_EARTH_DAY * SECONDS_PER_HOUR);

/** Megajoules to kilowatt-hours. */
export const mjToKwh = (mj: number): number => mj / 3.6;

/**
 * Partial pressure of a gas held in a fixed volume, via the ideal gas law.
 * p = (m / M) * R * T / V, converted from pascals to mmHg.
 */
export function partialPressureMmHg(
  massKg: number,
  molarMassGPerMol: number,
  volumeM3: number,
  temperatureC: number,
): number {
  if (volumeM3 <= 0) return 0;
  const moles = kgToGrams(massKg) / molarMassGPerMol;
  const kelvin = celsiusToKelvin(temperatureC);
  const pascals = (moles * physics.universalGasConstantJPerMolK.value * kelvin) / volumeM3;
  return pascals / physics.pascalsPerMmHg.value;
}

export const celsiusToKelvin = (c: number): number => c + 273.15;
export const kelvinToCelsius = (k: number): number => k - 273.15;

/** Inverse of `partialPressureMmHg`: the gas mass a fixed volume holds at a target partial
 *  pressure. Used to translate a desired mmHg-per-hour rise (docs/INCIDENT_MAGNITUDES.md's
 *  Apollo 13 CO2 curve) into the kg increment `atmosphereStage` actually tracks. */
export function massKgForPartialPressureMmHg(
  mmHg: number,
  molarMassGPerMol: number,
  volumeM3: number,
  temperatureC: number,
): number {
  if (volumeM3 <= 0) return 0;
  const pascals = mmHg * physics.pascalsPerMmHg.value;
  const kelvin = celsiusToKelvin(temperatureC);
  const moles = (pascals * volumeM3) / (physics.universalGasConstantJPerMolK.value * kelvin);
  return gramsToKg(moles * molarMassGPerMol);
}

/**
 * Choked (sonic) orifice flow — the effective exit velocity of a gas escaping through a hole
 * once the pressure ratio across it is large enough that flow chokes (holds while the cabin
 * is far above vacuum, which is the whole regime a habitat leak matters in).
 * docs/INCIDENT_MAGNITUDES.md #1's own derivation for the depress-mir97 incident:
 *   v_eff = sqrt(gamma . R_specific . T) . (2/(gamma+1))^((gamma+1)/(2(gamma-1)))
 * `R_specific` (J/(kg K)) is the universal gas constant divided by the gas's molar mass, not
 * the universal constant itself — the formula is dimensionally a velocity only that way.
 */
export function chokedOrificeEffectiveVelocityMPerS(
  temperatureC: number,
  specificHeatRatio: number,
  molarMassGPerMol: number,
): number {
  const kelvin = celsiusToKelvin(temperatureC);
  const specificGasConstant = physics.universalGasConstantJPerMolK.value / gramsToKg(molarMassGPerMol);
  const criticalFlowFactor = Math.pow(2 / (specificHeatRatio + 1), (specificHeatRatio + 1) / (2 * (specificHeatRatio - 1)));
  return Math.sqrt(specificHeatRatio * specificGasConstant * kelvin) * criticalFlowFactor;
}

/** Exponential-decay time constant for a choked leak: tau = V / (Cd . A . v_eff). Returned in
 *  hours (the sim's own tick unit) rather than seconds. */
export function chokedOrificeLeakTimeConstantHours(
  volumeM3: number,
  holeDiameterMm: number,
  dischargeCoefficient: number,
  effectiveVelocityMPerS: number,
): number {
  const holeAreaM2 = Math.PI * Math.pow(holeDiameterMm / 1000 / 2, 2);
  const tauSeconds = volumeM3 / (dischargeCoefficient * holeAreaM2 * effectiveVelocityMPerS);
  return tauSeconds / SECONDS_PER_HOUR;
}

/** 1 atm = 14.696 psia = 760 mmHg exactly (definitional), so this ratio is exact too. */
export const psiaToMmHg = (psia: number): number => psia * (760 / 14.696);

/** Solar irradiance at distance r, by inverse square from the value at 1 AU. */
export const irradianceAtAu = (solarConstantWPerM2: number, distanceAu: number): number =>
  solarConstantWPerM2 / (distanceAu * distanceAu);

/** One-way light time for a distance in AU. */
export const auToLightSeconds = (au: number): number => au * physics.lightSecondsPerAu.value;
export const auToKm = (au: number): number => au * physics.astronomicalUnitKm.value;

/** Clamp helper used throughout the models. */
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
