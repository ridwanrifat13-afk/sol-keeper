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
 * 1.0 fully staffed and nominal, degrading with the coverer's condition and fatigue, 0 if
 * unstaffed. Feeds repair success probability (engine/incidents.ts) and, per-station rather
 * than as one pooled number, `availableCrewHours` (models/crew.ts) — the mechanism that
 * makes crew loss *felt* in gameplay, not just logged.
 */
export function stationPerformance(
  ctx: TickContext,
  station: StationId,
  condition: (member: CrewMember) => CrewCondition,
): number {
  const coverer = stationCoverer(ctx, station);
  if (coverer === undefined) return 0;

  const base = CONDITION_PERFORMANCE[condition(coverer)];
  const fatiguePenalty = isDoubleCovering(ctx, coverer) ? coverer.fatigueFraction * FATIGUE_PENALTY_AT_FULL : 0;
  return Math.max(0, base - fatiguePenalty);
}
