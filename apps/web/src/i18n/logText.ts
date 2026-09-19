/**
 * Renders a log entry's `code` + `data` into English, at a chosen Reality Dial level.
 *
 * The simulation never stores prose (brief rule 4) — only stable codes and numbers. That is
 * what makes this file possible: three complete tables below, keyed the way the brief and
 * ARCHITECTURE.md specify (`log.<code>.<level>`), rendering the exact same log entries three
 * different ways. At M5 each table moves into en.json beside a bn.json built the same shape.
 *
 * `{system}`, `{location}` and `{crop}` are interpolated through dial/labels.ts rather than
 * printed as the raw machine id the sim actually stores (`"co2Scrubber"`, `"stormShelter"`).
 * Every other placeholder is printed as the sim gave it.
 */
import type { CropTray, CrewLocation, LogEntry, SurvivalMode, SystemId } from "@sol-keeper/sim";
import { cropLabel, locationLabel, survivalModeLabel, systemLabel } from "../dial/labels.js";
import type { DialLevel } from "../dial/types.js";

type TemplateTable = Record<string, string>;

/** Ages 12-14. Real units, the level M2 shipped as the only one. */
const SPECIALIST: TemplateTable = {
  "power.brownout":
    "Brownout: demand {demandKw} kW, only {servedKw} kW available. {shedCount} system(s) shut down.",
  "power.systemShed": "{system} lost power ({powerKw} kW).",
  "power.batteryDepleted": "Battery empty while generation ({generationKw} kW) is below demand.",

  "thermal.heaterUnpowered": "Heater has no power. Cabin at {habitatTempC} °C.",
  "thermal.freezeRisk": "Cabin down to {habitatTempC} °C — water lines may freeze.",

  "atmosphere.scrubberOffline": "CO₂ scrubber offline. {co2Kg} kg of CO₂ in the cabin.",
  "atmosphere.co2AboveLimit": "CO₂ at {co2MmHg} mmHg, above the {limitMmHg} mmHg limit.",
  "atmosphere.lowOxygen": "Oxygen down to {o2MmHg} mmHg.",

  "water.recoveryOffline": "Water recovery offline — losing {lostPerHourKg} kg an hour.",
  "water.belowOneDayReserve": "Under one day of water left ({potableKg} kg for {crew} crew).",
  "water.insufficientForElectrolysis":
    "Not enough water to make oxygen: needed {neededKg} kg, have {availableKg} kg.",

  "food.growLightsOff": "Grow lights off — {trays} tray(s) not growing.",
  "food.lowReserve": "Food down to {daysRemaining} days ({storedKg} kg).",
  "food.exhausted": "Food stores are empty.",
  "food.harvest": "Harvested {harvestKg} kg of {crop} from {tray}.",

  "radiation.aboveDesignTarget":
    "Dose rate {rateMSvPerDay} mSv/day, above the {targetMSvPerDay} mSv/day target.",
  "radiation.careerLimitExceeded":
    "{crew} has passed the {limitMSv} mSv career limit ({doseMSv} mSv).",
  "radiation.eventLimitExceeded": "{crew} has passed the {limitMGyEq} mGy-Eq storm limit.",

  "crew.cold": "{crew} is cold — cabin at {habitatTempC} °C.",
  "crew.noWater": "{crew} has no water.",
  "crew.lost": "{crew} has been lost.",

  "hazard.dustStorm.start": "Dust storm begins — expected to last {durationHours} hours.",
  "hazard.dustStorm.obscuring": "Dust covering {obscuration} of the arrays.",
  "hazard.solarParticleEvent.start": "Solar particle event — get the crew to the shelter.",
  "hazard.spe.crewExposed": "{crew} is exposed in {location}.",
  "hazard.pumpFailure.start": "A pump has failed.",
  "hazard.pumpFailure": "{system} pump failed.",
  "hazard.cropBlight.start": "Crop blight detected.",
  "hazard.cropBlight": "{tray} ({crop}) blighted — health {healthFraction}.",

  "system.failure": "{system} failed (TRL {trl}, {spares} spare(s) left).",
  "system.repaired": "{system} repaired. {sparesRemaining} spare(s) left.",

  "isru.passedMoxieMissionTotal":
    "Your MOXIE has now made {producedG} g of oxygen — more than the real one made in its entire mission ({moxieMissionTotalG} g).",

  "comms.blackoutStart": "Solar conjunction — no link to Earth for about {durationDays} days.",
  "comms.blackoutEnd": "Link to Earth restored ({oneWayLightSeconds} s each way).",

  "end.missionComplete": "Mission complete: {sols} sols, {crewSurviving} crew home safe.",
  "end.crewLost": "Mission lost at hour {hour}.",
};

