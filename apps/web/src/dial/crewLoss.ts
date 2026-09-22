import type { DialLevel } from "./types.js";

/**
 * The exact crew-loss wording the Phase 2 brief specifies, word for word — not a paraphrase
 * logText.ts's per-cause mission-log lines are free to elaborate on. This is the one string
 * shown prominently the moment a crew member is lost (the Debrief headline, a future
 * Decision Card banner), where the brief's own quoted text is the requirement itself.
 */
export function crewLossHeadline(crewName: string, level: DialLevel): string {
  return level === "cadet"
    ? `${crewName} became too sick to continue. The mission had to end.`
    : `${crewName} was lost.`;
}
