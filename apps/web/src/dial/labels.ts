/**
 * Friendly names for the ids and enums the simulation logs.
 *
 * `LogEntry.system` and `LogEntry.data.location`/`.crop` are stable machine identifiers —
 * `"co2Scrubber"`, `"stormShelter"`, `"lettuce"` — chosen so the sim never has to know how a
 * word is spelled in English or Bangla. Something has to turn them back into words before
 * they reach a player; that job lives here rather than in the sim (brief rule 4) and rather
 * than duplicated inline in every component that shows a system name.
 *
 * M11: every function takes an optional `language`, defaulting to `"en"` — the same
 * DRAFT/needsReview Bangla treatment as `i18n/logText.ts`'s new `_BN` tables (see
 * `docs/i18n/bn_review.csv`). The default keeps every existing English-only call site
 * (station consoles, DecisionCard, EsmPanel, ...) compiling unchanged; only the log/decision
 * text renderers pass `"bn"` explicitly once the player has chosen Bangla.
 */
import type {
  CommsPriority,
  Co2ScrubberMode,
  CropTray,
  CrewLocation,
  StationId,
  SurvivalMode,
  SystemId,
  ThermalControlMode,
  WaterReclamationMode,
} from "@sol-keeper/sim";
import type { DialLevel, Language } from "./types.js";

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

const SYSTEM_LABELS_BN: Record<SystemId, string> = {
  powerDistribution: "বিদ্যুৎ বণ্টন",
  lifeSupport: "লাইফ সাপোর্ট",
  co2Scrubber: "CO₂ স্ক্রাবার",
  thermalControl: "তাপ নিয়ন্ত্রণ",
  oxygenGenerator: "অক্সিজেন জেনারেটর",
  waterRecovery: "পানি পুনরুদ্ধার",
  moxie: "MOXIE (বাতাস থেকে অক্সিজেন)",
  greenhouse: "গ্রিনহাউস",
  comms: "যোগাযোগ",
};

const SYSTEM_LABELS_CADET_BN: Record<SystemId, string> = {
  powerDistribution: "বিদ্যুতের বাক্স",
  lifeSupport: "লাইফ সাপোর্ট",
  co2Scrubber: "বাতাস পরিষ্কারক",
  thermalControl: "হিটার",
  oxygenGenerator: "বাতাস তৈরির যন্ত্র",
  waterRecovery: "পানি পরিষ্কারক",
  moxie: "অক্সিজেন মেশিন",
  greenhouse: "বাগান",
  comms: "রেডিও",
};

