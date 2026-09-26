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
import type { CommsPriority, CropTray, CrewLocation, LogEntry, StationId, SurvivalMode, SystemId } from "@sol-keeper/sim";
import { commsPriorityLabel, cropLabel, locationLabel, stationLabel, survivalModeLabel, systemLabel } from "../dial/labels.js";
import type { DialLevel, Language } from "../dial/types.js";

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

  "end.missionComplete": "Mission complete: {crewSurviving} crew home safe.",
  "end.crewLost": "Mission lost at hour {hour}.",

  // --- Phase 2 (M7): physiology clocks, incidents, and the outcome state machine ---
  "crew.co2Idlh": "{crew}: CO₂ at {co2MmHg} mmHg — immediately dangerous.",
  "crew.lost.radiation": "{crew} has been lost to acute radiation exposure.",
  "crew.lost.hypoxia": "{crew} has been lost to lack of oxygen.",
  "crew.lost.thirst": "{crew} has been lost to dehydration.",
  "crew.lost.starvation": "{crew} has been lost to starvation.",
  "crew.lost.hypothermia": "{crew} has been lost to cold.",
  "end.doseLimitExceeded": "{crew} exceeded the {limitMSv} mSv career radiation limit ({doseMSv} mSv). Mission ended.",
  "end.goalMissed": "Mission ended at hour {hour}: primary goal not met, {crewSurviving} crew safe.",
  "end.abort": "Mission aborted at hour {hour}.",
  "abort.rejected.window": "Abort request denied — outside the Mars departure window.",
  "incident.fire-mir97.start": "Incident: fire ({analogue}).",
  "incident.fire-mir97.resolved": "Fire incident resolved: {response}.",
  "incident.fire-mir97.crewInjured": "{crew} injured in the fire ({durationMinutes} min burn).",
  "incident.depress-mir97.start": "Incident: cabin depressurization ({analogue}).",
  "incident.depress-mir97.resolved": "Depressurization incident resolved: {response}.",
  "incident.depress-mir97.leaking": "Cabin losing {lostKg} kg of oxygen to a leak.",
  "incident.o2tank-apollo13.start": "Incident: oxygen tank failure ({analogue}).",
  "incident.o2tank-apollo13.resolved": "Oxygen tank incident resolved: {response}.",
  "incident.o2tank-apollo13.rupture": "Oxygen tank ruptured — {lostKg} kg lost.",
  "incident.coolant-ms22.start": "Incident: coolant leak ({analogue}).",
  "incident.coolant-ms22.resolved": "Coolant leak incident resolved: {response}.",
  "incident.coolant-ms22.overheating": "Cabin temperature dropping {riseC} °C from a coolant leak — thermal control can't hold it.",
  "incident.spe-1972.start": "Incident: extreme solar particle event ({analogue}).",
  "incident.spe-1972.resolved": "Solar particle event incident resolved: {response}.",
  "incident.spe-1972.spike": "Radiation dose spiking — {multiplier}x a design-reference storm.",
  "incident.duststorm-2018.start": "Incident: severe dust storm ({analogue}).",
  "incident.duststorm-2018.resolved": "Dust storm incident resolved: {response}.",
  "incident.duststorm-2018.severe": "Arrays obscured to {obscuration}.",
  "incident.scrubber-iss.start": "Incident: recurring CO₂ scrubber failure ({analogue}).",
  "incident.scrubber-iss.resolved": "CO₂ scrubber incident resolved: {response}.",
  "incident.scrubber-iss.recurring": "CO₂ scrubber failing at {multiplier}x its normal rate.",

  // --- M7.7/M7.8: response lifecycle (detection delay, queueing, probabilistic resolution) ---
  "incident.fire-mir97.detected": "The fire was detected.",
  "incident.fire-mir97.queued": "Response to the fire queued: {response} ({hoursRemaining} h of work left).",
  "incident.fire-mir97.responseFailed": "Attempt to respond to the fire failed: {response} did not work.",
  "incident.fire-mir97.responseImpossible": "Cannot respond to the fire right now: nobody available for {response}.",
  "incident.depress-mir97.detected": "The leak was detected.",
  "incident.depress-mir97.queued": "Response to the leak queued: {response} ({hoursRemaining} h of work left).",
  "incident.depress-mir97.responseFailed": "Attempt to respond to the leak failed: {response} did not work.",
  "incident.depress-mir97.responseImpossible": "Cannot respond to the leak right now: nobody available for {response}.",
  "incident.o2tank-apollo13.detected": "The oxygen tank problem was detected.",
  "incident.o2tank-apollo13.queued": "Response to the oxygen tank problem queued: {response} ({hoursRemaining} h of work left).",
  "incident.o2tank-apollo13.responseFailed": "Attempt to respond to the oxygen tank problem failed: {response} did not work.",
  "incident.o2tank-apollo13.responseImpossible": "Cannot respond to the oxygen tank problem right now: nobody available for {response}.",
  "incident.coolant-ms22.detected": "The coolant leak was detected.",
  "incident.coolant-ms22.queued": "Response to the coolant leak queued: {response} ({hoursRemaining} h of work left).",
  "incident.coolant-ms22.responseFailed": "Attempt to respond to the coolant leak failed: {response} did not work.",
  "incident.coolant-ms22.responseImpossible": "Cannot respond to the coolant leak right now: nobody available for {response}.",
  "incident.spe-1972.detected": "The solar particle event was detected.",
  "incident.spe-1972.queued": "Response to the solar particle event queued: {response} ({hoursRemaining} h of work left).",
  "incident.spe-1972.responseFailed": "Attempt to respond to the solar particle event failed: {response} did not work.",
  "incident.spe-1972.responseImpossible": "Cannot respond to the solar particle event right now: nobody available for {response}.",
  "incident.duststorm-2018.detected": "The dust storm was detected.",
  "incident.duststorm-2018.queued": "Response to the dust storm queued: {response} ({hoursRemaining} h of work left).",
  "incident.duststorm-2018.responseFailed": "Attempt to respond to the dust storm failed: {response} did not work.",
  "incident.duststorm-2018.responseImpossible": "Cannot respond to the dust storm right now: nobody available for {response}.",
  "incident.scrubber-iss.detected": "The CO₂ scrubber failure was detected.",
  "incident.scrubber-iss.queued": "Response to the CO₂ scrubber failure queued: {response} ({hoursRemaining} h of work left).",
  "incident.scrubber-iss.responseFailed": "Attempt to respond to the CO₂ scrubber failure failed: {response} did not work.",
  "incident.scrubber-iss.responseImpossible": "Cannot respond to the CO₂ scrubber failure right now: nobody available for {response}.",
  "system.repairAttemptFailed": "Repair attempt on {system} failed.",

  // --- M7.6 Part D: residual costs for the last four incidents ---
  "incident.spe-1972.electronicsDegraded": "The particle event permanently degraded {system} — {fraction} loss in capacity.",
  "incident.duststorm-2018.batteryDegraded": "Deep discharge during the storm permanently reduced battery capacity by {lostKwh} kWh.",
  "atmosphere.chronicCo2Exposure": "Sustained CO₂ exposure above the limit has left a lasting mark on the crew.",
  "incident.fire-mir97.extinguishersExhausted": "Fire extinguisher stock ran out mid-fight — the crew took additional injury.",
  "incident.fire-mir97.respiratorsExhausted": "Respirator cartridges are exhausted; the crew is on filter masks for the rest of the smoke recovery.",

  // --- M10.8: the five player decisions M10.4 started logging (engine/replay.ts's
  // applyInput) — a real gap between M10.4 (the log entry) and here (the words), closed
  // now because the Mission Report's decision timeline is the first thing that needs them
  // rendered, but a mission's own DebriefView mission log needed this fix regardless.
  "decision.rations.set": "Rationing set to {mode}.",
  "decision.priority.changed": "{system} moved {direction} the load-shed order.",
  "decision.crewLocation.set": "{crew} moved to {location}.",
  "decision.station.assigned": "{crew} assigned to {station}.",
  "decision.commsPriority.set": "Downlink priority set to {priority}.",
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

  "end.missionComplete": "You did it! Everyone made it home safely.",
  "end.crewLost": "The mission could not continue.",

  // --- Phase 2 (M7): physiology clocks, incidents, and the outcome state machine ---
  "crew.co2Idlh": "{crew} is breathing dangerously bad air!",
  "crew.lost.radiation": "{crew} became too sick to continue. The mission had to end.",
  "crew.lost.hypoxia": "{crew} became too sick to continue. The mission had to end.",
  "crew.lost.thirst": "{crew} became too sick to continue. The mission had to end.",
  "crew.lost.starvation": "{crew} became too sick to continue. The mission had to end.",
  "crew.lost.hypothermia": "{crew} became too sick to continue. The mission had to end.",
  "end.doseLimitExceeded": "{crew} got too much space radiation. The mission had to end.",
  "end.goalMissed": "The mission's main goal wasn't finished this time.",
  "end.abort": "The crew decided to end the mission early.",
  "abort.rejected.window": "Can't leave yet — the launch window isn't open.",
  "incident.fire-mir97.start": "Fire! ({analogue})",
  "incident.fire-mir97.resolved": "The fire is dealt with: {response}.",
  "incident.fire-mir97.crewInjured": "{crew} got hurt in the fire!",
  "incident.depress-mir97.start": "Air is leaking out of the cabin! ({analogue})",
  "incident.depress-mir97.resolved": "The leak is dealt with: {response}.",
  "incident.depress-mir97.leaking": "Air is escaping fast — {lostKg} kg gone.",
  "incident.o2tank-apollo13.start": "An oxygen tank just failed! ({analogue})",
  "incident.o2tank-apollo13.resolved": "The oxygen problem is dealt with: {response}.",
  "incident.o2tank-apollo13.rupture": "Oxygen tank burst — {lostKg} kg of air lost.",
  "incident.coolant-ms22.start": "A coolant leak means the cabin can't stay warm! ({analogue})",
  "incident.coolant-ms22.resolved": "The cold problem is dealt with: {response}.",
  "incident.coolant-ms22.overheating": "It's getting colder — down {riseC} degrees.",
  "incident.spe-1972.start": "A huge solar storm is hitting! ({analogue})",
  "incident.spe-1972.resolved": "The solar storm is dealt with: {response}.",
  "incident.spe-1972.spike": "Radiation is spiking fast!",
  "incident.duststorm-2018.start": "A massive dust storm is here! ({analogue})",
  "incident.duststorm-2018.resolved": "The dust storm is dealt with: {response}.",
  "incident.duststorm-2018.severe": "The solar panels are almost fully covered in dust.",
  "incident.scrubber-iss.start": "The air cleaner keeps breaking! ({analogue})",
  "incident.scrubber-iss.resolved": "The air cleaner problem is dealt with: {response}.",
  "incident.scrubber-iss.recurring": "The air cleaner is breaking down way more than usual.",

  // --- M7.7/M7.8: response lifecycle (detection delay, queueing, probabilistic resolution) ---
  "incident.fire-mir97.detected": "You noticed the fire!",
  "incident.fire-mir97.queued": "Working on the fire: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.fire-mir97.responseFailed": "That didn't work: {response} for the fire.",
  "incident.fire-mir97.responseImpossible": "Nobody's free to try {response} for the fire right now.",
  "incident.depress-mir97.detected": "You noticed the air leak!",
  "incident.depress-mir97.queued": "Working on the air leak: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.depress-mir97.responseFailed": "That didn't work: {response} for the air leak.",
  "incident.depress-mir97.responseImpossible": "Nobody's free to try {response} for the air leak right now.",
  "incident.o2tank-apollo13.detected": "You noticed the oxygen problem!",
  "incident.o2tank-apollo13.queued": "Working on the oxygen problem: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.o2tank-apollo13.responseFailed": "That didn't work: {response} for the oxygen problem.",
  "incident.o2tank-apollo13.responseImpossible": "Nobody's free to try {response} for the oxygen problem right now.",
  "incident.coolant-ms22.detected": "You noticed the cold problem!",
  "incident.coolant-ms22.queued": "Working on the cold problem: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.coolant-ms22.responseFailed": "That didn't work: {response} for the cold problem.",
  "incident.coolant-ms22.responseImpossible": "Nobody's free to try {response} for the cold problem right now.",
  "incident.spe-1972.detected": "You noticed the solar storm!",
  "incident.spe-1972.queued": "Working on the solar storm: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.spe-1972.responseFailed": "That didn't work: {response} for the solar storm.",
  "incident.spe-1972.responseImpossible": "Nobody's free to try {response} for the solar storm right now.",
  "incident.duststorm-2018.detected": "You noticed the dust storm!",
  "incident.duststorm-2018.queued": "Working on the dust storm: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.duststorm-2018.responseFailed": "That didn't work: {response} for the dust storm.",
  "incident.duststorm-2018.responseImpossible": "Nobody's free to try {response} for the dust storm right now.",
  "incident.scrubber-iss.detected": "You noticed the air cleaner problem!",
  "incident.scrubber-iss.queued": "Working on the air cleaner problem: {response} (still needs {hoursRemaining} hour(s)).",
  "incident.scrubber-iss.responseFailed": "That didn't work: {response} for the air cleaner problem.",
  "incident.scrubber-iss.responseImpossible": "Nobody's free to try {response} for the air cleaner problem right now.",
  "system.repairAttemptFailed": "Tried to fix {system}, but it didn't work.",

  // --- M7.6 Part D: residual costs for the last four incidents ---
  "incident.spe-1972.electronicsDegraded": "The solar storm broke part of {system} for good.",
  "incident.duststorm-2018.batteryDegraded": "The batteries got drained so low they don't hold as much charge anymore.",
  "atmosphere.chronicCo2Exposure": "Breathing bad air for so long has worn the crew down for good.",
  "incident.fire-mir97.extinguishersExhausted": "Ran out of fire extinguishers mid-fight — someone got hurt worse because of it.",
  "incident.fire-mir97.respiratorsExhausted": "Out of respirator cartridges — the crew's stuck with weaker filter masks for now.",

  // --- M10.8: the five player decisions M10.4 started logging ---
  "decision.rations.set": "Switched to {mode}.",
  "decision.priority.changed": "{system} moved {direction} the power list.",
  "decision.crewLocation.set": "{crew} went to {location}.",
  "decision.station.assigned": "{crew} is now on {station}.",
  "decision.commsPriority.set": "Now sending {priority}.",
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

  "end.missionComplete": "Mission complete at hour {hour}: {crewSurviving} crew surviving.",
  "end.crewLost": "Mission terminated: crew complement zero at hour {hour}.",

  // --- Phase 2 (M7): physiology clocks, incidents, and the outcome state machine ---
  "crew.co2Idlh": "{crew}: pCO₂ {co2MmHg} mmHg — immediately dangerous to life or health.",
  "crew.lost.radiation": "{crew}: cause of loss — acute radiation exposure.",
  "crew.lost.hypoxia": "{crew}: cause of loss — hypoxia.",
  "crew.lost.thirst": "{crew}: cause of loss — dehydration.",
  "crew.lost.starvation": "{crew}: cause of loss — starvation.",
  "crew.lost.hypothermia": "{crew}: cause of loss — hypothermia.",
  "end.doseLimitExceeded": "{crew}: cumulative dose {doseMSv} mSv exceeds the {limitMSv} mSv career limit. Mission terminated.",
  "end.goalMissed": "Mission ended at hour {hour}: primary goal not met, {crewSurviving} crew surviving.",
  "end.abort": "Mission aborted at hour {hour}, by crew decision.",
  "abort.rejected.window": "Abort rejected: outside the ~{conjunctionPeriodDays} d synodic departure window ({windowDays} d wide).",
  "incident.fire-mir97.start": "Incident onset: fire ({analogue}).",
  "incident.fire-mir97.resolved": "Fire incident resolved — response: {response}.",
  "incident.fire-mir97.crewInjured": "{crew} injured, {durationMinutes} min burn duration.",
  "incident.depress-mir97.start": "Incident onset: cabin depressurization ({analogue}).",
  "incident.depress-mir97.resolved": "Depressurization incident resolved — response: {response}.",
  "incident.depress-mir97.leaking": "Cabin O₂ loss: {lostKg} kg to leak.",
  "incident.o2tank-apollo13.start": "Incident onset: oxygen tank failure ({analogue}).",
  "incident.o2tank-apollo13.resolved": "Oxygen tank incident resolved — response: {response}.",
  "incident.o2tank-apollo13.rupture": "Tank rupture: {lostKg} kg O₂ lost.",
  "incident.coolant-ms22.start": "Incident onset: coolant leak ({analogue}).",
  "incident.coolant-ms22.resolved": "Coolant leak incident resolved — response: {response}.",
  "incident.coolant-ms22.overheating": "Cabin temperature -{riseC} °C from coolant loss, uncontrolled.",
  "incident.spe-1972.start": "Incident onset: extreme solar particle event ({analogue}).",
  "incident.spe-1972.resolved": "SPE incident resolved — response: {response}.",
  "incident.spe-1972.spike": "Dose rate spike: {multiplier}x design-reference SPE.",
  "incident.duststorm-2018.start": "Incident onset: severe dust storm ({analogue}).",
  "incident.duststorm-2018.resolved": "Dust storm incident resolved — response: {response}.",
  "incident.duststorm-2018.severe": "Array obscuration at {obscuration}.",
  "incident.scrubber-iss.start": "Incident onset: recurring CO₂ scrubber failure ({analogue}).",
  "incident.scrubber-iss.resolved": "Scrubber incident resolved — response: {response}.",
  "incident.scrubber-iss.recurring": "Scrubber failure rate at {multiplier}x nominal.",

  // --- M7.7/M7.8: response lifecycle (detection delay, queueing, probabilistic resolution) ---
  "incident.fire-mir97.detected": "The fire was detected by crew or caution-and-warning.",
  "incident.fire-mir97.queued": "Response queued for the fire: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.fire-mir97.responseFailed": "Response attempt failed for the fire: {response} unsuccessful.",
  "incident.fire-mir97.responseImpossible": "Response infeasible for the fire: no crew available for {response}.",
  "incident.depress-mir97.detected": "The depressurization was detected by crew or caution-and-warning.",
  "incident.depress-mir97.queued": "Response queued for the depressurization: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.depress-mir97.responseFailed": "Response attempt failed for the depressurization: {response} unsuccessful.",
  "incident.depress-mir97.responseImpossible": "Response infeasible for the depressurization: no crew available for {response}.",
  "incident.o2tank-apollo13.detected": "The oxygen tank incident was detected by crew or caution-and-warning.",
  "incident.o2tank-apollo13.queued": "Response queued for the oxygen tank incident: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.o2tank-apollo13.responseFailed": "Response attempt failed for the oxygen tank incident: {response} unsuccessful.",
  "incident.o2tank-apollo13.responseImpossible": "Response infeasible for the oxygen tank incident: no crew available for {response}.",
  "incident.coolant-ms22.detected": "The coolant leak was detected by crew or caution-and-warning.",
  "incident.coolant-ms22.queued": "Response queued for the coolant leak: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.coolant-ms22.responseFailed": "Response attempt failed for the coolant leak: {response} unsuccessful.",
  "incident.coolant-ms22.responseImpossible": "Response infeasible for the coolant leak: no crew available for {response}.",
  "incident.spe-1972.detected": "The SPE was detected by crew or caution-and-warning.",
  "incident.spe-1972.queued": "Response queued for the SPE: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.spe-1972.responseFailed": "Response attempt failed for the SPE: {response} unsuccessful.",
  "incident.spe-1972.responseImpossible": "Response infeasible for the SPE: no crew available for {response}.",
  "incident.duststorm-2018.detected": "The dust storm was detected by crew or caution-and-warning.",
  "incident.duststorm-2018.queued": "Response queued for the dust storm: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.duststorm-2018.responseFailed": "Response attempt failed for the dust storm: {response} unsuccessful.",
  "incident.duststorm-2018.responseImpossible": "Response infeasible for the dust storm: no crew available for {response}.",
  "incident.scrubber-iss.detected": "The scrubber failure was detected by crew or caution-and-warning.",
  "incident.scrubber-iss.queued": "Response queued for the scrubber failure: {response}, {hoursRemaining} h of crew-time remaining.",
  "incident.scrubber-iss.responseFailed": "Response attempt failed for the scrubber failure: {response} unsuccessful.",
  "incident.scrubber-iss.responseImpossible": "Response infeasible for the scrubber failure: no crew available for {response}.",
  "system.repairAttemptFailed": "Repair attempt on {system} unsuccessful.",

  // --- M7.6 Part D: residual costs for the last four incidents ---
  "incident.spe-1972.electronicsDegraded": "SEP-induced permanent degradation: {system}, {fraction} capacity loss.",
  "incident.duststorm-2018.batteryDegraded": "Deep-discharge cycling during the storm permanently reduced battery capacity by {lostKwh} kWh (now {newCapacityKwh} kWh rated).",
  "atmosphere.chronicCo2Exposure": "Cumulative sub-acute CO₂ exposure ({exposureMmHgHours} mmHg-h) has crossed the chronic-effect threshold; permanent crew fatigue increase applied.",
  "incident.fire-mir97.extinguishersExhausted": "Fire-extinguisher stock depleted mid-response: additional crew injury applied.",
  "incident.fire-mir97.respiratorsExhausted": "Respirator-cartridge stock depleted: crew now on filter masks for the remainder of the smoke-recovery window, at a reduced protection factor.",

  // --- M10.8: the five player decisions M10.4 started logging ---
  "decision.rations.set": "Survival mode set to {mode}.",
  "decision.priority.changed": "Load-shed priority for {system} moved {direction}.",
  "decision.crewLocation.set": "{crew} relocated to {location}.",
  "decision.station.assigned": "{crew} reassigned to primary station: {station}.",
  "decision.commsPriority.set": "Downlink priority reassigned: {priority}.",
};

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`), same three
 *  tables, same keys, same `{placeholder}` positions. `resolveField`'s own label lookups
 *  (`dial/labels.ts`) carry their own Bangla tables and are picked by the same `language`
 *  argument, so an interpolated value is never English left stranded inside a Bangla sentence
 *  (or the reverse). */
const SPECIALIST_BN: TemplateTable = {
  "power.brownout":
    "লোড শেডিং: চাহিদা {demandKw} কিলোওয়াট, মাত্র {servedKw} কিলোওয়াট সরবরাহ করা যাচ্ছে। {shedCount}টি সিস্টেম বন্ধ করা হয়েছে।",
  "power.systemShed": "{system}-এর বিদ্যুৎ সংযোগ বিচ্ছিন্ন হয়েছে ({powerKw} কিলোওয়াট)।",
  "power.batteryDepleted": "উৎপাদন ({generationKw} কিলোওয়াট) চাহিদার চেয়ে কম থাকায় ব্যাটারি খালি হয়ে গেছে।",

  "thermal.heaterUnpowered": "হিটারে বিদ্যুৎ নেই। কেবিনের তাপমাত্রা {habitatTempC} °সে।",
  "thermal.freezeRisk": "কেবিনের তাপমাত্রা {habitatTempC} °সে-তে নেমে গেছে — পানির পাইপ জমে যেতে পারে।",

  "atmosphere.scrubberOffline": "CO₂ স্ক্রাবার বন্ধ। কেবিনে {co2Kg} কেজি CO₂ জমা হয়েছে।",
  "atmosphere.co2AboveLimit": "CO₂ {co2MmHg} mmHg, সীমা {limitMmHg} mmHg-এর বেশি।",
  "atmosphere.lowOxygen": "অক্সিজেন {o2MmHg} mmHg-এ নেমে গেছে।",

  "water.recoveryOffline": "পানি পুনরুদ্ধার ব্যবস্থা বন্ধ — প্রতি ঘণ্টায় {lostPerHourKg} কেজি পানি নষ্ট হচ্ছে।",
  "water.belowOneDayReserve": "একদিনেরও কম পানি অবশিষ্ট আছে ({crew} জন ক্রুর জন্য {potableKg} কেজি)।",
  "water.insufficientForElectrolysis":
    "অক্সিজেন তৈরির জন্য পর্যাপ্ত পানি নেই: প্রয়োজন {neededKg} কেজি, আছে {availableKg} কেজি।",

  "food.growLightsOff": "গ্রো লাইট বন্ধ — {trays}টি ট্রে বাড়ছে না।",
  "food.lowReserve": "খাবার {daysRemaining} দিনের মজুত বাকি আছে ({storedKg} কেজি)।",
  "food.exhausted": "খাবারের মজুত শেষ।",
  "food.harvest": "{tray} থেকে {harvestKg} কেজি {crop} সংগ্রহ করা হয়েছে।",

  "radiation.aboveDesignTarget":
    "বিকিরণের হার {rateMSvPerDay} mSv/দিন, লক্ষ্যমাত্রা {targetMSvPerDay} mSv/দিনের বেশি।",
  "radiation.careerLimitExceeded":
    "{crew} ক্যারিয়ার সীমা {limitMSv} mSv অতিক্রম করেছে ({doseMSv} mSv)।",
  "radiation.eventLimitExceeded": "{crew} ঝড়ের সীমা {limitMGyEq} mGy-Eq অতিক্রম করেছে।",

  "crew.cold": "{crew} ঠান্ডায় কাবু — কেবিনের তাপমাত্রা {habitatTempC} °সে।",
  "crew.noWater": "{crew}-এর কাছে পানি নেই।",
  "crew.lost": "{crew}-কে হারানো হয়েছে।",

  "hazard.dustStorm.start": "ধুলিঝড় শুরু হয়েছে — প্রায় {durationHours} ঘণ্টা স্থায়ী হবে।",
  "hazard.dustStorm.obscuring": "সোলার প্যানেলের {obscuration} অংশ ধুলায় ঢাকা।",
  "hazard.solarParticleEvent.start": "সৌর কণা ঘটনা — ক্রুকে আশ্রয়কেন্দ্রে নিয়ে যান।",
  "hazard.spe.crewExposed": "{crew} {location}-এ অরক্ষিত অবস্থায় আছে।",
  "hazard.pumpFailure.start": "একটি পাম্প বিকল হয়েছে।",
  "hazard.pumpFailure": "{system}-এর পাম্প বিকল হয়েছে।",
  "hazard.cropBlight.start": "ফসলে রোগ ধরা পড়েছে।",
  "hazard.cropBlight": "{tray} ({crop}) রোগাক্রান্ত — স্বাস্থ্য {healthFraction}।",

  "system.failure": "{system} বিকল হয়েছে (TRL {trl}, {spares}টি স্পেয়ার বাকি)।",
  "system.repaired": "{system} মেরামত করা হয়েছে। {sparesRemaining}টি স্পেয়ার বাকি।",

  "isru.passedMoxieMissionTotal":
    "আপনার MOXIE এখন পর্যন্ত {producedG} গ্রাম অক্সিজেন তৈরি করেছে — যা আসল MOXIE-র সম্পূর্ণ মিশনের উৎপাদন ({moxieMissionTotalG} গ্রাম) ছাড়িয়ে গেছে।",

  "comms.blackoutStart": "সৌর সংযোগ বিচ্ছিন্নতা — প্রায় {durationDays} দিন পৃথিবীর সাথে যোগাযোগ বন্ধ থাকবে।",
  "comms.blackoutEnd": "পৃথিবীর সাথে সংযোগ পুনরুদ্ধার হয়েছে ({oneWayLightSeconds} সেকেন্ড একমুখী)।",

  "end.missionComplete": "মিশন সম্পন্ন: {crewSurviving} জন ক্রু নিরাপদে বাড়ি ফিরেছে।",
  "end.crewLost": "{hour} ঘণ্টায় মিশন ব্যর্থ হয়েছে।",

  "crew.co2Idlh": "{crew}: CO₂ {co2MmHg} mmHg — তাৎক্ষণিকভাবে বিপজ্জনক।",
  "crew.lost.radiation": "{crew}-কে তীব্র বিকিরণের কারণে হারানো হয়েছে।",
  "crew.lost.hypoxia": "{crew}-কে অক্সিজেনের অভাবে হারানো হয়েছে।",
  "crew.lost.thirst": "{crew}-কে পানিশূন্যতার কারণে হারানো হয়েছে।",
  "crew.lost.starvation": "{crew}-কে অনাহারে হারানো হয়েছে।",
  "crew.lost.hypothermia": "{crew}-কে ঠান্ডায় হারানো হয়েছে।",
  "end.doseLimitExceeded": "{crew} ক্যারিয়ার বিকিরণ সীমা {limitMSv} mSv অতিক্রম করেছে ({doseMSv} mSv)। মিশন শেষ হয়েছে।",
  "end.goalMissed": "{hour} ঘণ্টায় মিশন শেষ হয়েছে: মূল লক্ষ্য পূরণ হয়নি, {crewSurviving} জন ক্রু নিরাপদ।",
  "end.abort": "{hour} ঘণ্টায় মিশন বাতিল করা হয়েছে।",
  "abort.rejected.window": "বাতিলের অনুরোধ প্রত্যাখ্যাত — মঙ্গল প্রস্থান উইন্ডোর বাইরে।",
  "incident.fire-mir97.start": "দুর্ঘটনা: আগুন ({analogue})।",
  "incident.fire-mir97.resolved": "আগুনের দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.fire-mir97.crewInjured": "আগুনে {crew} আহত হয়েছে ({durationMinutes} মিনিট পুড়েছে)।",
  "incident.depress-mir97.start": "দুর্ঘটনা: কেবিনের চাপ হ্রাস ({analogue})।",
  "incident.depress-mir97.resolved": "চাপ হ্রাসের দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.depress-mir97.leaking": "ফুটো দিয়ে কেবিন {lostKg} কেজি অক্সিজেন হারাচ্ছে।",
  "incident.o2tank-apollo13.start": "দুর্ঘটনা: অক্সিজেন ট্যাংক বিকল ({analogue})।",
  "incident.o2tank-apollo13.resolved": "অক্সিজেন ট্যাংকের দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.o2tank-apollo13.rupture": "অক্সিজেন ট্যাংক ফেটেছে — {lostKg} কেজি হারিয়েছে।",
  "incident.coolant-ms22.start": "দুর্ঘটনা: কুল্যান্ট ফুটো ({analogue})।",
  "incident.coolant-ms22.resolved": "কুল্যান্ট ফুটোর দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.coolant-ms22.overheating": "কুল্যান্ট ফুটোর কারণে কেবিনের তাপমাত্রা {riseC} °সে কমছে — তাপ নিয়ন্ত্রণ সামলাতে পারছে না।",
  "incident.spe-1972.start": "দুর্ঘটনা: চরম সৌর কণা ঘটনা ({analogue})।",
  "incident.spe-1972.resolved": "সৌর কণা ঘটনার দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.spe-1972.spike": "বিকিরণের মাত্রা বেড়ে যাচ্ছে — নকশা-মানের ঝড়ের {multiplier} গুণ।",
  "incident.duststorm-2018.start": "দুর্ঘটনা: তীব্র ধুলিঝড় ({analogue})।",
  "incident.duststorm-2018.resolved": "ধুলিঝড়ের দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.duststorm-2018.severe": "সোলার অ্যারে {obscuration} পর্যন্ত ঢাকা পড়েছে।",
  "incident.scrubber-iss.start": "দুর্ঘটনা: বারবার CO₂ স্ক্রাবার বিকল হচ্ছে ({analogue})।",
  "incident.scrubber-iss.resolved": "CO₂ স্ক্রাবারের দুর্ঘটনা সমাধান হয়েছে: {response}।",
  "incident.scrubber-iss.recurring": "CO₂ স্ক্রাবার স্বাভাবিকের {multiplier} গুণ হারে বিকল হচ্ছে।",

  "incident.fire-mir97.detected": "আগুন শনাক্ত হয়েছে।",
  "incident.fire-mir97.queued": "আগুনের সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.fire-mir97.responseFailed": "আগুনের সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.fire-mir97.responseImpossible": "এখন আগুনের সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.depress-mir97.detected": "ফুটো শনাক্ত হয়েছে।",
  "incident.depress-mir97.queued": "ফুটোর সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.depress-mir97.responseFailed": "ফুটোর সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.depress-mir97.responseImpossible": "এখন ফুটোর সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.o2tank-apollo13.detected": "অক্সিজেন ট্যাংকের সমস্যা শনাক্ত হয়েছে।",
  "incident.o2tank-apollo13.queued": "অক্সিজেন সমস্যার সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.o2tank-apollo13.responseFailed": "অক্সিজেন সমস্যার সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.o2tank-apollo13.responseImpossible": "এখন অক্সিজেন সমস্যার সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.coolant-ms22.detected": "কুল্যান্ট ফুটো শনাক্ত হয়েছে।",
  "incident.coolant-ms22.queued": "কুল্যান্ট ফুটোর সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.coolant-ms22.responseFailed": "কুল্যান্ট ফুটোর সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.coolant-ms22.responseImpossible": "এখন কুল্যান্ট ফুটোর সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.spe-1972.detected": "সৌর কণা ঘটনা শনাক্ত হয়েছে।",
  "incident.spe-1972.queued": "সৌর কণা ঘটনার সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.spe-1972.responseFailed": "সৌর কণা ঘটনার সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.spe-1972.responseImpossible": "এখন সৌর কণা ঘটনার সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.duststorm-2018.detected": "ধুলিঝড় শনাক্ত হয়েছে।",
  "incident.duststorm-2018.queued": "ধুলিঝড়ের সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.duststorm-2018.responseFailed": "ধুলিঝড়ের সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.duststorm-2018.responseImpossible": "এখন ধুলিঝড়ের সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "incident.scrubber-iss.detected": "CO₂ স্ক্রাবারের বিকল হওয়া শনাক্ত হয়েছে।",
  "incident.scrubber-iss.queued": "স্ক্রাবার সমস্যার সমাধান সারিতে আছে: {response} (আরও {hoursRemaining} ঘণ্টা কাজ বাকি)।",
  "incident.scrubber-iss.responseFailed": "স্ক্রাবার সমস্যার সমাধানের চেষ্টা ব্যর্থ: {response} কাজ করেনি।",
  "incident.scrubber-iss.responseImpossible": "এখন স্ক্রাবার সমস্যার সমাধান করা যাচ্ছে না: {response}-এর জন্য কেউ নেই।",
  "system.repairAttemptFailed": "{system}-এর মেরামতের চেষ্টা ব্যর্থ হয়েছে।",

  "incident.spe-1972.electronicsDegraded": "সৌর কণা ঘটনা স্থায়ীভাবে {system}-এর ক্ষমতা {fraction} কমিয়ে দিয়েছে।",
  "incident.duststorm-2018.batteryDegraded": "ঝড়ের সময় গভীর ডিসচার্জের কারণে ব্যাটারির ক্ষমতা স্থায়ীভাবে {lostKwh} kWh কমে গেছে।",
  "atmosphere.chronicCo2Exposure": "দীর্ঘস্থায়ী উচ্চ CO₂-এর সংস্পর্শ ক্রুর ওপর স্থায়ী প্রভাব ফেলেছে।",
  "incident.fire-mir97.extinguishersExhausted": "আগুন নেভানোর মাঝপথে অগ্নিনির্বাপক যন্ত্র শেষ হয়ে গেছে — ক্রু অতিরিক্ত আহত হয়েছে।",
  "incident.fire-mir97.respiratorsExhausted": "রেসপিরেটর কার্তুজ শেষ; ধোঁয়া থেকে সেরে ওঠার বাকি সময় ক্রু ফিল্টার মাস্ক ব্যবহার করছে।",

  "decision.rations.set": "রেশন {mode}-এ সেট করা হয়েছে।",
  "decision.priority.changed": "{system} লোড-শেডিং তালিকায় {direction} সরানো হয়েছে।",
  "decision.crewLocation.set": "{crew} {location}-এ স্থানান্তরিত হয়েছে।",
  "decision.station.assigned": "{crew}-কে {station}-এ নিয়োগ দেওয়া হয়েছে।",
  "decision.commsPriority.set": "ডাউনলিংক অগ্রাধিকার {priority}-এ সেট করা হয়েছে।",
};

/** Ages 8-11. Plain words, no raw units, present tense, encouraging where it can be. */
const CADET_BN: TemplateTable = {
  "power.brownout": "বিদ্যুৎ কম পড়ছে! {shedCount}টি জিনিস বন্ধ করতে হয়েছে।",
  "power.systemShed": "বিদ্যুৎ বাঁচাতে {system} বন্ধ করা হয়েছে।",
  "power.batteryDepleted": "ব্যাটারি খালি, আর পর্যাপ্ত বিদ্যুৎ আসছে না।",

  "thermal.heaterUnpowered": "হিটারে বিদ্যুৎ নেই। ঠান্ডা লাগছে।",
  "thermal.freezeRisk": "এখানে খুব ঠান্ডা! পানির পাইপ জমে যেতে পারে।",

  "atmosphere.scrubberOffline": "বাতাস পরিষ্কারক বন্ধ। খারাপ বাতাস জমছে।",
  "atmosphere.co2AboveLimit": "কেবিনে অনেক বেশি খারাপ বাতাস জমেছে।",
  "atmosphere.lowOxygen": "শ্বাস নেওয়ার বাতাস কমে যাচ্ছে।",

  "water.recoveryOffline": "পানি পরিষ্কারক বন্ধ — পানি নষ্ট হচ্ছে।",
  "water.belowOneDayReserve": "মাত্র একদিনের মতো পানি বাকি আছে!",
  "water.insufficientForElectrolysis": "আরও বাতাস তৈরির জন্য যথেষ্ট পানি নেই।",

  "food.growLightsOff": "বাগানের আলো বন্ধ — গাছ বাড়ছে না।",
  "food.lowReserve": "খাবার কমে যাচ্ছে।",
  "food.exhausted": "কোনো খাবার বাকি নেই!",
  "food.harvest": "বাগান থেকে কিছু {crop} তোলা হয়েছে!",

  "radiation.aboveDesignTarget": "স্বাভাবিকের চেয়ে বেশি মহাকাশ বিকিরণ আসছে।",
  "radiation.careerLimitExceeded": "{crew} সারা মিশনে অনেক বেশি বিকিরণ পেয়েছে।",
  "radiation.eventLimitExceeded": "ঝড় থেকে {crew} অনেক বেশি বিকিরণ পেয়েছে।",

  "crew.cold": "{crew}-এর ঠান্ডা লাগছে।",
  "crew.noWater": "{crew}-এর কাছে খাওয়ার পানি নেই।",
  "crew.lost": "{crew}-কে বাঁচানো যায়নি।",

  "hazard.dustStorm.start": "ধুলিঝড় শুরু হচ্ছে! এটি কিছুক্ষণ সূর্যের আলো আটকাবে।",
  "hazard.dustStorm.obscuring": "ধুলা সোলার প্যানেল ঢেকে দিচ্ছে।",
  "hazard.solarParticleEvent.start": "সৌর ঝড় আসছে — সবাইকে নিরাপদ ঘরে নিয়ে যান!",
  "hazard.spe.crewExposed": "{crew} ঝড়ের সময় নিরাপদ ঘরে নেই।",
  "hazard.pumpFailure.start": "একটি পাম্প এইমাত্র ভেঙে গেছে!",
  "hazard.pumpFailure": "{system} কাজ করছে না।",
  "hazard.cropBlight.start": "কিছু একটা গাছগুলোকে অসুস্থ করে দিচ্ছে।",
  "hazard.cropBlight": "{crop} অসুস্থ হয়ে পড়েছে।",

  "system.failure": "{system} ভেঙে গেছে।",
  "system.repaired": "{system} আবার ঠিক হয়ে গেছে!",

  "isru.passedMoxieMissionTotal": "আপনার বাতাস তৈরির যন্ত্র এখন আসল MOXIE-র পুরো মিশনের চেয়ে বেশি অক্সিজেন তৈরি করেছে!",

  "comms.blackoutStart": "সূর্য সংকেত আটকে দিচ্ছে — কিছুক্ষণ পৃথিবী থেকে কোনো বার্তা আসবে না।",
  "comms.blackoutEnd": "আপনি আবার পৃথিবীর সাথে কথা বলতে পারবেন!",

  "end.missionComplete": "আপনি পেরেছেন! সবাই নিরাপদে বাড়ি ফিরেছে।",
  "end.crewLost": "মিশন চালিয়ে যাওয়া যায়নি।",

  "crew.co2Idlh": "{crew} খুব খারাপ বাতাসে শ্বাস নিচ্ছে!",
  "crew.lost.radiation": "{crew} খুব অসুস্থ হয়ে পড়েছিল। মিশন থামাতে হয়েছে।",
  "crew.lost.hypoxia": "{crew} খুব অসুস্থ হয়ে পড়েছিল। মিশন থামাতে হয়েছে।",
  "crew.lost.thirst": "{crew} খুব অসুস্থ হয়ে পড়েছিল। মিশন থামাতে হয়েছে।",
  "crew.lost.starvation": "{crew} খুব অসুস্থ হয়ে পড়েছিল। মিশন থামাতে হয়েছে।",
  "crew.lost.hypothermia": "{crew} খুব অসুস্থ হয়ে পড়েছিল। মিশন থামাতে হয়েছে।",
  "end.doseLimitExceeded": "{crew} অনেক বেশি মহাকাশ বিকিরণ পেয়েছে। মিশন থামাতে হয়েছে।",
  "end.goalMissed": "এবার মিশনের মূল লক্ষ্য শেষ করা যায়নি।",
  "end.abort": "ক্রু মিশন তাড়াতাড়ি শেষ করার সিদ্ধান্ত নিয়েছে।",
  "abort.rejected.window": "এখনই যাওয়া যাবে না — যাত্রার সময় এখনো আসেনি।",
  "incident.fire-mir97.start": "আগুন! ({analogue})",
  "incident.fire-mir97.resolved": "আগুনের সমস্যা মিটেছে: {response}।",
  "incident.fire-mir97.crewInjured": "আগুনে {crew} আহত হয়েছে!",
  "incident.depress-mir97.start": "কেবিন থেকে বাতাস বের হয়ে যাচ্ছে! ({analogue})",
  "incident.depress-mir97.resolved": "ফুটোর সমস্যা মিটেছে: {response}।",
  "incident.depress-mir97.leaking": "বাতাস দ্রুত বেরিয়ে যাচ্ছে — {lostKg} কেজি চলে গেছে।",
  "incident.o2tank-apollo13.start": "একটি অক্সিজেন ট্যাংক এইমাত্র নষ্ট হয়ে গেছে! ({analogue})",
  "incident.o2tank-apollo13.resolved": "অক্সিজেনের সমস্যা মিটেছে: {response}।",
  "incident.o2tank-apollo13.rupture": "অক্সিজেন ট্যাংক ফেটে গেছে — {lostKg} কেজি বাতাস হারিয়েছে।",
  "incident.coolant-ms22.start": "কুল্যান্ট ফুটোর কারণে কেবিন গরম রাখা যাচ্ছে না! ({analogue})",
  "incident.coolant-ms22.resolved": "ঠান্ডার সমস্যা মিটেছে: {response}।",
  "incident.coolant-ms22.overheating": "আরও ঠান্ডা হয়ে যাচ্ছে — {riseC} ডিগ্রি কমেছে।",
  "incident.spe-1972.start": "একটি বিশাল সৌর ঝড় আঘাত হানছে! ({analogue})",
  "incident.spe-1972.resolved": "সৌর ঝড়ের সমস্যা মিটেছে: {response}।",
  "incident.spe-1972.spike": "বিকিরণ দ্রুত বাড়ছে!",
  "incident.duststorm-2018.start": "একটি বিশাল ধুলিঝড় এসেছে! ({analogue})",
  "incident.duststorm-2018.resolved": "ধুলিঝড়ের সমস্যা মিটেছে: {response}।",
  "incident.duststorm-2018.severe": "সোলার প্যানেল প্রায় পুরোপুরি ধুলায় ঢাকা।",
  "incident.scrubber-iss.start": "বাতাস পরিষ্কারক বারবার ভেঙে যাচ্ছে! ({analogue})",
  "incident.scrubber-iss.resolved": "বাতাস পরিষ্কারকের সমস্যা মিটেছে: {response}।",
  "incident.scrubber-iss.recurring": "বাতাস পরিষ্কারক স্বাভাবিকের চেয়ে অনেক বেশি বিকল হচ্ছে।",

  "incident.fire-mir97.detected": "আপনি আগুন লক্ষ্য করেছেন!",
  "incident.fire-mir97.queued": "আগুন নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.fire-mir97.responseFailed": "এটি কাজ করেনি: আগুনের জন্য {response}।",
  "incident.fire-mir97.responseImpossible": "এখন আগুনের জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.depress-mir97.detected": "আপনি বাতাসের ফুটো লক্ষ্য করেছেন!",
  "incident.depress-mir97.queued": "ফুটো নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.depress-mir97.responseFailed": "এটি কাজ করেনি: ফুটোর জন্য {response}।",
  "incident.depress-mir97.responseImpossible": "এখন ফুটোর জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.o2tank-apollo13.detected": "আপনি অক্সিজেনের সমস্যা লক্ষ্য করেছেন!",
  "incident.o2tank-apollo13.queued": "অক্সিজেন সমস্যা নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.o2tank-apollo13.responseFailed": "এটি কাজ করেনি: অক্সিজেন সমস্যার জন্য {response}।",
  "incident.o2tank-apollo13.responseImpossible": "এখন অক্সিজেন সমস্যার জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.coolant-ms22.detected": "আপনি ঠান্ডার সমস্যা লক্ষ্য করেছেন!",
  "incident.coolant-ms22.queued": "ঠান্ডার সমস্যা নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.coolant-ms22.responseFailed": "এটি কাজ করেনি: ঠান্ডার সমস্যার জন্য {response}।",
  "incident.coolant-ms22.responseImpossible": "এখন ঠান্ডার সমস্যার জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.spe-1972.detected": "আপনি সৌর ঝড় লক্ষ্য করেছেন!",
  "incident.spe-1972.queued": "সৌর ঝড় নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.spe-1972.responseFailed": "এটি কাজ করেনি: সৌর ঝড়ের জন্য {response}।",
  "incident.spe-1972.responseImpossible": "এখন সৌর ঝড়ের জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.duststorm-2018.detected": "আপনি ধুলিঝড় লক্ষ্য করেছেন!",
  "incident.duststorm-2018.queued": "ধুলিঝড় নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.duststorm-2018.responseFailed": "এটি কাজ করেনি: ধুলিঝড়ের জন্য {response}।",
  "incident.duststorm-2018.responseImpossible": "এখন ধুলিঝড়ের জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "incident.scrubber-iss.detected": "আপনি বাতাস পরিষ্কারকের সমস্যা লক্ষ্য করেছেন!",
  "incident.scrubber-iss.queued": "বাতাস পরিষ্কারকের সমস্যা নিয়ে কাজ চলছে: {response} (আরও {hoursRemaining} ঘণ্টা লাগবে)।",
  "incident.scrubber-iss.responseFailed": "এটি কাজ করেনি: বাতাস পরিষ্কারকের সমস্যার জন্য {response}।",
  "incident.scrubber-iss.responseImpossible": "এখন বাতাস পরিষ্কারকের সমস্যার জন্য {response} চেষ্টা করার মতো কেউ নেই।",
  "system.repairAttemptFailed": "{system} ঠিক করার চেষ্টা করা হয়েছিল, কিন্তু কাজ হয়নি।",

  "incident.spe-1972.electronicsDegraded": "সৌর ঝড় {system}-এর একটি অংশ চিরতরে নষ্ট করে দিয়েছে।",
  "incident.duststorm-2018.batteryDegraded": "ব্যাটারি এত কমে গিয়েছিল যে এখন আর আগের মতো চার্জ ধরে রাখতে পারে না।",
  "atmosphere.chronicCo2Exposure": "অনেকক্ষণ ধরে খারাপ বাতাসে থাকায় ক্রু চিরতরে দুর্বল হয়ে পড়েছে।",
  "incident.fire-mir97.extinguishersExhausted": "আগুন নেভানোর মাঝপথে অগ্নিনির্বাপক শেষ হয়ে গিয়েছিল — তাই কেউ আরও বেশি আহত হয়েছে।",
  "incident.fire-mir97.respiratorsExhausted": "রেসপিরেটর কার্তুজ শেষ — ক্রুকে এখন হালকা মাস্ক পরে থাকতে হচ্ছে।",

  "decision.rations.set": "{mode}-এ পরিবর্তন করা হয়েছে।",
  "decision.priority.changed": "{system} বিদ্যুতের তালিকায় {direction} সরানো হয়েছে।",
  "decision.crewLocation.set": "{crew} {location}-এ গিয়েছে।",
  "decision.station.assigned": "{crew} এখন {station}-এ আছে।",
  "decision.commsPriority.set": "এখন {priority} পাঠানো হচ্ছে।",
};

/** Ages 15+. Same facts, framed with the vocabulary an operator would actually use. */
const COMMANDER_BN: TemplateTable = {
  "power.brownout":
    "লোড শেড: চাহিদা {demandKw} kW বনাম সরবরাহ {servedKw} kW, ব্যাটারি {batteryKwh} kWh। {shedCount}টি সিস্টেম বিচ্ছিন্ন।",
  "power.systemShed": "{system} বাস থেকে বিচ্ছিন্ন করা হয়েছে (নির্ধারিত {powerKw} kW)।",
  "power.batteryDepleted": "চার্জের অবস্থা শূন্য; উৎপাদন {generationKw} kW চাহিদার নিচে।",

  "thermal.heaterUnpowered": "তাপ নিয়ন্ত্রণ ব্যবস্থা অচল। কেবিন {habitatTempC} °সে, পরিবেশের তাপমাত্রার দিকে যাচ্ছে।",
  "thermal.freezeRisk": "কেবিন {habitatTempC} °সে, হিমাঙ্ক-ঝুঁকির সীমা {thresholdC} °সে-এর নিচে।",

  "atmosphere.scrubberOffline": "CO₂ স্ক্রাবার অচল; {co2Kg} কেজি CO₂ অনিয়ন্ত্রিতভাবে জমছে।",
  "atmosphere.co2AboveLimit": "pCO₂ {co2MmHg} mmHg, {mode}-এর {limitMmHg} mmHg সীমা অতিক্রম করেছে।",
  "atmosphere.lowOxygen": "pO₂ {o2MmHg} mmHg — হাইপোক্সিক পরিসরের কাছাকাছি।",

  "water.recoveryOffline": "পানি পুনরুদ্ধার ব্যবস্থা অচল; লুপ ক্ষতি {lostPerHourKg} kg/ঘণ্টা, অসামঞ্জস্যপূর্ণ।",
  "water.belowOneDayReserve": "ব্যবহারযোগ্য পানির মজুত {potableKg} কেজি — {crew} জন ক্রুর জন্য বর্তমান ব্যবহারে ২৪ ঘণ্টারও কম।",
  "water.insufficientForElectrolysis":
    "ইলেক্ট্রোলাইসিস অসম্ভব: {neededKg} কেজি প্রয়োজন, হাতে আছে {availableKg} কেজি।",

  "food.growLightsOff": "আলোক-পর্যায় ব্যাহত — {trays}টি ট্রে কোনো আলোক-ঘণ্টা পাচ্ছে না।",
  "food.lowReserve": "শুষ্ক ভরের মজুত {daysRemaining} দিন ({storedKg} কেজি) বর্তমান রেশনে।",
  "food.exhausted": "শুষ্ক ভরের মজুত নিঃশেষ।",
  "food.harvest": "ট্রে {tray} ({crop}) সংগ্রহ করা হয়েছে: {harvestKg} কেজি শুষ্ক ভর।",

  "radiation.aboveDesignTarget":
    "বিকিরণের হার {rateMSvPerDay} mSv/দিন, NASA-STD-3001-এর {targetMSvPerDay} mSv/দিন পৃষ্ঠ নকশা লক্ষ্যমাত্রা অতিক্রম করেছে।",
  "radiation.careerLimitExceeded":
    "{crew}: সঞ্চিত মাত্রা {doseMSv} mSv, {limitMSv} mSv ক্যারিয়ার সীমা (NASA-STD-3001) অতিক্রম করেছে।",
  "radiation.eventLimitExceeded":
    "{crew}: ঘটনার মাত্রা {limitMGyEq} mGy-Eq ৩০-দিনের SPE সীমা অতিক্রম করেছে।",

  "crew.cold": "{crew}: শীত-চাপ, কেবিন {habitatTempC} °সে।",
  "crew.noWater": "{crew}: কোনো ব্যবহারযোগ্য পানি নেই।",
  "crew.lost": "{crew}: {hour} ঘণ্টায় স্বাস্থ্য শূন্যে পৌঁছেছে।",

  "hazard.dustStorm.start": "ধুলিঝড়ের সূচনা, আনুমানিক {durationHours} ঘণ্টা স্থায়িত্ব, মাত্রা {magnitude}।",
  "hazard.dustStorm.obscuring": "অ্যারে আচ্ছাদন {obscuration}-এ।",
  "hazard.solarParticleEvent.start": "SPE সূচনা — সর্বোচ্চ উপলব্ধ আবরণের পেছনে ক্রুকে আশ্রয় দিন।",
  "hazard.spe.crewExposed": "SPE চলাকালীন {crew} {location}-এ অরক্ষিত।",
  "hazard.pumpFailure.start": "স্টোকাস্টিক পাম্প ব্যর্থতার ঘটনা ঘটেছে।",
  "hazard.pumpFailure": "{system}: পাম্প ব্যর্থ, অচল।",
  "hazard.cropBlight.start": "ফসলের রোগ, মাত্রা {magnitude}।",
  "hazard.cropBlight": "{tray} ({crop}): স্বাস্থ্য অনুপাত কমে {healthFraction}-এ।",

  "system.failure": "{system} ব্যর্থতা (TRL {trl}; {spares}টি স্পেয়ার অবশিষ্ট)।",
  "system.repaired": "{system} স্পেয়ার দিয়ে পুনরুদ্ধার; {sparesRemaining}টি অবশিষ্ট।",

  "isru.passedMoxieMissionTotal":
    "সঞ্চিত ISRU O₂ উৎপাদন {producedG} গ্রাম, MOXIE-র উড্ডয়ন-মোট {moxieMissionTotalG} গ্রাম অতিক্রম করেছে।",

  "comms.blackoutStart": "সৌর সংযোগ-বিচ্ছিন্নতা, ~{durationDays} দিন, ~৭৮০ দিনের সিনোডিক চক্র অনুযায়ী।",
  "comms.blackoutEnd": "সংযোগ পুনরুদ্ধার, একমুখী আলোক-সময় {oneWayLightSeconds} সেকেন্ড।",

  "end.missionComplete": "{hour} ঘণ্টায় মিশন সম্পন্ন: {crewSurviving} জন ক্রু জীবিত।",
  "end.crewLost": "মিশন সমাপ্ত: {hour} ঘণ্টায় ক্রু সংখ্যা শূন্য।",

  "crew.co2Idlh": "{crew}: pCO₂ {co2MmHg} mmHg — জীবন বা স্বাস্থ্যের জন্য তাৎক্ষণিক বিপজ্জনক।",
  "crew.lost.radiation": "{crew}: হারানোর কারণ — তীব্র বিকিরণের সংস্পর্শ।",
  "crew.lost.hypoxia": "{crew}: হারানোর কারণ — হাইপোক্সিয়া।",
  "crew.lost.thirst": "{crew}: হারানোর কারণ — পানিশূন্যতা।",
  "crew.lost.starvation": "{crew}: হারানোর কারণ — অনাহার।",
  "crew.lost.hypothermia": "{crew}: হারানোর কারণ — হাইপোথার্মিয়া।",
  "end.doseLimitExceeded": "{crew}: সঞ্চিত মাত্রা {doseMSv} mSv, {limitMSv} mSv ক্যারিয়ার সীমা অতিক্রম করেছে। মিশন সমাপ্ত।",
  "end.goalMissed": "{hour} ঘণ্টায় মিশন শেষ হয়েছে: মূল লক্ষ্য পূরণ হয়নি, {crewSurviving} জন ক্রু জীবিত।",
  "end.abort": "{hour} ঘণ্টায় ক্রুর সিদ্ধান্তে মিশন বাতিল করা হয়েছে।",
  "abort.rejected.window": "বাতিল প্রত্যাখ্যাত: ~{conjunctionPeriodDays} দিনের সিনোডিক প্রস্থান উইন্ডোর ({windowDays} দিন প্রশস্ত) বাইরে।",
  "incident.fire-mir97.start": "দুর্ঘটনার সূচনা: আগুন ({analogue})।",
  "incident.fire-mir97.resolved": "আগুনের দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.fire-mir97.crewInjured": "{crew} আহত, {durationMinutes} মিনিট পোড়ার স্থায়িত্ব।",
  "incident.depress-mir97.start": "দুর্ঘটনার সূচনা: কেবিন চাপ হ্রাস ({analogue})।",
  "incident.depress-mir97.resolved": "চাপ হ্রাসের দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.depress-mir97.leaking": "কেবিন O₂ ক্ষতি: ফুটোয় {lostKg} কেজি।",
  "incident.o2tank-apollo13.start": "দুর্ঘটনার সূচনা: অক্সিজেন ট্যাংক ব্যর্থতা ({analogue})।",
  "incident.o2tank-apollo13.resolved": "অক্সিজেন ট্যাংকের দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.o2tank-apollo13.rupture": "ট্যাংক ফেটেছে: {lostKg} কেজি O₂ হারিয়েছে।",
  "incident.coolant-ms22.start": "দুর্ঘটনার সূচনা: কুল্যান্ট ফুটো ({analogue})।",
  "incident.coolant-ms22.resolved": "কুল্যান্ট ফুটোর দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.coolant-ms22.overheating": "কুল্যান্ট ক্ষতির কারণে কেবিনের তাপমাত্রা -{riseC} °সে, অনিয়ন্ত্রিত।",
  "incident.spe-1972.start": "দুর্ঘটনার সূচনা: চরম সৌর কণা ঘটনা ({analogue})।",
  "incident.spe-1972.resolved": "SPE দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.spe-1972.spike": "মাত্রার তীব্র বৃদ্ধি: নকশা-মানের SPE-এর {multiplier} গুণ।",
  "incident.duststorm-2018.start": "দুর্ঘটনার সূচনা: তীব্র ধুলিঝড় ({analogue})।",
  "incident.duststorm-2018.resolved": "ধুলিঝড়ের দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.duststorm-2018.severe": "অ্যারে আচ্ছাদন {obscuration}-এ।",
  "incident.scrubber-iss.start": "দুর্ঘটনার সূচনা: বারবার CO₂ স্ক্রাবার ব্যর্থতা ({analogue})।",
  "incident.scrubber-iss.resolved": "স্ক্রাবার দুর্ঘটনা সমাধান — প্রতিক্রিয়া: {response}।",
  "incident.scrubber-iss.recurring": "স্ক্রাবার ব্যর্থতার হার স্বাভাবিকের {multiplier} গুণ।",

  "incident.fire-mir97.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা আগুন শনাক্ত হয়েছে।",
  "incident.fire-mir97.queued": "আগুনের জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.fire-mir97.responseFailed": "আগুনের জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.fire-mir97.responseImpossible": "আগুনের জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.depress-mir97.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা চাপ হ্রাস শনাক্ত হয়েছে।",
  "incident.depress-mir97.queued": "চাপ হ্রাসের জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.depress-mir97.responseFailed": "চাপ হ্রাসের জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.depress-mir97.responseImpossible": "চাপ হ্রাসের জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.o2tank-apollo13.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা অক্সিজেন ট্যাংকের দুর্ঘটনা শনাক্ত হয়েছে।",
  "incident.o2tank-apollo13.queued": "অক্সিজেন ট্যাংকের দুর্ঘটনার জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.o2tank-apollo13.responseFailed": "অক্সিজেন ট্যাংকের দুর্ঘটনার জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.o2tank-apollo13.responseImpossible": "অক্সিজেন ট্যাংকের দুর্ঘটনার জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.coolant-ms22.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা কুল্যান্ট ফুটো শনাক্ত হয়েছে।",
  "incident.coolant-ms22.queued": "কুল্যান্ট ফুটোর জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.coolant-ms22.responseFailed": "কুল্যান্ট ফুটোর জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.coolant-ms22.responseImpossible": "কুল্যান্ট ফুটোর জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.spe-1972.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা SPE শনাক্ত হয়েছে।",
  "incident.spe-1972.queued": "SPE-এর জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.spe-1972.responseFailed": "SPE-এর জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.spe-1972.responseImpossible": "SPE-এর জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.duststorm-2018.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা ধুলিঝড় শনাক্ত হয়েছে।",
  "incident.duststorm-2018.queued": "ধুলিঝড়ের জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.duststorm-2018.responseFailed": "ধুলিঝড়ের জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.duststorm-2018.responseImpossible": "ধুলিঝড়ের জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "incident.scrubber-iss.detected": "ক্রু বা সতর্কীকরণ ব্যবস্থা দ্বারা স্ক্রাবার ব্যর্থতা শনাক্ত হয়েছে।",
  "incident.scrubber-iss.queued": "স্ক্রাবার ব্যর্থতার জন্য প্রতিক্রিয়া সারিবদ্ধ: {response}, {hoursRemaining} ঘণ্টা ক্রু-সময় অবশিষ্ট।",
  "incident.scrubber-iss.responseFailed": "স্ক্রাবার ব্যর্থতার জন্য প্রতিক্রিয়ার চেষ্টা ব্যর্থ: {response} সফল হয়নি।",
  "incident.scrubber-iss.responseImpossible": "স্ক্রাবার ব্যর্থতার জন্য প্রতিক্রিয়া অসম্ভব: {response}-এর জন্য কোনো ক্রু নেই।",
  "system.repairAttemptFailed": "{system}-এর মেরামতের চেষ্টা ব্যর্থ।",

  "incident.spe-1972.electronicsDegraded": "SEP-জনিত স্থায়ী অবনতি: {system}, {fraction} ক্ষমতা হ্রাস।",
  "incident.duststorm-2018.batteryDegraded": "ঝড়ের সময় গভীর-ডিসচার্জ চক্রের কারণে ব্যাটারির ক্ষমতা স্থায়ীভাবে {lostKwh} kWh কমেছে (এখন নির্ধারিত {newCapacityKwh} kWh)।",
  "atmosphere.chronicCo2Exposure": "সঞ্চিত সাব-অ্যাকিউট CO₂ সংস্পর্শ ({exposureMmHgHours} mmHg-h) দীর্ঘস্থায়ী-প্রভাবের সীমা অতিক্রম করেছে; স্থায়ী ক্রু ক্লান্তি বৃদ্ধি প্রয়োগ করা হয়েছে।",
  "incident.fire-mir97.extinguishersExhausted": "প্রতিক্রিয়ার মাঝপথে অগ্নিনির্বাপক মজুত নিঃশেষ: অতিরিক্ত ক্রু আঘাত প্রয়োগ করা হয়েছে।",
  "incident.fire-mir97.respiratorsExhausted": "রেসপিরেটর-কার্তুজ মজুত নিঃশেষ: ধোঁয়া-পুনরুদ্ধার উইন্ডোর অবশিষ্ট সময় ক্রু এখন ফিল্টার মাস্কে, হ্রাসকৃত সুরক্ষা ফ্যাক্টরে।",

  "decision.rations.set": "সারভাইভাল মোড {mode}-এ সেট করা হয়েছে।",
  "decision.priority.changed": "{system}-এর লোড-শেডিং অগ্রাধিকার {direction} সরানো হয়েছে।",
  "decision.crewLocation.set": "{crew} {location}-এ স্থানান্তরিত।",
  "decision.station.assigned": "{crew}-কে প্রধান স্টেশনে পুনর্নিয়োগ: {station}।",
  "decision.commsPriority.set": "ডাউনলিংক অগ্রাধিকার পুনর্নির্ধারিত: {priority}।",
};

const TABLES: Record<DialLevel, TemplateTable> = {
  cadet: CADET,
  specialist: SPECIALIST,
  commander: COMMANDER,
};

const TABLES_BN: Record<DialLevel, TemplateTable> = {
  cadet: CADET_BN,
  specialist: SPECIALIST_BN,
  commander: COMMANDER_BN,
};

const DIRECTION_WORDS: Record<Language, { up: string; down: string }> = {
  en: { up: "up", down: "down" },
  bn: { up: "উপরে", down: "নিচে" },
};

function resolveField(entry: LogEntry, key: string, level: DialLevel, language: Language): string {
  if (key === "system") {
    const id = entry.system ?? (entry.data["system"] as SystemId | undefined);
    return id === undefined ? "" : systemLabel(id, level, language);
  }
  if (key === "location") {
    const loc = entry.data["location"];
    return typeof loc === "string" ? locationLabel(loc as CrewLocation, level, language) : "";
  }
  if (key === "crop") {
    const crop = entry.data["crop"];
    return typeof crop === "string" ? cropLabel(crop as CropTray["crop"], level, language) : "";
  }
  if (key === "mode") {
    const mode = entry.data["mode"];
    return typeof mode === "string" ? survivalModeLabel(mode as SurvivalMode, level, language) : "";
  }
  if (key === "station") {
    const station = entry.data["station"];
    return typeof station === "string" ? stationLabel(station as StationId, level, language) : "";
  }
  if (key === "priority") {
    const priority = entry.data["priority"];
    return typeof priority === "string" ? commsPriorityLabel(priority as CommsPriority, level, language) : "";
  }
  if (key === "direction") {
    // `decision.priority.changed`'s own data: -1 means "shed later" (moved up the list),
    // +1 means "shed sooner" (moved down) — see `applyInput`'s `priority` case.
    const direction = entry.data["direction"];
    const words = DIRECTION_WORDS[language];
    return direction === -1 ? words.up : direction === 1 ? words.down : "";
  }
  const value = entry.data[key];
  return value === undefined ? "" : String(value);
}

/**
 * Renders one entry at one level and language. Falls back to specialist if a level's table
 * is missing a key (should not happen — validation/logText.test.ts checks all three tables
 * cover the same codes) and to the raw code if no table has it at all, so a gap is visible
 * rather than silently blank. A missing Bangla entry falls back to the English table rather
 * than the raw code — a partial DRAFT translation is still more useful to a player than a
 * bare machine code (see `docs/i18n/bn_review.csv` for what's still needsReview).
 */
export function logText(entry: LogEntry, level: DialLevel = "specialist", language: Language = "en"): string {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  const template = tables[level][entry.code] ?? TABLES[level][entry.code] ?? SPECIALIST[entry.code];
  if (template === undefined) return entry.code;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => resolveField(entry, key, level, language));
}

export function hasTemplate(code: string, level: DialLevel = "specialist", language: Language = "en"): boolean {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return code in tables[level];
}

export { CADET as CADET_LOG_TEMPLATES, COMMANDER as COMMANDER_LOG_TEMPLATES, SPECIALIST as EN_LOG_TEMPLATES };
export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts` — every DRAFT Bangla table covers exactly the
 *  same codes as its English counterpart, no more and no less. */
export { TABLES, TABLES_BN };
