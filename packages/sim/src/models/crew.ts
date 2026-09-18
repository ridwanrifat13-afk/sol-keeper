/**
 * Stage 8 — crew health, morale and available crew-hours.
 *
 * Health responds to the things the other models produce: cold, bad air, thirst, hunger and
 * accumulated dose. Each penalty logs its own cause code so the debrief can attribute a
 * death to a power decision made days earlier rather than to "bad luck".
 */
import {
  crew as crewConstants,
  radiation as radConstants,
  survivalModes,
} from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { clamp } from "../units.js";

/** Metabolic rate multiplier for a raised body temperature (OCHMO TB-047). */
export function feverMetabolicMultiplier(bodyTempC: number): number {
  const excess = Math.max(0, bodyTempC - 37);
  return 1 + excess * crewConstants.feverMetabolicIncreasePerDegC.value;
}

/** Crew-hours available this tick, scaled by health and morale. */
export function availableCrewHours(ctx: TickContext): number {
  return ctx.state.crew
    .filter((c) => c.alive)
    .reduce((sum, c) => sum + ctx.dtHours * c.healthFraction * (0.5 + 0.5 * c.moraleFraction), 0);
}

export function crewStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const mode = survivalModes[state.food.mode];

  for (const member of state.crew) {
    if (!member.alive) continue;

    let healthDelta = 0.0006 * ctx.dtHours; // slow natural recovery
    let moraleDelta = -0.0002 * ctx.dtHours; // slow natural drift downwards

    // Cold cabin
    const targetTempC = mode.habitatTempC.value;
    if (state.thermal.habitatTempC < targetTempC - 5) {
      const deficit = targetTempC - state.thermal.habitatTempC;
      healthDelta -= 0.002 * deficit * ctx.dtHours;
      moraleDelta -= 0.001 * ctx.dtHours;
      log.logEdge({
        kind: "crew",
        severity: "warning",
        code: "crew.cold",
        data: { crew: member.name, habitatTempC: round(state.thermal.habitatTempC) },
      });
    }

    // Carbon dioxide above the mode's limit
    const co2Limit = mode.co2LimitMmHg.value;
    if (state.atmosphere.co2PartialPressureMmHg > co2Limit) {
      const excess = state.atmosphere.co2PartialPressureMmHg - co2Limit;
      healthDelta -= 0.004 * excess * ctx.dtHours;
      member.bodyTempC += 0.002 * excess * ctx.dtHours;
    }

    // Hypoxia
    if (state.atmosphere.o2PartialPressureMmHg < 120) {
      healthDelta -= 0.01 * ctx.dtHours;
    }

    // Thirst and hunger
    if (state.water.potableKg <= 0) {
      healthDelta -= 0.03 * ctx.dtHours;
      log.logEdge({
        kind: "crew",
        severity: "critical",
        code: "crew.noWater",
        data: { crew: member.name },
      });
    }
    if (state.food.storedDryMassKg <= 0) {
      healthDelta -= 0.008 * ctx.dtHours;
      moraleDelta -= 0.002 * ctx.dtHours;
    }

    // Rationing costs morale even when it keeps everyone alive.
    if (state.food.mode === "mode1") moraleDelta -= 0.0008 * ctx.dtHours;
    if (state.food.mode === "mode2") moraleDelta -= 0.002 * ctx.dtHours;

    // Accumulated dose
    const doseFraction = member.cumulativeDoseMSv / radConstants.careerLimitMSv.value;
    if (doseFraction > 0.5) {
      healthDelta -= 0.0015 * (doseFraction - 0.5) * ctx.dtHours;
    }

    member.healthFraction = clamp(member.healthFraction + healthDelta, 0, 1);
    member.moraleFraction = clamp(member.moraleFraction + moraleDelta, 0, 1);
    member.bodyTempC = clamp(member.bodyTempC - 0.01 * ctx.dtHours, 36.5, 42);

    if (member.healthFraction <= 0) {
      member.alive = false;
      log.log({
        kind: "crew",
        severity: "critical",
        code: "crew.lost",
        data: { crew: member.name, hour: state.hour },
      });
    }
  }
}

const round = (x: number): number => Math.round(x * 100) / 100;
