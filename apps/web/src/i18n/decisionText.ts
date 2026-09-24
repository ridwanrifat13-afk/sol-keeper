/**
 * Decision Card text, at a chosen Reality Dial level (M8.2).
 *
 * Same discipline as logText.ts: the simulation never stores prose (brief rule 4) — only the
 * stable `briefKey`/`i18nKey` strings each `IncidentDefinition`/`IncidentResponse` already
 * declares (packages/sim/src/engine/incidents.ts). Three complete tables below render those
 * same keys three different ways. At M5's own follow-up pass these move into en.json/bn.json
 * beside logText.ts's tables, the same shape.
 *
 * Trade-off *numbers* (crew-hours, spares, whether a cost is permanent, whether the incident
 * stays ongoing) are never baked into this prose — they come straight from the response's own
 * declared fields (`IncidentResponse.crewHoursCost` etc.) so a Decision Card can never show a
 * cost the engine didn't actually declare. The small phrase functions at the bottom of this
 * file turn those declared fields into a sentence at the current dial level; DecisionCard.tsx
 * calls them directly rather than this file inventing per-response trade-off text.
 */
import { stationLabel } from "../dial/labels.js";
import type { DialLevel } from "../dial/types.js";

type TemplateTable = Record<string, string>;

const SPECIALIST: TemplateTable = {
  "incident.fire-mir97.brief":
    "A fire has broken out, echoing the 1997 Mir fire. Someone may already be hurt, and the smoke will affect the crew for a while no matter which response you choose.",
  "incident.fire-mir97.response.fight":
    "Fight the fire directly using the outpost's fire extinguishers.",
  "incident.fire-mir97.response.evacuate": "Evacuate the area and seal it off without fighting the fire further.",
  "incident.fire-mir97.response.ignore": "Leave the fire unattended.",

  "incident.depress-mir97.brief":
    "The cabin is losing pressure through a leak, similar to the 1997 Progress collision with Mir's Spektr module. It keeps leaking until it's sealed or patched.",
  "incident.depress-mir97.response.sealModule":
    "Seal off the leaking module completely — stops the leak for good, but permanently cuts that module's power.",
  "incident.depress-mir97.response.patchHull":
    "Patch the hull using spare parts — stops the leak without losing the module, but costs spares and crew time.",
  "incident.depress-mir97.response.ignoreLeak": "Leave the leak unaddressed.",

  "incident.o2tank-apollo13.brief":
    "CO₂ is building up faster than the scrubber can handle, as it did aboard Apollo 13's lifeboat. It keeps climbing until addressed.",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "Improvise a fix for the scrubber — brings CO₂ back down, but the improvised adapter is never as good as the original hardware.",
  "incident.o2tank-apollo13.response.rationActivity":
    "Cut crew activity to reduce how much CO₂ and heat they produce, at the cost of crew-hours available for other work.",
  "incident.o2tank-apollo13.response.noResponse": "Leave the CO₂ buildup unaddressed.",

  "incident.coolant-ms22.brief":
    "A coolant leak is letting the cabin overheat, as happened aboard Soyuz MS-22. It keeps climbing toward its peak temperature until load is shed.",
  "incident.coolant-ms22.response.shedLoad":
    "Shed non-critical loads to cool the cabin back down — costs crew-hours and some crop health.",
  "incident.coolant-ms22.response.rideItOut": "Ride out the heat without shedding any load.",

  "incident.spe-1972.brief":
    "A major solar particle event is hitting, similar to the August 1972 storm. Every crew member takes a radiation dose this hour regardless of what you choose — sheltering only protects against further exposure.",
  "incident.spe-1972.response.shelterNow": "Move all crew to the storm shelter immediately.",
  "incident.spe-1972.response.continueOperations": "Continue normal operations without sheltering.",

  "incident.duststorm-2018.brief":
    "A major dust storm is obscuring the solar arrays, echoing the 2018 global storm that ended Opportunity's mission. Some of this dust will never come off, however you respond.",
  "incident.duststorm-2018.response.cleanArrays":
    "Send a crew member out to clean the arrays — clears the most dust, but costs crew-hours and radiation dose from the EVA.",
  "incident.duststorm-2018.response.shedNonEssential":
    "Shed non-essential loads instead of cleaning — a smaller improvement, but no EVA needed.",
  "incident.duststorm-2018.response.noResponse": "Leave the dust where it is.",

  "incident.scrubber-iss.brief":
    "The CO₂ scrubber has failed outright, a recurring problem on the real ISS's CDRA system. It will not come back on its own.",
  "incident.scrubber-iss.response.swapCartridge":
    "Swap in a spare cartridge to bring the scrubber back online — real hardware degrades a little more each time this is done, and this is no exception.",
  "incident.scrubber-iss.response.manualVenting":
    "Manually vent some of the excess CO₂ without fixing the scrubber itself.",
  "incident.scrubber-iss.response.noResponse": "Leave the scrubber offline.",
};

