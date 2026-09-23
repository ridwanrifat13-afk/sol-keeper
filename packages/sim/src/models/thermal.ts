/**
 * Stage 3 — thermal.
 *
 * A single-node cabin: crew and equipment put heat in, the shell leaks it out, the heater
 * makes up the difference when it has power. Losing the heater during a brownout is the
 * classic cascade this model exists to produce.
 */
import { crew as crewConstants, habitat, survivalModes } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { mjPerDayToWatts, mjToKwh, wattsToKw } from "../units.js";

/** Metabolic heat per crew member, in kW. BVAD gives 11.82 MJ/CM-day; that is 136.8 W. */
export function crewHeatKwPerPerson(): number {
  return wattsToKw(mjPerDayToWatts(crewConstants.metabolicRateMjPerCrewDay.value));
}

export function thermalStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const t = state.thermal;

  const living = state.crew.filter((c) => c.alive).length;
  // M7.7 §7: reduced by o2tank-apollo13's rationActivity response — a real "reduced crew
  // metabolic rate" (1 = normal).
  t.crewHeatKw = living * crewHeatKwPerPerson() * state.crewActivityFraction;

  // Heat leaking to or from the outside, proportional to the temperature difference — this
  // term flows *in* whenever the environment is hotter than the cabin (lunar daytime reaches
  // ~117 degC), which is physically correct for passive conduction but is exactly why active
  // cooling below can't be skipped: conduction alone has no way to reject heat once the
  // outside is the hotter side.
  t.lossKw =
    habitat.thermalConductanceKwPerK.value * (t.habitatTempC - state.environment.outsideTempC);

  // thermalControl is one bidirectional system, not a heater-only one: a real ECLSS thermal
  // loop both heats (below the survival mode's comfort target) and actively cools via a
  // radiator (above it), each bounded by the same rated capacity. Before this, the heater ran
  // at full nominal power whenever merely powered, regardless of whether heating was even
  // needed, and nothing ever ran the other direction — during lunar daytime that combination
  // added heat with nothing to remove it, an unbounded runaway with no incident involved.
  const thermalControl = state.systems.thermalControl;
  const capacityKw =
    thermalControl !== undefined && thermalControl.operational && thermalControl.poweredThisHour
      ? thermalControl.nominalPowerKw
      : 0;
  const comfortTempC = survivalModes[state.food.mode].habitatTempC.value;

  if (capacityKw > 0 && t.habitatTempC < comfortTempC) {
    t.heaterKw = capacityKw;
    t.radiatorKw = 0;
  } else if (capacityKw > 0 && t.habitatTempC > comfortTempC) {
    t.heaterKw = 0;
    t.radiatorKw = capacityKw;
  } else {
    t.heaterKw = 0;
    t.radiatorKw = 0;
  }

  const netKw = t.crewHeatKw + t.heaterKw - t.radiatorKw - t.lossKw;

  // dT = energy / thermal mass. Thermal mass is stored in MJ/K, energy arrives in kWh.
  const thermalMassKwhPerK = mjToKwh(habitat.thermalMassMjPerK.value);
  t.habitatTempC += (netKw * ctx.dtHours) / thermalMassKwhPerK;

  if (t.heaterKw === 0 && t.habitatTempC < comfortTempC && thermalControl !== undefined && thermalControl.operational) {
    log.logEdge({
      kind: "fault",
      severity: "caution",
      code: "thermal.heaterUnpowered",
      system: "thermalControl",
      data: { habitatTempC: round(t.habitatTempC) },
    });
  }

  if (t.habitatTempC <= habitat.freezeRiskTempC.value) {
    log.logEdge({
      kind: "fault",
      severity: "critical",
      code: "thermal.freezeRisk",
      data: {
        habitatTempC: round(t.habitatTempC),
        thresholdC: habitat.freezeRiskTempC.value,
      },
    });
  }
}

const round = (x: number): number => Math.round(x * 100) / 100;