/** Ages 8-11. Plain words, no raw units, present tense, encouraging where it can be. */
const CADET: TemplateTable = {
  "power.brownout": "Not enough power! {shedCount} thing(s) had to switch off.",
  "power.systemShed": "{system} switched off to save power.",
  "power.batteryDepleted": "The batteries are empty and there isn't enough power coming in.",

  "thermal.heaterUnpowered": "The heater has no power. It's getting cold.",
  "thermal.freezeRisk": "It's freezing in here! The water pipes could freeze.",

  "atmosphere.scrubberOffline": "The air cleaner is off. Bad air is building up.",
  "atmosphere.co2AboveLimit": "Too much bad air in the cabin.",
  "atmosphere.lowOxygen": "Getting short on air to breathe.",

  "water.recoveryOffline": "The water cleaner is off — water is being wasted.",
  "water.belowOneDayReserve": "Only about a day of water left!",
  "water.insufficientForElectrolysis": "Not enough water left to make more air.",

  "food.growLightsOff": "The garden lights are off — plants aren't growing.",
  "food.lowReserve": "Food is running low.",
  "food.exhausted": "There's no food left!",
  "food.harvest": "Picked some {crop} from the garden!",

  "radiation.aboveDesignTarget": "Getting more space radiation than usual.",
  "radiation.careerLimitExceeded": "{crew} has had too much space radiation over the mission.",
  "radiation.eventLimitExceeded": "{crew} got too much radiation from the storm.",

  "crew.cold": "{crew} is cold.",
  "crew.noWater": "{crew} has no water to drink.",
  "crew.lost": "{crew} could not be saved.",

  "hazard.dustStorm.start": "A dust storm is starting! It will block sunlight for a while.",
  "hazard.dustStorm.obscuring": "Dust is covering the solar panels.",
  "hazard.solarParticleEvent.start": "A solar storm is coming — get everyone to the safe room!",
  "hazard.spe.crewExposed": "{crew} isn't in the safe room during the storm.",
  "hazard.pumpFailure.start": "A pump just broke!",
  "hazard.pumpFailure": "{system} isn't working.",
  "hazard.cropBlight.start": "Something is making the plants sick.",
  "hazard.cropBlight": "The {crop} got sick.",

  "system.failure": "{system} broke down.",
  "system.repaired": "{system} is fixed again!",

  "isru.passedMoxieMissionTotal":
    "Your air machine has now made more oxygen than the real MOXIE made on its whole mission!",

  "comms.blackoutStart": "The Sun is blocking the signal — no messages from Earth for a while.",
  "comms.blackoutEnd": "You can talk to Earth again!",

  "end.missionComplete": "You did it! Everyone made it through {sols} sols safely.",
  "end.crewLost": "The mission could not continue.",
};

