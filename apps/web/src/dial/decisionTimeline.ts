/**
 * M10.8: the Mission Report's "decision timeline tagged by station" — every `kind:
 * "decision"` log entry, paired with the station whose console owns that kind of choice.
 * Reads only the log's own stable `kind`/`code` (never rendered prose, brief rule 4), so this
 * can never drift from what `packages/sim`'s `applyInput`/`incidentsStage` actually log.
 */
import { INCIDENT_CATALOG, type LogEntry, type StationId } from "@sol-keeper/sim";

/** The five player decisions `applyInput` (packages/sim/src/engine/replay.ts) logs, mapped
 *  to the console that actually owns each control — PowerPriorities (power), rations on
 *  LifeSupportConsole (lifeSupport), the shelter/EVA control on IncidentCommandConsole
 *  (incidentCommand), crew assignment on MissionCommandConsole (missionCommand), and the
 *  downlink-priority control on CommsConsole (comms). */
const DECISION_CODE_STATION: Readonly<Record<string, StationId>> = {
  "decision.rations.set": "lifeSupport",
  "decision.priority.changed": "power",
  "decision.crewLocation.set": "incidentCommand",
  "decision.station.assigned": "missionCommand",
  "decision.commsPriority.set": "comms",
  // Player request (M9.x): the CO2 scrubber duty-cycle control, on the same console rations
  // lives on.
  "decision.co2ScrubberMode.set": "lifeSupport",
  // Player request (M9.x): routine array cleaning, a Power console action.
  "decision.cleanSolarArrays.performed": "power",
  "decision.cleanSolarArrays.insufficientTime": "power",
  // Player request (M9.x batch 2): the Brine Processor Assembly toggle, on the same console
  // rations/the CO2 scrubber live on.
  "decision.waterReclamationMode.set": "lifeSupport",
  // Player request (M9.x batch 2): thermalControl's duty-cycle toggle, same console.
  "decision.thermalControlMode.set": "lifeSupport",
  // Player request (M9.x batch 2): a whole-crew scheduling policy, Mission Command's console.
  "decision.overtimeAuthorized.set": "missionCommand",
  // Player request: the Habitat page's scheduled-maintenance lever applies to any system, not
  // one station's own hardware — tagged missionCommand, the same cross-cutting-policy bucket
  // overtimeAuthorized above already uses, rather than invented as a sixth station.
  "decision.scheduledMaintenance.performed": "missionCommand",
  "decision.scheduledMaintenance.insufficientTime": "missionCommand",
  // Player request: Incident Command's repair/spares interactivity.
  "decision.printSpare.started": "incidentCommand",
  "decision.printSpare.insufficientTime": "incidentCommand",
  "decision.printSpare.completed": "incidentCommand",
  "decision.reorderRepairQueue.changed": "incidentCommand",
};

/** An incident-response decision (`incident.<id>.resolved`/`.detected`/`.queued`/
 *  `.responseFailed`/`.responseImpossible`) is tagged with that incident's own
 *  `IncidentDefinition.station` — the same station its Decision Card was shown under. No
 *  catalog id is ever a prefix of another (same fact `share/runLink.ts`'s own incident-id
 *  parsing relies on), so a single `startsWith` match is unambiguous. */
function stationForIncidentCode(code: string): StationId | undefined {
  return INCIDENT_CATALOG.find((def) => code.startsWith(`incident.${def.id}.`))?.station;
}

export function stationForDecision(entry: LogEntry): StationId | undefined {
  return DECISION_CODE_STATION[entry.code] ?? stationForIncidentCode(entry.code);
}

export interface StationedDecision {
  readonly entry: LogEntry;
  readonly station: StationId | undefined;
}

/** Every decision-kind entry on the log, in the order the log already holds them (append-only,
 *  brief rule 4 — never re-sorted), each tagged with the station that owns it. `station` is
 *  `undefined` only for a code neither table above recognises, which validation/
 *  decisionTimeline.test.ts guards against ever silently happening for a real logged code. */
export function decisionTimeline(log: readonly LogEntry[]): StationedDecision[] {
  return log.filter((e) => e.kind === "decision").map((entry) => ({ entry, station: stationForDecision(entry) }));
}
