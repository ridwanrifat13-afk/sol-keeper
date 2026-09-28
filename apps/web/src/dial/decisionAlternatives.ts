/**
 * Player request #6: a Mission log entry that recorded a resolved incident should be able to
 * say what else was on the table — not just "why" (EventFeed.tsx's existing `causedBy` chain)
 * but "what could've been done instead."
 *
 * `incident.<id>.resolved`'s own `data.response` (engine/incidents.ts's `resolveResponseAttempt`/
 * `applyDefaultResponse`) already names exactly which `IncidentResponse` was chosen. The other
 * responses `IncidentDefinition.responses` declares were real, available options the player (or
 * bot) didn't take — this never invents a counterfactual outcome, it only surfaces the same
 * declared trade-off fields (`crewHoursCost`/`sparesCost`/`permanentPenalty`/`leavesOngoing`)
 * DecisionCard.tsx already renders for the option that WAS chosen, for the ones that weren't.
 */
import { INCIDENT_CATALOG, type IncidentResponse, type LogEntry } from "@sol-keeper/sim";
import type { DialLevel, Language } from "./types.js";
import { systemLabel } from "./labels.js";
import {
  crewHoursCostPhrase,
  decisionText,
  hasDecisionTemplate,
  leavesOngoingPhrase,
  permanentPenaltyPhrase,
  sparesCostPhrase,
} from "../i18n/decisionText.js";

const RESOLVED_CODE = /^incident\.([a-z0-9-]+)\.resolved$/;

export interface DecisionAlternative {
  readonly id: string;
  readonly text: string;
  readonly mechanism?: string;
  readonly tradeoffs: readonly string[];
}

/**
 * Returns the responses NOT chosen for a resolved-incident log entry, or `undefined` when
 * `entry` isn't one (most entries aren't — this only ever matches `incident.*.resolved`).
 */
export function decisionAlternatives(
  entry: LogEntry,
  level: DialLevel,
  language: Language = "en",
): readonly DecisionAlternative[] | undefined {
  const match = RESOLVED_CODE.exec(entry.code);
  if (match === null) return undefined;
  const defId = match[1];
  const definition = INCIDENT_CATALOG.find((d) => d.id === defId);
  if (definition === undefined) return undefined;

  const chosenId = entry.data["response"];
  const alternatives = definition.responses.filter((r) => r.id !== chosenId);
  if (alternatives.length === 0) return undefined;

  return alternatives.map((response) => tradeoffLines(response, level, language));
}

function tradeoffLines(response: IncidentResponse, level: DialLevel, language: Language): DecisionAlternative {
  const tradeoffs: string[] = [];
  if (response.crewHoursCost !== undefined && response.crewHoursCost > 0) {
    tradeoffs.push(crewHoursCostPhrase(level, response.crewHoursCost, language));
  }
  if (response.sparesCost !== undefined && response.sparesCost > 0 && response.sparesFromSystem !== undefined) {
    tradeoffs.push(sparesCostPhrase(level, response.sparesCost, systemLabel(response.sparesFromSystem, level, language), language));
  }
  if (response.permanentPenalty === true) tradeoffs.push(permanentPenaltyPhrase(level, language));
  if (response.leavesOngoing === true) tradeoffs.push(leavesOngoingPhrase(level, language));

  const mechanismKey = `${response.i18nKey}.mechanism`;
  const mechanism = hasDecisionTemplate(mechanismKey, level, language)
    ? decisionText(mechanismKey, level, undefined, language)
    : undefined;

  return {
    id: response.id,
    text: decisionText(response.i18nKey, level, undefined, language),
    ...(mechanism !== undefined ? { mechanism } : {}),
    tradeoffs,
  };
}