const CADET: TemplateTable = {
  "incident.fire-mir97.brief":
    "There's a fire! Someone might already be hurt, and the smoke will bother everyone for a while, whatever you pick.",
  "incident.fire-mir97.response.fight": "Try to put the fire out yourself.",
  "incident.fire-mir97.response.evacuate": "Get everyone out and shut the door.",
  "incident.fire-mir97.response.ignore": "Don't do anything about it.",

  "incident.depress-mir97.brief": "Air is leaking out of the cabin! It'll keep leaking until you fix it.",
  "incident.depress-mir97.response.sealModule":
    "Shut the leaky room off completely. It stops the leak, but that room's power is gone for good.",
  "incident.depress-mir97.response.patchHull": "Patch the hole with spare parts. Costs some supplies and takes a while.",
  "incident.depress-mir97.response.ignoreLeak": "Don't fix the leak.",

  "incident.o2tank-apollo13.brief": "The air is getting bad and it'll keep getting worse until you do something.",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "Build a fix out of spare parts. It works, but the fix isn't as good as the real thing, forever.",
  "incident.o2tank-apollo13.response.rationActivity":
    "Have everyone slow down and rest more, so they make less bad air. But less gets done.",
  "incident.o2tank-apollo13.response.noResponse": "Don't do anything about the bad air.",

  "incident.coolant-ms22.brief": "Something's wrong with the cooling and it's getting hot in here.",
  "incident.coolant-ms22.response.shedLoad":
    "Turn some things off to cool down. It costs some crew time and the plants don't like it.",
  "incident.coolant-ms22.response.rideItOut": "Just put up with the heat.",

  "incident.spe-1972.brief":
    "A big solar storm is happening right now! Everyone gets some radiation no matter what, but getting to the safe room stops it from getting worse.",
  "incident.spe-1972.response.shelterNow": "Get everyone to the safe room right now!",
  "incident.spe-1972.response.continueOperations": "Keep working like normal.",

  "incident.duststorm-2018.brief":
    "A giant dust storm is covering the solar panels! Some of the dust will stay forever, no matter what you do.",
  "incident.duststorm-2018.response.cleanArrays":
    "Send someone outside to wipe the dust off. It works best, but costs time and a little radiation.",
  "incident.duststorm-2018.response.shedNonEssential":
    "Turn off things you don't need instead of going outside. Helps a little, and it's safer.",
  "incident.duststorm-2018.response.noResponse": "Don't do anything about the dust.",

  "incident.scrubber-iss.brief": "The air cleaner just broke and won't fix itself.",
  "incident.scrubber-iss.response.swapCartridge":
    "Put in a spare part to fix the air cleaner. It works, but it gets a little weaker every time you do this.",
  "incident.scrubber-iss.response.manualVenting": "Let some of the bad air out by hand, without fixing the machine.",
  "incident.scrubber-iss.response.noResponse": "Don't fix the air cleaner.",
};

const COMMANDER: TemplateTable = {
  "incident.fire-mir97.brief":
    "Onboard fire ({analogue}). One crew injury already logged; a fixed-duration smoke-recovery fatigue tail runs regardless of response.",
  "incident.fire-mir97.response.fight":
    "Direct suppression, drawing on the tracked extinguisher stock; reduces the injury already sustained.",
  "incident.fire-mir97.response.evacuate": "Evacuate and isolate; injury stands, fire contained by isolation rather than suppression.",
  "incident.fire-mir97.response.ignore": "No action — fire and injury both worsen.",

  "incident.depress-mir97.brief":
    "Cabin depressurization ({analogue}) — modeled as choked-orifice flow; O₂ decays exponentially until addressed.",
  "incident.depress-mir97.response.sealModule":
    "Seal the module: leak eliminated; permanent solar-array-area loss (the sealed module's own arrays).",
  "incident.depress-mir97.response.patchHull":
    "Hull patch: leak eliminated, no capacity loss; costs thermalControl spares and crew-hours.",
  "incident.depress-mir97.response.ignoreLeak": "No action — leak continues indefinitely.",

  "incident.o2tank-apollo13.brief":
    "CO₂ accumulation exceeding scrubber capacity ({analogue}); rises linearly until addressed.",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "Improvised adapter: reduces CO₂ toward the documented post-fix level; permanent scrubber-efficiency penalty, declared and unrecoverable.",
  "incident.o2tank-apollo13.response.rationActivity":
    "Ration activity: reduces crew metabolic output (CO₂, heat) while active; reduces today's crew-hours budget.",
  "incident.o2tank-apollo13.response.noResponse": "No action — CO₂ accumulation continues unchecked.",

  "incident.coolant-ms22.brief":
    "Coolant-loop failure ({analogue}); cabin temperature approaches its documented peak on a first-order lag until load is shed.",
  "incident.coolant-ms22.response.shedLoad":
    "Shed load: immediate, bounded cabin-temperature correction; crop-health penalty; real crew-hours cost.",
  "incident.coolant-ms22.response.rideItOut": "No action — cabin temperature continues tracking toward its peak.",

  "incident.spe-1972.brief":
    "SPE onset ({analogue}). The initial spike dose is already applied to every crew member regardless of response; only ongoing exposure is affected by location.",
  "incident.spe-1972.response.shelterNow":
    "Relocate all living crew to the storm shelter; reduces further transmitted dose via shielding.",
  "incident.spe-1972.response.continueOperations":
    "No relocation — crew remain at their current shielding factor for ongoing exposure.",

  "incident.duststorm-2018.brief":
    "Dust storm onset ({analogue}). A permanent obscuration floor is applied regardless of response; only the storm-driven spike above that floor is addressable.",
  "incident.duststorm-2018.response.cleanArrays":
    "EVA array cleaning: largest obscuration reduction; crew-hours cost plus GCR/SPE dose for the EVA duration.",
  "incident.duststorm-2018.response.shedNonEssential":
    "Load shedding: smaller obscuration reduction; no EVA dose; lower crew-hours cost.",
  "incident.duststorm-2018.response.noResponse": "No action — obscuration remains at its post-spike level.",

  "incident.scrubber-iss.brief":
    "CO₂ scrubber failure ({analogue}); non-self-recovering, unlike an ordinary system fault.",
  "incident.scrubber-iss.response.swapCartridge":
    "Cartridge swap: restores operational status; spares cost; permanent, stacking efficiency penalty (repeat sorbent-bed degradation).",
  "incident.scrubber-iss.response.manualVenting": "Manual venting: one-time CO₂ reduction; scrubber remains offline.",
  "incident.scrubber-iss.response.noResponse": "No action — scrubber remains offline, CO₂ continues accumulating.",
};

