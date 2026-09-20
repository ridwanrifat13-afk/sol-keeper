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

/** Solar irradiance at distance r, by inverse square from the value at 1 AU. */
export const irradianceAtAu = (solarConstantWPerM2: number, distanceAu: number): number =>
  solarConstantWPerM2 / (distanceAu * distanceAu);

/** One-way light time for a distance in AU. */
export const auToLightSeconds = (au: number): number => au * physics.lightSecondsPerAu.value;
export const auToKm = (au: number): number => au * physics.astronomicalUnitKm.value;

/** Clamp helper used throughout the models. */
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
