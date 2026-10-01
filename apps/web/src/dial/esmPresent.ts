/**
 * Reality Dial framing for the ESM budget panel.
 *
 * The underlying numbers (packages/sim's scenarioEsmBreakdown) never change with level —
 * only how they're introduced does. Cadet gets one plain-language headline and a familiar
 * comparison; specialist and commander both see the full per-system table, and commander
 * additionally names the BVAD formula and the equivalency factors behind it.
 */
import type { DialLevel } from "./types.js";

/** A short, well-known mass for cadet-level comparison. Values are common knowledge, not a
 *  cited NASA figure — this line is explicitly a comparison aid, not a simulation input. */
const CAR_MASS_KG = 1500;

export function esmCadetHeadline(totalKg: number): string {
  const cars = totalKg / CAR_MASS_KG;
  const carsText = cars < 0.5 ? "less than half a car" : `about ${cars.toFixed(1)} cars`;
  return `This outpost's gear weighs about ${Math.round(totalKg).toLocaleString()} kg — ${carsText}.`;
}

export function esmIntro(level: DialLevel): string {
  if (level === "cadet") {
    return "Everything that flies to space costs weight. This is roughly how heavy this outpost's equipment is.";
  }
  if (level === "commander") {
    return "Equivalent System Mass (BVAD): ESM = M + V·Veq + P·Peq + C·Ceq + CT·D·CTeq. Most systems below carry their full mass, cooling and crew-time terms — see the note below for the one system (Life Support) left out on purpose.";
  }
  return "Equivalent System Mass converts hardware mass, volume, power, cooling and crew time into one currency — kilograms — so very different kinds of hardware can be compared on the same scale.";
}

export const ESM_PARTIAL_DISCLOSURE =
  "Life Support has no hardware-mass figure of its own: giving it one on top of the five subsystems already listed here (CO2 scrubber, thermal control, oxygen generator, water recovery, greenhouse) would double-count the same equipment under two names. Water Recovery is missing only its cooling figure — no NASA source we've checked states one. See Data Sources.";
