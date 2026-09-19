/**
 * The two derived views the Black Box debrief is built from, pulled out of DebriefView.tsx
 * so they are testable against a plain array of log entries — no SimState, no store, no
 * render — which matters because the claims they encode are exactly the ones worth getting
 * wrong quietly: "this really is what the engine recorded," not "this looks about right."
 */
import { directEffects, type LogEntry } from "@sol-keeper/sim";

/**
 * An incident is any entry the engine recorded as the cause of at least one other entry.
 * Deliberately not a hardcoded list of hazard codes: that would need updating every time a
 * new hazard type is added, and could silently claim a causal link for a code that, on
 * inspection, the engine never actually wired up. This definition can't be wrong that way —
 * it can only ever report exactly what `causedBy` really contains.
 */
export function majorIncidents(log: readonly LogEntry[]): LogEntry[] {
  return log.filter((e) => directEffects(log, e.id).length > 0);
}

export interface IncidentGroup {
  readonly code: string;
  readonly firstHour: number;
  readonly lastHour: number;
  readonly count: number;
  readonly sample: LogEntry;
  readonly totalDirectEffects: number;
}

/**
 * Collapses a run of consecutive incidents that share a code into one group.
 *
 * A sustained dust storm re-triggers `power.brownout` every time the exact set of shed
 * systems changes — a real 30-sol run produced 85 separate brownout entries during one
 * storm, each individually a genuine root cause, but 85 rows is not a debrief, it's the raw
 * log again. Grouping is presentation only: `majorIncidents` above is untouched, so nothing
 * about what counts as an incident changes, only how a run of the same one is displayed.
 * Grouping strictly by adjacency (not by code globally) keeps the result in chronological
 * order — a pump failure in the middle of a brownout run splits it into two groups rather
 * than being skipped over.
 */
export function groupIncidents(
  incidents: readonly LogEntry[],
  log: readonly LogEntry[],
): IncidentGroup[] {
  const groups: IncidentGroup[] = [];
  for (const entry of incidents) {
    const effects = directEffects(log, entry.id).length;
    const last = groups[groups.length - 1];
    if (last !== undefined && last.code === entry.code) {
      groups[groups.length - 1] = {
        ...last,
        lastHour: entry.hour,
        count: last.count + 1,
        totalDirectEffects: last.totalDirectEffects + effects,
      };
    } else {
      groups.push({
        code: entry.code,
        firstHour: entry.hour,
        lastHour: entry.hour,
        count: 1,
        sample: entry,
        totalDirectEffects: effects,
      });
    }
  }
  return groups;
}

export interface ConditionGroup {
  readonly code: string;
  readonly firstHour: number;
  readonly lastHour: number;
  readonly count: number;
  readonly sample: LogEntry;
}

const GLOBAL_HAZARD_CODES: ReadonlySet<string> = new Set([
  "power.brownout",
  "power.batteryDepleted",
  "thermal.freezeRisk",
  "atmosphere.lowOxygen",
  "atmosphere.co2AboveLimit",
  "water.belowOneDayReserve",
  "food.exhausted",
  "food.lowReserve",
  "radiation.aboveDesignTarget",
]);

/**
 * Severe or warning entries in the `windowHours` before `deathEntry`, naming the same crew
 * member or a mission-wide hazard, grouped by code. This is deliberately framed as
 * "conditions in the preceding window," not "the cause of death": `crew.lost` carries no
 * `causedBy` today, because health decline is the cumulative result of several models
 * applying penalties hour by hour, not one traceable event. Presenting this list as proven
 * causation would overclaim what the engine actually establishes.
 */
export function crewLossConditions(
  deathEntry: LogEntry,
  log: readonly LogEntry[],
  windowHours: number,
): ConditionGroup[] {
  const crewName = deathEntry.data["crew"];
  const windowStart = deathEntry.hour - windowHours;

  const relevant = log.filter(
    (e) =>
      e.id !== deathEntry.id &&
      e.hour > windowStart &&
      e.hour <= deathEntry.hour &&
      (e.severity === "critical" || e.severity === "warning") &&
      (e.data["crew"] === crewName || GLOBAL_HAZARD_CODES.has(e.code)),
  );

  const byCode = new Map<string, ConditionGroup>();
  for (const e of relevant) {
    const existing = byCode.get(e.code);
    if (existing === undefined) {
      byCode.set(e.code, { code: e.code, firstHour: e.hour, lastHour: e.hour, count: 1, sample: e });
    } else {
      byCode.set(e.code, {
        ...existing,
        firstHour: Math.min(existing.firstHour, e.hour),
        lastHour: Math.max(existing.lastHour, e.hour),
        count: existing.count + 1,
      });
    }
  }
  return [...byCode.values()];
}