export function systemLabel(id: SystemId, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") return level === "cadet" ? SYSTEM_LABELS_CADET_BN[id] : SYSTEM_LABELS_BN[id];
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

const LOCATION_LABELS_BN: Record<CrewLocation, string> = {
  habitat: "বাসস্থান",
  stormShelter: "ঝড় আশ্রয়কেন্দ্র",
  eva: "ইভিএ (বাসস্থানের বাইরে)",
};

const LOCATION_LABELS_CADET_BN: Record<CrewLocation, string> = {
  habitat: "ভেতরে",
  stormShelter: "নিরাপদ ঘর",
  eva: "বাইরে, স্পেসস্যুট পরে",
};

export function locationLabel(location: CrewLocation, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") return level === "cadet" ? LOCATION_LABELS_CADET_BN[location] : LOCATION_LABELS_BN[location];
  return level === "cadet" ? LOCATION_LABELS_CADET[location] : LOCATION_LABELS[location];
}

const CROP_EMOJI: Record<CropTray["crop"], string> = {
  lettuce: "🥬",
  wheat: "🌾",
  soybean: "🫘",
  potato: "🥔",
};

const CROP_LABELS_BN: Record<CropTray["crop"], string> = {
  lettuce: "লেটুস",
  wheat: "গম",
  soybean: "সয়াবিন",
  potato: "আলু",
};

/** Cadet gets an emoji alongside the crop name; the name itself needs no simplifying. */
export function cropLabel(crop: CropTray["crop"], level: DialLevel, language: Language = "en"): string {
  const name = language === "bn" ? CROP_LABELS_BN[crop] : crop;
  return level === "cadet" ? `${CROP_EMOJI[crop]} ${name}` : name;
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

const SURVIVAL_MODE_LABELS_BN: Record<SurvivalMode, string> = {
  nominal: "স্বাভাবিক",
  mode1: "হ্রাসকৃত",
  mode2: "সারভাইভাল",
};

const SURVIVAL_MODE_LABELS_CADET_BN: Record<SurvivalMode, string> = {
  nominal: "স্বাভাবিক খাবার পরিকল্পনা",
  mode1: "কম-খাবার পরিকল্পনা",
  mode2: "জরুরি পরিকল্পনা",
};

export function survivalModeLabel(mode: SurvivalMode, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") return level === "cadet" ? SURVIVAL_MODE_LABELS_CADET_BN[mode] : SURVIVAL_MODE_LABELS_BN[mode];
  return level === "cadet" ? SURVIVAL_MODE_LABELS_CADET[mode] : SURVIVAL_MODE_LABELS[mode];
}

/** Player request (M9.x): the CO2 scrubber duty-cycle control's own label — shared between
 *  LifeSupportConsole's buttons and the log text, same pattern as survivalModeLabel above. */
const CO2_SCRUBBER_MODE_LABELS: Record<Co2ScrubberMode, string> = {
  full: "Full scrub",
  balanced: "Balanced",
  eco: "Ease off for crops",
};

const CO2_SCRUBBER_MODE_LABELS_CADET: Record<Co2ScrubberMode, string> = {
  full: "clean the air all the way",
  balanced: "clean the air a little less",
  eco: "let the air help the plants",
};

const CO2_SCRUBBER_MODE_LABELS_BN: Record<Co2ScrubberMode, string> = {
  full: "পূর্ণ পরিষ্কারকরণ",
  balanced: "ভারসাম্যপূর্ণ",
  eco: "ফসলের জন্য কম পরিষ্কারকরণ",
};

const CO2_SCRUBBER_MODE_LABELS_CADET_BN: Record<Co2ScrubberMode, string> = {
  full: "বাতাস পুরোপুরি পরিষ্কার রাখুন",
  balanced: "বাতাস একটু কম পরিষ্কার করুন",
  eco: "বাতাসকে গাছপালাকে সাহায্য করতে দিন",
};

export function co2ScrubberModeLabel(mode: Co2ScrubberMode, level: DialLevel, language: Language = "en"): string {
  if (language === "bn")
    return level === "cadet" ? CO2_SCRUBBER_MODE_LABELS_CADET_BN[mode] : CO2_SCRUBBER_MODE_LABELS_BN[mode];
  return level === "cadet" ? CO2_SCRUBBER_MODE_LABELS_CADET[mode] : CO2_SCRUBBER_MODE_LABELS[mode];
}

/** Player request (M9.x batch 2): the water reclamation toggle's own label — same pattern as
 *  co2ScrubberModeLabel above. */
const WATER_RECLAMATION_MODE_LABELS: Record<WaterReclamationMode, string> = {
  baseline: "Standard recovery",
  brineProcessor: "Brine Processor Assembly",
};

const WATER_RECLAMATION_MODE_LABELS_CADET: Record<WaterReclamationMode, string> = {
  baseline: "recycle water normally",
  brineProcessor: "recycle almost all the water",
};

const WATER_RECLAMATION_MODE_LABELS_BN: Record<WaterReclamationMode, string> = {
  baseline: "মানক পুনরুদ্ধার",
  brineProcessor: "ব্রাইন প্রসেসর অ্যাসেম্বলি",
};

const WATER_RECLAMATION_MODE_LABELS_CADET_BN: Record<WaterReclamationMode, string> = {
  baseline: "স্বাভাবিকভাবে পানি পুনর্ব্যবহার করুন",
  brineProcessor: "প্রায় সব পানি পুনর্ব্যবহার করুন",
};

export function waterReclamationModeLabel(
  mode: WaterReclamationMode,
  level: DialLevel,
  language: Language = "en",
): string {
  if (language === "bn")
    return level === "cadet"
      ? WATER_RECLAMATION_MODE_LABELS_CADET_BN[mode]
      : WATER_RECLAMATION_MODE_LABELS_BN[mode];
  return level === "cadet" ? WATER_RECLAMATION_MODE_LABELS_CADET[mode] : WATER_RECLAMATION_MODE_LABELS[mode];
}

/** Player request (M9.x batch 2): the thermalControl duty-cycle toggle's own label — same
 *  pattern as co2ScrubberModeLabel above. */
const THERMAL_CONTROL_MODE_LABELS: Record<ThermalControlMode, string> = {
  comfort: "Comfort",
  powerSave: "Power-save",
};

const THERMAL_CONTROL_MODE_LABELS_CADET: Record<ThermalControlMode, string> = {
  comfort: "keep the cabin at the normal temperature",
  powerSave: "let the cabin run cooler to save power",
};

const THERMAL_CONTROL_MODE_LABELS_BN: Record<ThermalControlMode, string> = {
  comfort: "আরাম",
  powerSave: "বিদ্যুৎ সাশ্রয়",
};

const THERMAL_CONTROL_MODE_LABELS_CADET_BN: Record<ThermalControlMode, string> = {
  comfort: "কেবিন স্বাভাবিক তাপমাত্রায় রাখুন",
  powerSave: "বিদ্যুৎ বাঁচাতে কেবিন ঠান্ডা থাকতে দিন",
};

export function thermalControlModeLabel(
  mode: ThermalControlMode,
  level: DialLevel,
  language: Language = "en",
): string {
  if (language === "bn")
    return level === "cadet" ? THERMAL_CONTROL_MODE_LABELS_CADET_BN[mode] : THERMAL_CONTROL_MODE_LABELS_BN[mode];
  return level === "cadet" ? THERMAL_CONTROL_MODE_LABELS_CADET[mode] : THERMAL_CONTROL_MODE_LABELS[mode];
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

const STATION_LABELS_BN: Record<StationId, string> = {
  power: "পাওয়ার",
  lifeSupport: "লাইফ সাপোর্ট",
  comms: "কমস",
  incidentCommand: "ইনসিডেন্ট কমান্ড",
  missionCommand: "মিশন কমান্ড",
};

const STATION_LABELS_CADET_BN: Record<StationId, string> = {
  power: "পাওয়ার দল",
  lifeSupport: "বাতাস ও পানি দল",
  comms: "রেডিও দল",
  incidentCommand: "জরুরি দল",
  missionCommand: "ক্যাপ্টেন",
};

export function stationLabel(id: StationId, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") return level === "cadet" ? STATION_LABELS_CADET_BN[id] : STATION_LABELS_BN[id];
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

const COMMS_PRIORITY_LABELS_BN: Record<CommsPriority, string> = {
  science: "বিজ্ঞান ডাউনলিংক",
  personal: "ব্যক্তিগত বার্তা",
};

const COMMS_PRIORITY_LABELS_CADET_BN: Record<CommsPriority, string> = {
  science: "বিজ্ঞান তথ্য পাঠানো",
  personal: "বাড়িতে বার্তা পাঠানো",
};

export function commsPriorityLabel(priority: CommsPriority, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") {
    return level === "cadet" ? COMMS_PRIORITY_LABELS_CADET_BN[priority] : COMMS_PRIORITY_LABELS_BN[priority];
  }
  return level === "cadet" ? COMMS_PRIORITY_LABELS_CADET[priority] : COMMS_PRIORITY_LABELS[priority];
}
