/**
 * Elapsed and total mission time, worded for the body the scenario is actually on.
 *
 * Every timestamp in the UI used to say "Sol X.XX" unconditionally — harmless for Mars, but
 * a Mars sol is a Mars-specific unit, and printing it on a lunar mission would be wrong the
 * same way printing "furlongs" on a metric distance would be: not a rounding error, a wrong
 * word. This is the one place that word is chosen, from `scenario.body`, so nothing else in
 * the app has to make that call itself.
 */
import { units, type Body } from "@sol-keeper/sim";

/** "Sol" or "Day" — the word itself, for composing a range like "Sol 8.11–12.04". */
export function timeUnitWord(body: Body): string {
  return body === "mars" ? "Sol" : "Day";
}

/** The bare elapsed value in the body's own unit — sols on Mars, days on the Moon. */
export function elapsedValue(hours: number, body: Body): number {
  return body === "mars" ? units.hoursToSols(hours) : units.hoursToDays(hours);
}

/** "Sol 8.11" or "Day 8.11" — a point in time, for event timestamps. */
export function timestampLabel(hours: number, body: Body, decimals = 2): string {
  return `${timeUnitWord(body)} ${elapsedValue(hours, body).toFixed(decimals)}`;
}

/** "30 sols" or "14 days" — a span of time, for mission length statements. */
export function durationLabel(hours: number, body: Body): string {
  return body === "mars"
    ? `${Math.round(units.hoursToSols(hours))} sols`
    : `${Math.round(units.hoursToDays(hours))} days`;
}
