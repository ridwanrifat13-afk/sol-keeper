/**
 * The First Light coach-mark tutorial (M8.7, brief: "first launch runs the 'First Light'
 * tutorial with coach marks, introducing one station at a time"). Same three-level-table
 * shape as gaugeHelp.ts/logText.ts — one short line per station, per Reality Dial level,
 * explaining what that console is for rather than repeating its tab label.
 *
 * Station order here is the brief's own explicit tutorial order (Power, Life Support,
 * Incident Command, Comms, Mission Command) — it is NOT the tab bar's left-to-right order
 * (Power, Life Support, Comms, Incident Command, Mission Command); see CLAUDE.md's Station
 * section for why these are separate concepts that must not be conflated.
 */
import type { StationId } from "@sol-keeper/sim";
import type { DialLevel } from "../dial/types.js";

export const COACH_MARK_ORDER: readonly StationId[] = [
  "power",
  "lifeSupport",
  "incidentCommand",
  "comms",
  "missionCommand",
];

type TemplateTable = Record<StationId, string>;

const SPECIALIST: TemplateTable = {
  power: "Power: generation, battery, and which systems shed load first if demand outruns supply.",
  lifeSupport: "Life Support: oxygen, CO₂, water, food, and cabin temperature — the crew's survival margins.",
  incidentCommand: "Incident Command: where you resolve incidents as they're detected, and set crew shelter/EVA status.",
  comms: "Comms: the Earth link, light-time delay, and what gets downlink priority during a blackout.",
  missionCommand: "Mission Command: crew station assignments, the daily plan, and progress toward mission goals.",
};

const CADET: TemplateTable = {
  power: "Power: keeps the lights and the base running.",
  lifeSupport: "Life Support: keeps the crew breathing, fed, and warm.",
  incidentCommand: "Incident Command: this is where you fix problems when they happen.",
  comms: "Comms: talking to Earth, even with a delay.",
  missionCommand: "Mission Command: who's doing what, and how the mission is going.",
};

const COMMANDER: TemplateTable = {
  power: "Power: generation/demand balance, battery state of charge, and the load-shed priority order.",
  lifeSupport: "Life Support: pO₂/pCO₂, potable water and food margins, and habitat thermal control.",
  incidentCommand: "Incident Command: response queue for detected incidents; per-crew habitat/shelter/EVA state.",
  comms: "Comms: light-time delay and downlink priority ranking, binding only during a blackout window.",
  missionCommand: "Mission Command: station coverage and assignment, the sol's rollup plan, and scored goal progress.",
};

const TABLES: Record<DialLevel, TemplateTable> = {
  cadet: CADET,
  specialist: SPECIALIST,
  commander: COMMANDER,
};

export function coachMarkText(station: StationId, level: DialLevel): string {
  return TABLES[level][station];
}
