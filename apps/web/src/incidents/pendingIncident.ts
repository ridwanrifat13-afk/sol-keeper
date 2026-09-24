/**
 * Which incident (if any) should show a Decision Card right now.
 *
 * An incident is "pending" once it has been detected — `incidentsStage`'s own detection
 * roll can leave it undetected indefinitely on an unstaffed station, in which case it has no
 * UI presence yet, the same way a bot never gets offered it either (see `tickWithBot`'s own
 * `detectedAtHour === undefined` guard, packages/sim/src/engine/runWithBot.ts) — and not yet
 * resolved (`chosenResponseId === undefined`; a failed attempt clears this back to `undefined`
 * for a genuine retry, so it becomes pending again rather than staying silently stuck).
 *
 * Only one Decision Card shows at a time, oldest first — `triggeredAtHour` order, not
 * `detectedAtHour` order, since the incident that has been running longest is the one most in
 * need of an answer.
 */
import { INCIDENT_CATALOG, type ActiveIncident, type IncidentDefinition, type SimState } from "@sol-keeper/sim";

export interface PendingIncident {
  readonly incident: ActiveIncident;
  readonly definition: IncidentDefinition;
}

export function selectPendingIncident(state: SimState): PendingIncident | undefined {
  const pending = state.activeIncidents
    .filter((i) => i.detectedAtHour !== undefined && i.chosenResponseId === undefined)
    .sort((a, b) => a.triggeredAtHour - b.triggeredAtHour);

  const incident = pending[0];
  if (incident === undefined) return undefined;

  const definition = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
  if (definition === undefined) return undefined;

  return { incident, definition };
}