const TABLES: Record<DialLevel, TemplateTable> = {
  cadet: CADET,
  specialist: SPECIALIST,
  commander: COMMANDER,
};

/**
 * Renders one `briefKey`/`i18nKey` at one level. `{analogue}` is the only placeholder any
 * entry here uses; every other detail (costs, permanence, ongoing-ness) is rendered
 * separately by the phrase functions below, straight from the response's own declared fields.
 * Falls back to specialist, then to the raw key, same missing-template discipline as
 * logText.ts.
 */
export function decisionText(key: string, level: DialLevel, analogue?: string): string {
  const template = TABLES[level][key] ?? SPECIALIST[key];
  if (template === undefined) return key;
  return analogue === undefined ? template : template.replace(/\{analogue\}/g, analogue);
}

export function hasDecisionTemplate(key: string, level: DialLevel = "specialist"): boolean {
  return key in TABLES[level];
}

// --- Trade-off phrases: built from an IncidentResponse's own declared fields, never invented ---

export function stationNamedPhrase(level: DialLevel, stationId: Parameters<typeof stationLabel>[0]): string {
  const name = stationLabel(stationId, level);
  return level === "cadet" ? `${name} is on this.` : `Owning station: ${name}.`;
}

export function crewHoursCostPhrase(level: DialLevel, hours: number): string {
  if (level === "cadet") return `Takes about ${hours} hour(s) of crew work.`;
  if (level === "commander") return `${hours} crew-hour(s) declared.`;
  return `Costs ${hours} crew-hour(s).`;
}

export function sparesCostPhrase(level: DialLevel, count: number, systemName: string): string {
  if (level === "cadet") return `Uses up ${count} spare part(s) from ${systemName}.`;
  if (level === "commander") return `${count} spare(s) drawn from ${systemName}; a shortfall worsens the success roll.`;
  return `Costs ${count} spare(s) from ${systemName}.`;
}

export function permanentPenaltyPhrase(level: DialLevel): string {
  if (level === "cadet") return "This cost never goes away, even after the problem is fixed.";
  if (level === "commander") return "Declared permanentPenalty: this cost persists for the rest of the mission.";
  return "This cost is permanent — it lasts for the rest of the mission.";
}

export function leavesOngoingPhrase(level: DialLevel): string {
  if (level === "cadet") return "This doesn't fully fix the problem — it can keep getting worse.";
  if (level === "commander") return "Does not address the root cause; the underlying process continues.";
  return "This does not fully resolve the incident — it can keep getting worse afterward.";
}

export function willResolveThisHourPhrase(level: DialLevel, willResolve: boolean): string {
  if (willResolve) {
    return level === "cadet" ? "Happens right away." : "Takes effect this hour.";
  }
  return level === "cadet"
    ? "Takes too long — will finish later, not right away."
    : "Will not complete this hour — the remaining work queues into a later day.";
}

export function noChoicePhrase(level: DialLevel): string {
  if (level === "cadet") return "If nobody decides:";
  if (level === "commander") return "Default consequence if no response is chosen:";
  return "If you do nothing:";
}