/** Ages 15+. Same facts, framed with the vocabulary an operator would actually use. */
const COMMANDER: TemplateTable = {
  "power.brownout":
    "Load shed: demand {demandKw} kW vs. {servedKw} kW served, battery at {batteryKwh} kWh. {shedCount} system(s) dropped.",
  "power.systemShed": "{system} dropped from the bus ({powerKw} kW nominal).",
  "power.batteryDepleted": "State of charge at zero; generation {generationKw} kW below demand.",

  "thermal.heaterUnpowered": "Thermal control unpowered. Cabin {habitatTempC} °C, drifting toward ambient.",
  "thermal.freezeRisk": "Cabin at {habitatTempC} °C, below the {thresholdC} °C freeze-risk threshold.",

  "atmosphere.scrubberOffline": "CO₂ scrubber offline; {co2Kg} kg CO₂ accumulating unchecked.",
  "atmosphere.co2AboveLimit": "pCO₂ {co2MmHg} mmHg exceeds the {limitMmHg} mmHg {mode} threshold.",
  "atmosphere.lowOxygen": "pO₂ {o2MmHg} mmHg — approaching hypoxic range.",

  "water.recoveryOffline": "Water recovery offline; loop loss {lostPerHourKg} kg/h uncompensated.",
  "water.belowOneDayReserve": "Potable reserve {potableKg} kg — under 24 h at current draw for {crew} crew.",
  "water.insufficientForElectrolysis":
    "Electrolysis infeasible: {neededKg} kg required, {availableKg} kg on hand.",

  "food.growLightsOff": "Photoperiod interrupted — {trays} tray(s) accruing no light-hours.",
  "food.lowReserve": "Dry mass reserve {daysRemaining} d ({storedKg} kg) at the current ration.",
  "food.exhausted": "Dry mass reserve depleted.",
  "food.harvest": "Tray {tray} ({crop}) harvested: {harvestKg} kg dry mass.",

  "radiation.aboveDesignTarget":
    "Dose rate {rateMSvPerDay} mSv/day exceeds the NASA-STD-3001 {targetMSvPerDay} mSv/day surface design target.",
  "radiation.careerLimitExceeded":
    "{crew}: cumulative dose {doseMSv} mSv exceeds the {limitMSv} mSv career limit (NASA-STD-3001).",
  "radiation.eventLimitExceeded":
    "{crew}: event dose exceeds the {limitMGyEq} mGy-Eq 30-day SPE threshold.",

  "crew.cold": "{crew}: cold stress, cabin {habitatTempC} °C.",
  "crew.noWater": "{crew}: zero potable water available.",
  "crew.lost": "{crew}: health reached zero at hour {hour}.",

  "hazard.dustStorm.start": "Dust storm onset, ETA {durationHours} h duration, magnitude {magnitude}.",
  "hazard.dustStorm.obscuring": "Array obscuration at {obscuration}.",
  "hazard.solarParticleEvent.start": "SPE onset — shelter crew behind maximum available shielding.",
  "hazard.spe.crewExposed": "{crew} unshielded in {location} during SPE.",
  "hazard.pumpFailure.start": "Stochastic pump failure event triggered.",
  "hazard.pumpFailure": "{system}: pump failure, offline.",
  "hazard.cropBlight.start": "Crop blight event, magnitude {magnitude}.",
  "hazard.cropBlight": "{tray} ({crop}): health fraction reduced to {healthFraction}.",

  "system.failure": "{system} failure (TRL {trl}; {spares} spare(s) remaining).",
  "system.repaired": "{system} restored from spares; {sparesRemaining} remaining.",

  "isru.passedMoxieMissionTotal":
    "Cumulative ISRU O₂ output {producedG} g exceeds MOXIE's flight total of {moxieMissionTotalG} g.",

  "comms.blackoutStart": "Solar conjunction blackout, ~{durationDays} d, per the ~780 d synodic cycle.",
  "comms.blackoutEnd": "Link restored, one-way light time {oneWayLightSeconds} s.",

  "end.missionComplete": "Mission complete: {sols} sols elapsed, {crewSurviving} crew surviving.",
  "end.crewLost": "Mission terminated: crew complement zero at hour {hour}.",
};

const TABLES: Record<DialLevel, TemplateTable> = {
  cadet: CADET,
  specialist: SPECIALIST,
  commander: COMMANDER,
};

function resolveField(entry: LogEntry, key: string, level: DialLevel): string {
  if (key === "system") {
    const id = entry.system ?? (entry.data["system"] as SystemId | undefined);
    return id === undefined ? "" : systemLabel(id, level);
  }
  if (key === "location") {
    const loc = entry.data["location"];
    return typeof loc === "string" ? locationLabel(loc as CrewLocation, level) : "";
  }
  if (key === "crop") {
    const crop = entry.data["crop"];
    return typeof crop === "string" ? cropLabel(crop as CropTray["crop"], level) : "";
  }
  if (key === "mode") {
    const mode = entry.data["mode"];
    return typeof mode === "string" ? survivalModeLabel(mode as SurvivalMode, level) : "";
  }
  const value = entry.data[key];
  return value === undefined ? "" : String(value);
}

/**
 * Renders one entry at one level. Falls back to specialist if a level's table is missing a
 * key (should not happen — validation/logText.test.ts checks all three tables cover the same
 * codes) and to the raw code if no table has it at all, so a gap is visible rather than
 * silently blank.
 */
export function logText(entry: LogEntry, level: DialLevel = "specialist"): string {
  const template = TABLES[level][entry.code] ?? SPECIALIST[entry.code];
  if (template === undefined) return entry.code;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => resolveField(entry, key, level));
}

export function hasTemplate(code: string, level: DialLevel = "specialist"): boolean {
  return code in TABLES[level];
}

export { CADET as CADET_LOG_TEMPLATES, COMMANDER as COMMANDER_LOG_TEMPLATES, SPECIALIST as EN_LOG_TEMPLATES };
