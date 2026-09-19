/**
 * Stage 7 — radiation dose.
 *
 * Two regimes, and the difference between them is the lesson:
 *   - solar particle events are intense but soft. Mass stops them well, so the storm
 *     shelter works and a water wall matters.
 *   - galactic cosmic rays are sparse but hard. Shielding helps weakly and then saturates,
 *     because the shield itself produces secondary particles. There is no thickness that
 *     makes a long transit safe.
 *
 * Both attenuation curves are `tuned` in constants.ts, not measured, and are disclosed as
 * game simplifications on the Data Sources screen.
 */
import { radiation as radConstants } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import type { CrewLocation } from "../types.js";
import { HOURS_PER_EARTH_DAY, clamp } from "../units.js";

/** Fraction of solar-particle-event dose that gets through `x` g/cm^2 of shielding. */
export function speTransmission(shieldingGPerCm2: number): number {
  return Math.exp(-shieldingGPerCm2 / radConstants.speAttenuationLengthGPerCm2.value);
}

/**
 * Fraction of galactic-cosmic-ray dose that gets through. Falls towards a floor rather than
 * towards zero — that floor is the physics that makes long missions hard.
 */
export function gcrTransmission(shieldingGPerCm2: number): number {
  const floor = radConstants.gcrSaturationFloorFraction.value;
  const decay = Math.exp(-shieldingGPerCm2 / radConstants.gcrAttenuationLengthGPerCm2.value);
  return floor + (1 - floor) * decay;
}

/** Shielding actually between a crew member and the sky, by where they are. */
export function effectiveShieldingGPerCm2(
  location: CrewLocation,
  habitatShielding: number,
): number {
  switch (location) {
    case "eva":
      return 0.5; // a suit is essentially transparent to this radiation
    case "habitat":
      return habitatShielding;
    case "stormShelter":
      return habitatShielding * 3;
  }
}

export function radiationStage(ctx: TickContext): void {
  const { state, log } = ctx;
  const r = state.radiation;

  const gcrPerHour = r.ambientMSvPerDay / HOURS_PER_EARTH_DAY;
  // During an event the flux rises by a large factor; the shelter is what makes it survivable.
  const spePerHour = r.solarParticleEventActive
    ? (r.ambientMSvPerDay * 40) / HOURS_PER_EARTH_DAY
    : 0;

  for (const member of state.crew) {
    if (!member.alive) continue;

    const shielding = effectiveShieldingGPerCm2(member.location, r.shieldingGPerCm2);
    const doseMSv =
      (gcrPerHour * gcrTransmission(shielding) + spePerHour * speTransmission(shielding)) *
      ctx.dtHours;

    member.cumulativeDoseMSv += doseMSv;
    if (r.solarParticleEventActive) member.eventDoseMSv += doseMSv;

    if (member.cumulativeDoseMSv >= radConstants.careerLimitMSv.value) {
      log.logEdge({
        kind: "crew",
        severity: "critical",
        code: "radiation.careerLimitExceeded",
        data: {
          crew: member.name,
          doseMSv: round(member.cumulativeDoseMSv),
          limitMSv: radConstants.careerLimitMSv.value,
        },
      });
    }

    if (member.eventDoseMSv >= radConstants.solarParticleEvent30DayLimitMGyEq.value) {
      log.logEdge({
        kind: "crew",
        severity: "critical",
        code: "radiation.eventLimitExceeded",
        data: {
          crew: member.name,
          eventDoseMSv: round(member.eventDoseMSv),
          limitMGyEq: radConstants.solarParticleEvent30DayLimitMGyEq.value,
        },
      });
    }
  }

  // Daily-rate check against the design target, so players see the budget, not just the total.
  const dailyRate =
    r.ambientMSvPerDay * gcrTransmission(r.shieldingGPerCm2) +
    (r.solarParticleEventActive
      ? r.ambientMSvPerDay * 40 * speTransmission(r.shieldingGPerCm2)
      : 0);
  if (dailyRate > radConstants.surfaceDesignTargetMSvPerDay.value) {
    log.logEdge({
      kind: "hazard",
      severity: "warning",
      code: "radiation.aboveDesignTarget",
      data: {
        rateMSvPerDay: round(dailyRate),
        targetMSvPerDay: radConstants.surfaceDesignTargetMSvPerDay.value,
        shieldingGPerCm2: round(r.shieldingGPerCm2),
      },
    });
  }

  r.shieldingGPerCm2 = clamp(r.shieldingGPerCm2, 0, 500);
}

const round = (x: number): number => Math.round(x * 1000) / 1000;
