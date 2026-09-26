/**
 * M10.8: the Mission Report's "What NASA did" card(s) — text-only, from `IncidentDefinition
 * .analogue` and the incident's own cited source, never a network or image fetch and never a
 * fact this file invents: both fields already exist verbatim on `IncidentDefinition`
 * (packages/sim/src/engine/incidents.ts) and `SOURCE_REGISTRY` (apps/web/src/data/
 * sourceRegistry.ts), which every constant's own citation already goes through.
 */
import { INCIDENT_CATALOG, type SimState } from "@sol-keeper/sim";
import { SOURCE_REGISTRY } from "../data/sourceRegistry.js";

export interface WhatNasaDidCard {
  readonly incidentId: string;
  readonly analogue: string;
  readonly title: string;
  readonly url: string | undefined;
}

/** One card per incident that actually triggered this run. `state.activeIncidents` never
 *  holds two entries for the same `IncidentDefinition` (`incidentsStage`'s own
 *  `alreadyTriggered` guard), so this is naturally deduplicated without needing to check. */
export function whatNasaDidCards(activeIncidents: SimState["activeIncidents"]): WhatNasaDidCard[] {
  return activeIncidents.flatMap((incident) => {
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined) return [];
    const source = SOURCE_REGISTRY[def.sourceId];
    return [{ incidentId: incident.id, analogue: def.analogue, title: source.title, url: source.url }];
  });
}
