/**
 * The end-of-sol summary (brief's M8 core loop: "3 lines max, one per station that acted").
 * Reuses blackBox.ts's own `majorIncidents` significance definition (an entry the engine
 * recorded as the direct cause of at least one other) rather than a second, new heuristic for
 * "what mattered" — the same discipline the Debrief already follows.
 */
import { INCIDENT_CATALOG, SYSTEM_TO_STATION, type LogEntry, type StationId } from "@sol-keeper/sim";
import { majorIncidents } from "./blackBox.js";

const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, caution: 2, info: 1 };

/** Which station owns a log entry, if any. System-tagged entries map through
 *  `SYSTEM_TO_STATION`; incident entries follow the codebase-wide `incident.<id>.<event>`
 *  naming convention to look their own `IncidentDefinition.station` up — not every entry
 *  resolves to a station (mission-wide entries like `end.missionComplete` do not), and those
 *  are simply not represented in this summary, an honest limitation rather than a guess. */
function stationForEntry(entry: LogEntry): StationId | undefined {
  if (entry.system !== undefined) return SYSTEM_TO_STATION[entry.system];
  const match = /^incident\.([a-z0-9-]+)\./.exec(entry.code);
  if (match?.[1] !== undefined) {
    const def = INCIDENT_CATALOG.find((d) => d.id === match[1]);
    if (def !== undefined) return def.station;
  }
  return undefined;
}

export interface SolSummaryLine {
  readonly station: StationId;
  readonly entry: LogEntry;
}

/**
 * Up to 3 lines for the sol spanning `(startHour, endHour]`, one per station, most severe
 * stations first. `log` should be the *whole* run's log, not a pre-sliced window — the
 * causal analysis `majorIncidents` does needs the full history to find an entry's effects,
 * even when the effect itself lands outside this window.
 */
export function solSummaryLines(
  log: readonly LogEntry[],
  startHour: number,
  endHour: number,
): readonly SolSummaryLine[] {
  const significant = majorIncidents(log).filter((e) => e.hour > startHour && e.hour <= endHour);

  const bestPerStation = new Map<StationId, LogEntry>();
  for (const entry of significant) {
    const station = stationForEntry(entry);
    if (station === undefined) continue;
    const existing = bestPerStation.get(station);
    if (existing === undefined || (SEVERITY_RANK[entry.severity] ?? 0) > (SEVERITY_RANK[existing.severity] ?? 0)) {
      bestPerStation.set(station, entry);
    }
  }

  return [...bestPerStation.entries()]
    .map(([station, entry]) => ({ station, entry }))
    .sort((a, b) => (SEVERITY_RANK[b.entry.severity] ?? 0) - (SEVERITY_RANK[a.entry.severity] ?? 0))
    .slice(0, 3);
}
