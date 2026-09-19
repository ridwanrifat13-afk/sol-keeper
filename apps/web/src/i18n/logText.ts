/**
 * Renders a log entry's `code` + `data` into English.
 *
 * The simulation never stores prose (brief rule 4), which is what makes M3's Reality Dial
 * and M5's Bangla locale possible without touching the engine. This module is the English
 * half of that, kept deliberately in the shape i18next will want: a flat key -> template
 * map with `{placeholder}` interpolation. At M3 each key gains `.cadet` / `.specialist` /
 * `.commander` variants; at M5 the map moves into en.json beside bn.json.
 */
import type { LogEntry } from "@sol-keeper/sim";

const TEMPLATES: Record<string, string> = {
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
  "hazard.spe.crewExposed": "{crew} is exposed in the {location}.",
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

/** Turns "{a} and {b}" plus { a, b } into a sentence. Unknown keys fall back to the code. */
export function logText(entry: LogEntry): string {
  const template = TEMPLATES[entry.code];
  if (template === undefined) return entry.code;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = entry.data[key];
    return value === undefined ? "" : String(value);
  });
}

export function hasTemplate(code: string): boolean {
  return code in TEMPLATES;
}

export { TEMPLATES as EN_LOG_TEMPLATES };
