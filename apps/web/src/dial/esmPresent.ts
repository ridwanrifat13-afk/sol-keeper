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
  return `🚀 This outpost's gear weighs about ${Math.round(totalKg).toLocaleString()} kg — ${carsText}.`;
}

export function esmIntro(level: DialLevel): string {
  if (level === "cadet") {
    return "Everything that flies to space costs weight. This is roughly how heavy this outpost's equipment is.";
  }
  if (level === "commander") {
    return "Equivalent System Mass (BVAD): ESM = M + V·Veq + P·Peq + C·Ceq + CT·D·CTeq. Shown here: the V and P terms only — see the note below for why M, C and CT are not yet modelled per system.";
  }
  return "Equivalent System Mass converts volume and power into one currency — kilograms — so very different kinds of hardware can be compared on the same scale.";
}

export const ESM_PARTIAL_DISCLOSURE =
  "Hardware mass, cooling load and crew-time to operate are real BVAD terms too, but no NASA source we've checked states them for these specific systems — so this total only counts pressurised volume and continuous power draw, not the full formula. See Data Sources.";
