/**
 * Friendly names for the ids and enums the simulation logs.
 *
 * `LogEntry.system` and `LogEntry.data.location`/`.crop` are stable machine identifiers —
 * `"co2Scrubber"`, `"stormShelter"`, `"lettuce"` — chosen so the sim never has to know how a
 * word is spelled in English or Bangla. Something has to turn them back into words before
 * they reach a player; that job lives here rather than in the sim (brief rule 4) and rather
 * than duplicated inline in every component that shows a system name.
 */
import type { CommsPriority, CropTray, CrewLocation, StationId, SurvivalMode, SystemId } from "@sol-keeper/sim";
import type { DialLevel } from "./types.js";

/** Full names, used at the specialist and commander levels. */
const SYSTEM_LABELS: Record<SystemId, string> = {
  powerDistribution: "Power distribution",
  lifeSupport: "Life support",
  co2Scrubber: "CO₂ scrubber",
  thermalControl: "Heating",
  oxygenGenerator: "Oxygen generator",
  waterRecovery: "Water recovery",
  moxie: "MOXIE (oxygen from air)",
  greenhouse: "Greenhouse",
  comms: "Comms",
};

/** Plain-word names for an 8-11 year old, at the cadet level. */
const SYSTEM_LABELS_CADET: Record<SystemId, string> = {
  powerDistribution: "the power box",
  lifeSupport: "life support",
  co2Scrubber: "the air cleaner",
  thermalControl: "the heater",
  oxygenGenerator: "the air maker",
  waterRecovery: "the water cleaner",
  moxie: "the air machine",
  greenhouse: "the garden",
  comms: "the radio",
};

export function systemLabel(id: SystemId, level: DialLevel): string {
  return level === "cadet" ? SYSTEM_LABELS_CADET[id] : SYSTEM_LABELS[id];
}

const LOCATION_LABELS: Record<CrewLocation, string> = {
  habitat: "the habitat",
  stormShelter: "the storm shelter",
  eva: "an EVA (outside the habitat)",
};

const LOCATION_LABELS_CADET: Record<CrewLocation, string> = {
  habitat: "inside",
  stormShelter: "the safe room",
  eva: "outside, in a spacesuit",
};

export function locationLabel(location: CrewLocation, level: DialLevel): string {
  return level === "cadet" ? LOCATION_LABELS_CADET[location] : LOCATION_LABELS[location];
}

const CROP_EMOJI: Record<CropTray["crop"], string> = {
  lettuce: "🥬",
  wheat: "🌾",
  soybean: "🫘",
  potato: "🥔",
};

/** Cadet gets an emoji alongside the crop name; the name itself needs no simplifying. */
export function cropLabel(crop: CropTray["crop"], level: DialLevel): string {
  return level === "cadet" ? `${CROP_EMOJI[crop]} ${crop}` : crop;
}

/**
 * The OCHMO survival mode a player selected. Shared between the ration buttons in
 * OperateView and the log text, so both always describe the same mode the same way.
 */
const SURVIVAL_MODE_LABELS: Record<SurvivalMode, string> = {
  nominal: "Nominal",
  mode1: "Reduced",
  mode2: "Survival",
};

const SURVIVAL_MODE_LABELS_CADET: Record<SurvivalMode, string> = {
  nominal: "the normal food plan",
  mode1: "the less-food plan",
  mode2: "the emergency plan",
};

export function survivalModeLabel(mode: SurvivalMode, level: DialLevel): string {
  return level === "cadet" ? SURVIVAL_MODE_LABELS_CADET[mode] : SURVIVAL_MODE_LABELS[mode];
}

/** M8.2: the crew role that owns an incident's Decision Card (IncidentDefinition.station). */
const STATION_LABELS: Record<StationId, string> = {
  power: "Power",
  lifeSupport: "Life Support",
  comms: "Comms",
  incidentCommand: "Incident Command",
  missionCommand: "Mission Command",
};

const STATION_LABELS_CADET: Record<StationId, string> = {
  power: "the Power team",
  lifeSupport: "the Air & Water team",
  comms: "the Radio team",
  incidentCommand: "the Emergency team",
  missionCommand: "the Captain",
};

export function stationLabel(id: StationId, level: DialLevel): string {
  return level === "cadet" ? STATION_LABELS_CADET[id] : STATION_LABELS[id];
}

/** M8.4 Part C's own downlink-priority choice (`views/Comms/CommsConsole.tsx`), reused
 *  here (M10.8) so the decision-timeline log text never disagrees with the console's own
 *  wording for the same two values. */
const COMMS_PRIORITY_LABELS: Record<CommsPriority, string> = {
  science: "Science downlink",
  personal: "Personal correspondence",
};

const COMMS_PRIORITY_LABELS_CADET: Record<CommsPriority, string> = {
  science: "sending science data",
  personal: "sending messages home",
};

export function commsPriorityLabel(priority: CommsPriority, level: DialLevel): string {
  return level === "cadet" ? COMMS_PRIORITY_LABELS_CADET[priority] : COMMS_PRIORITY_LABELS[priority];
}
