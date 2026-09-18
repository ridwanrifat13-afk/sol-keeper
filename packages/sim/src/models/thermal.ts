/**
 * Stage 3 — thermal.
 *
 * A single-node cabin: crew and equipment put heat in, the shell leaks it out, the heater
 * makes up the difference when it has power. Losing the heater during a brownout is the
 * classic cascade this model exists to produce.
 */
import { crew as crewConstants, habitat } from "../data/constants.js";
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
  t.crewHeatKw = living * crewHeatKwPerPerson();

  // Heat leaking to the outside, proportional to the temperature difference.
  t.lossKw =
    habitat.thermalConductanceKwPerK.value * (t.habitatTempC - state.environment.outsideTempC);

  const heaterSystem = state.systems.thermalControl;
  t.heaterKw =
    heaterSystem.operational && heaterSystem.poweredThisHour ? heaterSystem.nominalPowerKw : 0;

  const netKw = t.crewHeatKw + t.heaterKw - t.lossKw;

  // dT = energy / thermal mass. Thermal mass is stored in MJ/K, energy arrives in kWh.
  const thermalMassKwhPerK = mjToKwh(habitat.thermalMassMjPerK.value);
  t.habitatTempC += (netKw * ctx.dtHours) / thermalMassKwhPerK;

  if (t.heaterKw === 0 && heaterSystem.operational) {
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
