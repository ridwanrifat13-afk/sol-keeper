/**
 * Stage 1 — environment.
 *
 * Sets the outside conditions the rest of the tick reacts to: how much sunlight reaches the
 * array plane, how dusty the array is, and how cold it is outside.
 */
import { environment as env, power as powerConstants } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { SOL_HOURS, clamp, irradianceAtAu } from "../units.js";

/** Length of one full day/night cycle for the body, in hours. */
export function dayLengthHours(body: "mars" | "moon"): number {
  return body === "mars" ? SOL_HOURS : env.lunarDayHours.value;
}

/**
 * Sun elevation factor: 0 at night, peaking at 1 at local noon.
 * A half-sine over the daylight half of the cycle — good enough for an equatorial site and
 * far more legible to a student than a full solar geometry model.
 */
export function sunFactor(hour: number, dayHours: number): number {
  const phase = ((hour % dayHours) + dayHours) % dayHours;
  const dayFraction = phase / dayHours;
  if (dayFraction >= 0.5) return 0; // night half
  return Math.sin(Math.PI * (dayFraction / 0.5));
}

export function environmentStage(ctx: TickContext): void {
  const { state, scenario } = ctx;
  const e = state.environment;

  const dayHours = dayLengthHours(scenario.body);
  const sun = sunFactor(state.hour, dayHours);
  e.isDaylight = sun > 0;

  const distanceAu = scenario.body === "mars" ? env.marsMeanDistanceAu.value : 1;
  const topOfAtmosphere = irradianceAtAu(powerConstants.solarConstant1AuWPerM2.value, distanceAu);

  // Dust accumulates slowly every sol, and much faster while a storm is running.
  const perHourSettling = powerConstants.dustLossPerSolFraction.value / dayHours;
  const stormMultiplier = e.stormActive ? 12 : 1;
  e.dustObscurationFraction = clamp(
    e.dustObscurationFraction + perHourSettling * stormMultiplier * ctx.dtHours,
    0,
    0.95,
  );

  const dustTransmission = 1 - e.dustObscurationFraction;
  e.irradianceWPerM2 = topOfAtmosphere * sun * dustTransmission;

  if (scenario.body === "mars") {
    // Swing either side of the daily mean with the sun.
    e.outsideTempC = env.marsMeanSurfaceTempC.value + 40 * sun;
  } else {
    e.outsideTempC = e.isDaylight ? env.moonEquatorMaxTempC.value : env.moonEquatorMinTempC.value;
  }
}
