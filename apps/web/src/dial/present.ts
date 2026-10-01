/**
 * Turns a gauge's raw numbers into what each Reality Dial level actually shows.
 *
 * The bar fill and the glyph/colour status are computed once in OperateView and never
 * change here — a bar reads fine to an 8-year-old and a commander alike, and rule 6's
 * "never colour alone" guarantee has to hold at every level, not just specialist. What
 * changes per level is only the headline text, the unit, and the line underneath.
 *
 * Every function takes the already-decided `StatusLevel` rather than re-deriving it from
 * thresholds, so the actual caution/critical bands live in exactly one place
 * (components/status.ts) and cannot drift between what the bar shows and what the words say.
 *
 * Player request: no emoji in cadet text — every Gauge-backed presenter below already sits
 * beside that gauge's own shape-distinct `icon` prop (Gauge.tsx), so the cadet headline here
 * is plain words with no redundant pictograph; `presentDose` (CrewPanel's one non-Gauge
 * presenter) drops its own emoji the same way, since the text alone ("Barely any"/"Some"/
 * "A lot") already carries the meaning without one.
 */
import type { StatusLevel } from "../components/status.js";
import type { DialLevel } from "./types.js";

export interface GaugeText {
  /** When set, replaces the numeric "value unit" headline outright (cadet level). */
  readonly valueText?: string;
  readonly unit: string;
  readonly decimals: number;
  readonly detail: string;
}

/** Picks a phrase by status level, so each presenter states its three cadet lines together. */
function byStatus<T>(status: StatusLevel, texts: Record<StatusLevel, T>): T {
  return texts[status];
}

export function presentOxygen(level: DialLevel, status: StatusLevel, o2Kg: number): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Plenty of air",
        caution: "Air is a bit low",
        critical: "Air is very low!",
      }),
      unit: "",
      decimals: 0,
      detail: "The crew breathes this.",
    };
  }
  if (level === "commander") {
    return { unit: "mmHg", decimals: 1, detail: `${o2Kg.toFixed(2)} kg O₂ · pO₂ from PV=nRT` };
  }
  return { unit: "mmHg", decimals: 0, detail: `${o2Kg.toFixed(1)} kg in the cabin` };
}

export function presentCo2(
  level: DialLevel,
  status: StatusLevel,
  limitMmHg: number,
  modeLabel: string,
): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Air is clean",
        caution: "Getting stuffy",
        critical: "Too much bad air!",
      }),
      unit: "",
      decimals: 0,
      detail: "The scrubber cleans this away.",
    };
  }
  if (level === "commander") {
    return {
      unit: "mmHg",
      decimals: 2,
      detail: `limit ${limitMmHg} mmHg (${modeLabel}) · pCO₂, ideal gas law`,
    };
  }
  return { unit: "mmHg", decimals: 2, detail: `limit ${limitMmHg} mmHg in ${modeLabel} mode` };
}

export function presentWater(level: DialLevel, status: StatusLevel, days: number): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Plenty of water",
        caution: "Water is getting low",
        critical: "Almost out of water!",
      }),
      unit: "",
      decimals: 0,
      detail: "For drinking and making air.",
    };
  }
  if (level === "commander") {
    return { unit: "kg", decimals: 1, detail: `${days.toFixed(2)} days at the current draw rate` };
  }
  return { unit: "kg", decimals: 0, detail: `${days.toFixed(1)} days at the current rate` };
}

export function presentFood(
  level: DialLevel,
  status: StatusLevel,
  days: number,
  harvestKg: number,
): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Plenty of food",
        caution: "Food is getting low",
        critical: "Almost out of food!",
      }),
      unit: "",
      decimals: 0,
      detail: harvestKg > 0 ? `Grew ${harvestKg.toFixed(1)} kg in the garden.` : "Nothing grown yet.",
    };
  }
  if (level === "commander") {
    return {
      unit: "kg dry",
      decimals: 1,
      detail: `${days.toFixed(2)} days remaining · ${harvestKg.toFixed(2)} kg harvested to date`,
    };
  }
  return {
    unit: "kg dry",
    decimals: 0,
    detail: `${days.toFixed(1)} days · ${harvestKg.toFixed(1)} kg grown`,
  };
}

export function presentBattery(
  level: DialLevel,
  status: StatusLevel,
  generationKw: number,
  servedKw: number,
  demandKw: number,
): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Plenty of power",
        caution: "Power is getting low",
        critical: "Almost out of power!",
      }),
      unit: "",
      decimals: 0,
      detail: generationKw > 0 ? "The sun is charging the batteries." : "No sunlight right now.",
    };
  }
  if (level === "commander") {
    return {
      unit: "kWh",
      decimals: 1,
      detail: `${generationKw.toFixed(2)} kW generated · ${servedKw.toFixed(2)}/${demandKw.toFixed(2)} kW demand served`,
    };
  }
  return {
    unit: "kWh",
    decimals: 0,
    detail: `${generationKw.toFixed(1)} kW in · ${servedKw.toFixed(1)} of ${demandKw.toFixed(1)} kW served`,
  };
}

export function presentCabin(
  level: DialLevel,
  status: StatusLevel,
  outsideTempC: number,
  isDaylight: boolean,
): GaugeText {
  if (level === "cadet") {
    return {
      valueText: byStatus(status, {
        nominal: "Cosy",
        caution: "A bit chilly",
        critical: "Freezing!",
      }),
      unit: "",
      decimals: 0,
      detail: isDaylight ? "It's daytime outside." : "It's night-time outside.",
    };
  }
  if (level === "commander") {
    return {
      unit: "°C",
      decimals: 2,
      detail: `outside ${outsideTempC.toFixed(1)} °C · ${isDaylight ? "insolation on" : "no insolation"}`,
    };
  }
  return {
    unit: "°C",
    decimals: 1,
    detail: `outside ${outsideTempC.toFixed(0)} °C · ${isDaylight ? "daylight" : "night"}`,
  };
}

/** Radiation dose against the career limit — CrewPanel's one non-Gauge presenter. */
export interface DoseText {
  readonly headline: string;
  readonly detail: string;
}

export function presentDose(level: DialLevel, doseMSv: number, limitMSv: number): DoseText {
  const fraction = doseMSv / limitMSv;
  if (level === "cadet") {
    const headline =
      fraction < 0.25 ? "Barely any" : fraction < 0.6 ? "Some" : "A lot — watch closely";
    return { headline, detail: "Radiation from space, over the whole mission." };
  }
  const pct = (fraction * 100).toFixed(0);
  if (level === "commander") {
    return {
      headline: `${doseMSv.toFixed(2)} mSv`,
      detail: `${pct}% of the NASA-STD-3001 ${limitMSv} mSv career limit`,
    };
  }
  return {
    headline: `${doseMSv.toFixed(1)} mSv`,
    detail: `${pct}% of the ${limitMSv} mSv career limit`,
  };
}
