/**
 * The five mission stations (Phase 2 brief) and how crew condition degrades them.
 *
 * `SYSTEM_TO_STATION` mirrors the pattern `apps/web/src/ripple/graph.ts`'s
 * `SYSTEM_TO_DOMAINS` already established: a plain lookup table, not a computed guess,
 * checked against what each system actually is rather than what sounds right.
 * `thermalControl -> lifeSupport` is a judgment call: neither of the brief's five station
 * descriptions names thermal explicitly, and habitat-environment upkeep fits the "resources"
 * umbrella of Life Support & Resources; the *response* to a thermal fault is an Incident
 * Command decision, same as any other repair. Incident Command and Mission Command own no
 * `SystemId` directly — they own decisions and crew, not hardware.
 */
import { management } from "../data/constants.js";
import type { CrewCondition, CrewMember, StationId, SystemId } from "../types.js";
import type { TickContext } from "./context.js";

export const SYSTEM_TO_STATION: Partial<Record<SystemId, StationId>> = {
  powerDistribution: "power",
  lifeSupport: "lifeSupport",
  co2Scrubber: "lifeSupport",
  oxygenGenerator: "lifeSupport",
  waterRecovery: "lifeSupport",
  greenhouse: "lifeSupport",
  moxie: "lifeSupport",
  thermalControl: "lifeSupport",
  comms: "comms",
  // incidentCommand and missionCommand own no hardware system.
};

export const STATION_IDS: readonly StationId[] = [
  "power",
  "lifeSupport",
  "comms",
  "incidentCommand",
  "missionCommand",
];

/** Whoever is covering a station right now: the primary if alive, else the backup. */
export function stationCoverer(ctx: TickContext, station: StationId): CrewMember | undefined {
  const primary = ctx.state.crew.find((c) => c.primaryStation === station && c.alive);
  if (primary !== undefined) return primary;
  return ctx.state.crew.find((c) => c.backupStation === station && c.alive);
}

/** True when a member is covering a station that isn't their own primary — the condition
 *  that earns a fatigue penalty (Station rules: "a crew member covering two stations
 *  suffers a fatigue penalty"). */
export function isDoubleCovering(ctx: TickContext, member: CrewMember): boolean {
  if (!member.alive) return false;
  return STATION_IDS.some(
    (station) =>
      station !== member.primaryStation &&
      member.backupStation === station &&
      ctx.state.crew.find((c) => c.primaryStation === station && c.alive) === undefined,
  );
}

const CONDITION_PERFORMANCE: Record<CrewCondition, number> = {
  nominal: 1.0,
  impaired: 0.7,
  critical: 0.4,
  lost: 0,
};

const FATIGUE_PENALTY_AT_FULL = 0.25;

/**
 * 1.0 fully staffed and nominal, degrading with the coverer's condition and fatigue, or a
 * further-penalised ad hoc stand-in if nobody is assigned to the station at all — boosted
 * again if a second living crew member is free to help that ad hoc response, not just the
 * single best-conditioned one. Feeds repair/response success probability and effective
 * duration (engine/incidents.ts) and, per-station rather than as one pooled number,
 * `availableCrewHours` (models/crew.ts) — the mechanism that makes crew loss *felt* in
 * gameplay, not just logged.
 */
export function stationPerformance(
  ctx: TickContext,
  station: StationId,
  condition: (member: CrewMember) => CrewCondition,
): number {
  const coverer = stationCoverer(ctx, station);
  if (coverer !== undefined) {
    const base = CONDITION_PERFORMANCE[condition(coverer)];
    const fatiguePenalty = isDoubleCovering(ctx, coverer) ? coverer.fatigueFraction * FATIGUE_PENALTY_AT_FULL : 0;
    return Math.max(0, base - fatiguePenalty);
  }

  // Nobody is assigned primary or backup for this station at all — either a crew too small
  // to cover all five roles (First Light's 2-person roster never assigns Incident Command or
  // Mission Command to begin with) or everyone who was has since died. That is not the same
  // as "nobody can respond": any surviving crew member still fights a fire or patches a leak
  // without a station badge, just less effectively than someone actually assigned there.
  const living = ctx.state.crew.filter((c) => c.alive);
  if (living.length === 0) return 0;
  const best = living.reduce((a, b) =>
    CONDITION_PERFORMANCE[condition(b)] > CONDITION_PERFORMANCE[condition(a)] ? b : a,
  );
  const solo = CONDITION_PERFORMANCE[condition(best)] * management.unassignedStationEmergencyPerformanceFraction.value;

  // A second living crew member helping an unassigned-station ad hoc response is a real,
  // felt improvement over one person working alone (management.secondResponderPerformanceBonusFraction's
  // own note) — added because a 2-person roster (First Light) otherwise leaves the *single*
  // best-conditioned crew member solely responsible for Incident Command/Mission Command
  // incidents even when a second, less-suited crew member is standing right there able to help.
  const withHelper = living.length > 1 ? solo * (1 + management.secondResponderPerformanceBonusFraction.value) : solo;

  return Math.max(0, Math.min(1, withHelper));
}
