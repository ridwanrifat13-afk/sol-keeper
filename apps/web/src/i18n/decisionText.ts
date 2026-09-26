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
import type { DialLevel, Language } from "../dial/types.js";

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

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`), same three
 *  tables, same keys, `{analogue}` in the same position. */
const SPECIALIST_BN: TemplateTable = {
  "incident.fire-mir97.brief":
    "আগুন লেগেছে, ১৯৯৭ সালের মির আগুনের প্রতিধ্বনি। কেউ হয়তো ইতিমধ্যে আহত হয়েছে, এবং আপনি যে সমাধানই বেছে নিন না কেন ধোঁয়া কিছুক্ষণ ক্রুকে প্রভাবিত করবে।",
  "incident.fire-mir97.response.fight": "আউটপোস্টের অগ্নিনির্বাপক যন্ত্র দিয়ে সরাসরি আগুনের বিরুদ্ধে লড়ুন।",
  "incident.fire-mir97.response.evacuate": "এলাকা খালি করে সিল করে দিন, আগুনের সাথে আর লড়াই না করে।",
  "incident.fire-mir97.response.ignore": "আগুন উপেক্ষা করুন।",

  "incident.depress-mir97.brief":
    "কেবিন একটি ফুটো দিয়ে চাপ হারাচ্ছে, ১৯৯৭ সালে প্রগ্রেসের সাথে মিরের স্পেকট্র মডিউলের সংঘর্ষের মতো। সিল বা মেরামত না করা পর্যন্ত এটি ফুটতে থাকবে।",
  "incident.depress-mir97.response.sealModule":
    "ফুটো থাকা মডিউলটি সম্পূর্ণভাবে সিল করে দিন — ফুটো চিরতরে বন্ধ হবে, কিন্তু সেই মডিউলের বিদ্যুৎ স্থায়ীভাবে বন্ধ হয়ে যাবে।",
  "incident.depress-mir97.response.patchHull":
    "স্পেয়ার পার্টস দিয়ে হাল প্যাচ করুন — মডিউল না হারিয়ে ফুটো বন্ধ হয়, কিন্তু স্পেয়ার এবং ক্রু-সময় খরচ হয়।",
  "incident.depress-mir97.response.ignoreLeak": "ফুটো উপেক্ষা করুন।",

  "incident.o2tank-apollo13.brief":
    "স্ক্রাবার সামলাতে পারার চেয়ে দ্রুত CO₂ জমছে, যেমনটা অ্যাপোলো ১৩-এর লাইফবোটে হয়েছিল। সমাধান না হওয়া পর্যন্ত এটি বাড়তেই থাকবে।",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "স্ক্রাবারের জন্য একটি অস্থায়ী সমাধান তৈরি করুন — CO₂ কমে আসে, কিন্তু এই অস্থায়ী অ্যাডাপ্টার কখনোই আসল যন্ত্রাংশের মতো ভালো নয়।",
  "incident.o2tank-apollo13.response.rationActivity":
    "ক্রুর কার্যকলাপ কমান যাতে তারা কম CO₂ এবং তাপ উৎপন্ন করে, অন্য কাজের জন্য ক্রু-সময়ের বিনিময়ে।",
  "incident.o2tank-apollo13.response.noResponse": "CO₂ জমা হওয়া উপেক্ষা করুন।",

  "incident.coolant-ms22.brief":
    "একটি কুল্যান্ট ফুটোর কারণে কেবিন অতিরিক্ত গরম হচ্ছে, যেমনটা সয়ুজ MS-22-এ হয়েছিল। লোড না কমানো পর্যন্ত এটি তার সর্বোচ্চ তাপমাত্রার দিকে বাড়তে থাকবে।",
  "incident.coolant-ms22.response.shedLoad":
    "কেবিন ঠান্ডা করতে অ-জরুরি লোড কমান — ক্রু-সময় এবং কিছু ফসলের স্বাস্থ্য খরচ হয়।",
  "incident.coolant-ms22.response.rideItOut": "লোড না কমিয়ে তাপ সহ্য করুন।",

  "incident.spe-1972.brief":
    "একটি বড় সৌর কণা ঘটনা আঘাত হানছে, ১৯৭২ সালের আগস্টের ঝড়ের মতো। আপনি যাই বেছে নিন, প্রতিটি ক্রু এই ঘণ্টায় বিকিরণের মাত্রা পাবে — আশ্রয় নেওয়া শুধু আরও এক্সপোজার থেকে রক্ষা করে।",
  "incident.spe-1972.response.shelterNow": "সব ক্রুকে অবিলম্বে ঝড় আশ্রয়কেন্দ্রে নিয়ে যান।",
  "incident.spe-1972.response.continueOperations": "আশ্রয় না নিয়ে স্বাভাবিক কার্যক্রম চালিয়ে যান।",

  "incident.duststorm-2018.brief":
    "একটি বড় ধুলিঝড় সোলার অ্যারে ঢেকে দিচ্ছে, ২০১৮ সালের বৈশ্বিক ঝড়ের প্রতিধ্বনি যা অপরচুনিটির মিশন শেষ করেছিল। আপনি যেভাবেই সাড়া দিন না কেন, এই ধুলার কিছু অংশ কখনোই সরবে না।",
  "incident.duststorm-2018.response.cleanArrays":
    "অ্যারে পরিষ্কার করতে একজন ক্রুকে বাইরে পাঠান — সবচেয়ে বেশি ধুলা সরায়, কিন্তু ক্রু-সময় এবং ইভিএ থেকে বিকিরণের মাত্রা খরচ হয়।",
  "incident.duststorm-2018.response.shedNonEssential":
    "পরিষ্কার না করে অ-জরুরি লোড কমান — ছোট উন্নতি, কিন্তু ইভিএর দরকার নেই।",
  "incident.duststorm-2018.response.noResponse": "ধুলা যেমন আছে তেমনই রেখে দিন।",

  "incident.scrubber-iss.brief":
    "CO₂ স্ক্রাবার সম্পূর্ণভাবে বিকল হয়ে গেছে, আসল ISS-এর CDRA সিস্টেমে একটি পুনরাবৃত্ত সমস্যা। এটি নিজে থেকে আর চালু হবে না।",
  "incident.scrubber-iss.response.swapCartridge":
    "স্ক্রাবার আবার চালু করতে একটি স্পেয়ার কার্তুজ লাগান — আসল হার্ডওয়্যার প্রতিবার একটু একটু করে ক্ষয় হয়, এবং এটি ব্যতিক্রম নয়।",
  "incident.scrubber-iss.response.manualVenting": "স্ক্রাবার নিজে ঠিক না করে হাতে করে অতিরিক্ত CO₂ বের করে দিন।",
  "incident.scrubber-iss.response.noResponse": "স্ক্রাবার বন্ধ রাখুন।",
};

const CADET_BN: TemplateTable = {
  "incident.fire-mir97.brief":
    "আগুন লেগেছে! কেউ হয়তো ইতিমধ্যে আহত হয়েছে, আর আপনি যাই বেছে নিন, ধোঁয়া সবাইকে কিছুক্ষণ বিরক্ত করবে।",
  "incident.fire-mir97.response.fight": "নিজেই আগুন নেভানোর চেষ্টা করুন।",
  "incident.fire-mir97.response.evacuate": "সবাইকে বের করে দরজা বন্ধ করে দিন।",
  "incident.fire-mir97.response.ignore": "কিছুই করবেন না।",

  "incident.depress-mir97.brief": "কেবিন থেকে বাতাস বের হয়ে যাচ্ছে! ঠিক না করা পর্যন্ত এটি চলতেই থাকবে।",
  "incident.depress-mir97.response.sealModule":
    "ফুটো থাকা ঘরটি সম্পূর্ণ বন্ধ করে দিন। ফুটো থেমে যায়, কিন্তু সেই ঘরের বিদ্যুৎ চিরতরে চলে যায়।",
  "incident.depress-mir97.response.patchHull": "স্পেয়ার পার্টস দিয়ে ফুটো প্যাচ করুন। কিছু জিনিস খরচ হয় আর সময় লাগে।",
  "incident.depress-mir97.response.ignoreLeak": "ফুটো ঠিক করবেন না।",

  "incident.o2tank-apollo13.brief": "বাতাস খারাপ হয়ে যাচ্ছে, আর কিছু না করলে এটি আরও খারাপ হতে থাকবে।",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "স্পেয়ার পার্টস দিয়ে একটা সমাধান তৈরি করুন। এটা কাজ করে, কিন্তু আসল জিনিসের মতো ভালো না, চিরকালের জন্য।",
  "incident.o2tank-apollo13.response.rationActivity":
    "সবাইকে ধীরে চলতে আর বেশি বিশ্রাম নিতে বলুন, যাতে কম খারাপ বাতাস তৈরি হয়। কিন্তু কম কাজ হবে।",
  "incident.o2tank-apollo13.response.noResponse": "খারাপ বাতাস নিয়ে কিছু করবেন না।",

  "incident.coolant-ms22.brief": "কুলিং সিস্টেমে সমস্যা হয়েছে আর এখানে গরম হয়ে যাচ্ছে।",
  "incident.coolant-ms22.response.shedLoad":
    "ঠান্ডা করতে কিছু জিনিস বন্ধ করুন। কিছু ক্রু-সময় লাগে আর গাছপালা এটা পছন্দ করে না।",
  "incident.coolant-ms22.response.rideItOut": "শুধু গরম সহ্য করুন।",

  "incident.spe-1972.brief":
    "একটা বড় সৌর ঝড় এখনই হচ্ছে! আপনি যাই করুন না কেন সবাই কিছুটা বিকিরণ পাবে, কিন্তু নিরাপদ ঘরে যাওয়া এটাকে আরও খারাপ হওয়া থেকে আটকায়।",
  "incident.spe-1972.response.shelterNow": "এখনই সবাইকে নিরাপদ ঘরে নিয়ে যান!",
  "incident.spe-1972.response.continueOperations": "স্বাভাবিকভাবে কাজ চালিয়ে যান।",

  "incident.duststorm-2018.brief":
    "একটা বিশাল ধুলিঝড় সোলার প্যানেল ঢেকে দিচ্ছে! আপনি যাই করুন, কিছু ধুলা চিরকাল থেকে যাবে।",
  "incident.duststorm-2018.response.cleanArrays":
    "ধুলা মুছতে কাউকে বাইরে পাঠান। এটা সবচেয়ে ভালো কাজ করে, কিন্তু সময় আর একটু বিকিরণ লাগে।",
  "incident.duststorm-2018.response.shedNonEssential":
    "বাইরে না গিয়ে দরকার নেই এমন জিনিস বন্ধ করুন। একটু সাহায্য করে, আর এটা নিরাপদ।",
  "incident.duststorm-2018.response.noResponse": "ধুলা নিয়ে কিছু করবেন না।",

  "incident.scrubber-iss.brief": "বাতাস পরিষ্কারক এইমাত্র ভেঙে গেছে আর নিজে ঠিক হবে না।",
  "incident.scrubber-iss.response.swapCartridge":
    "বাতাস পরিষ্কারক ঠিক করতে একটা স্পেয়ার পার্ট লাগান। এটা কাজ করে, কিন্তু প্রতিবার একটু দুর্বল হয়ে যায়।",
  "incident.scrubber-iss.response.manualVenting": "যন্ত্র না ঠিক করে হাতে করে কিছু খারাপ বাতাস বের করে দিন।",
  "incident.scrubber-iss.response.noResponse": "বাতাস পরিষ্কারক ঠিক করবেন না।",
};

const COMMANDER_BN: TemplateTable = {
  "incident.fire-mir97.brief":
    "অনবোর্ড আগুন ({analogue})। একটি ক্রু আঘাত ইতিমধ্যে লগ করা হয়েছে; প্রতিক্রিয়া নির্বিশেষে একটি নির্দিষ্ট-সময়কালের ধোঁয়া-পুনরুদ্ধার ক্লান্তি প্রভাব চলবে।",
  "incident.fire-mir97.response.fight":
    "সরাসরি দমন, ট্র্যাক করা অগ্নিনির্বাপক মজুত ব্যবহার করে; ইতিমধ্যে হওয়া আঘাত কমায়।",
  "incident.fire-mir97.response.evacuate":
    "সরিয়ে নিয়ে বিচ্ছিন্ন করুন; আঘাত অপরিবর্তিত থাকে, আগুন দমনের বদলে বিচ্ছিন্নতার মাধ্যমে নিয়ন্ত্রিত হয়।",
  "incident.fire-mir97.response.ignore": "কোনো পদক্ষেপ নেই — আগুন এবং আঘাত উভয়ই বাড়বে।",

  "incident.depress-mir97.brief":
    "কেবিন চাপ হ্রাস ({analogue}) — চোকড-অরিফিস প্রবাহ হিসেবে মডেল করা হয়েছে; সমাধান না হওয়া পর্যন্ত O₂ সূচকীয়ভাবে হ্রাস পায়।",
  "incident.depress-mir97.response.sealModule":
    "মডিউল সিল করুন: ফুটো নির্মূল হয়; স্থায়ী সোলার-অ্যারে-এলাকা ক্ষতি (সিল করা মডিউলের নিজস্ব অ্যারে)।",
  "incident.depress-mir97.response.patchHull":
    "হাল প্যাচ: ফুটো নির্মূল, কোনো ক্ষমতা ক্ষতি নেই; thermalControl স্পেয়ার এবং ক্রু-সময় খরচ হয়।",
  "incident.depress-mir97.response.ignoreLeak": "কোনো পদক্ষেপ নেই — ফুটো অনির্দিষ্টকাল চলতে থাকে।",

  "incident.o2tank-apollo13.brief":
    "স্ক্রাবারের ক্ষমতা অতিক্রমকারী CO₂ সঞ্চয়ন ({analogue}); সমাধান না হওয়া পর্যন্ত রৈখিকভাবে বাড়ে।",
  "incident.o2tank-apollo13.response.improviseAdapter":
    "অস্থায়ী অ্যাডাপ্টার: CO₂ নথিভুক্ত পোস্ট-ফিক্স স্তরের দিকে কমায়; স্থায়ী স্ক্রাবার-দক্ষতা জরিমানা, ঘোষিত এবং অপরিবর্তনীয়।",
  "incident.o2tank-apollo13.response.rationActivity":
    "কার্যকলাপ রেশন: সক্রিয় থাকাকালীন ক্রুর বিপাকীয় আউটপুট (CO₂, তাপ) কমায়; আজকের ক্রু-সময়ের বাজেট কমায়।",
  "incident.o2tank-apollo13.response.noResponse": "কোনো পদক্ষেপ নেই — CO₂ সঞ্চয়ন অনিয়ন্ত্রিতভাবে চলতে থাকে।",

  "incident.coolant-ms22.brief":
    "কুল্যান্ট-লুপ ব্যর্থতা ({analogue}); লোড না কমানো পর্যন্ত কেবিনের তাপমাত্রা প্রথম-ক্রমের ল্যাগে তার নথিভুক্ত শীর্ষের কাছে পৌঁছায়।",
  "incident.coolant-ms22.response.shedLoad":
    "লোড কমান: তাৎক্ষণিক, সীমাবদ্ধ কেবিন-তাপমাত্রা সংশোধন; ফসল-স্বাস্থ্য জরিমানা; প্রকৃত ক্রু-সময় খরচ।",
  "incident.coolant-ms22.response.rideItOut": "কোনো পদক্ষেপ নেই — কেবিনের তাপমাত্রা তার শীর্ষের দিকে চলতে থাকে।",

  "incident.spe-1972.brief":
    "SPE সূচনা ({analogue})। প্রাথমিক স্পাইক মাত্রা প্রতিক্রিয়া নির্বিশেষে প্রতিটি ক্রুর উপর ইতিমধ্যে প্রয়োগ করা হয়েছে; শুধুমাত্র চলমান এক্সপোজার অবস্থান দ্বারা প্রভাবিত হয়।",
  "incident.spe-1972.response.shelterNow":
    "সব জীবিত ক্রুকে ঝড় আশ্রয়কেন্দ্রে স্থানান্তর করুন; শিল্ডিং এর মাধ্যমে আরও প্রেরিত মাত্রা কমায়।",
  "incident.spe-1972.response.continueOperations":
    "কোনো স্থানান্তর নেই — চলমান এক্সপোজারের জন্য ক্রু তাদের বর্তমান শিল্ডিং ফ্যাক্টরে থাকে।",

  "incident.duststorm-2018.brief":
    "ধুলিঝড়ের সূচনা ({analogue})। প্রতিক্রিয়া নির্বিশেষে একটি স্থায়ী আচ্ছাদন মেঝে প্রয়োগ করা হয়; শুধুমাত্র সেই মেঝের উপরে ঝড়-চালিত স্পাইক সমাধানযোগ্য।",
  "incident.duststorm-2018.response.cleanArrays":
    "ইভিএ অ্যারে পরিষ্কার: সবচেয়ে বড় আচ্ছাদন হ্রাস; ক্রু-সময় খরচ এবং ইভিএর সময়কালের জন্য GCR/SPE মাত্রা।",
  "incident.duststorm-2018.response.shedNonEssential":
    "লোড শেডিং: ছোট আচ্ছাদন হ্রাস; কোনো ইভিএ মাত্রা নেই; কম ক্রু-সময় খরচ।",
  "incident.duststorm-2018.response.noResponse": "কোনো পদক্ষেপ নেই — আচ্ছাদন তার পোস্ট-স্পাইক স্তরে থেকে যায়।",

  "incident.scrubber-iss.brief":
    "CO₂ স্ক্রাবার ব্যর্থতা ({analogue}); একটি সাধারণ সিস্টেম ত্রুটির বিপরীতে, স্ব-পুনরুদ্ধারকারী নয়।",
  "incident.scrubber-iss.response.swapCartridge":
    "কার্তুজ প্রতিস্থাপন: কার্যক্ষম অবস্থা পুনরুদ্ধার করে; স্পেয়ার খরচ; স্থায়ী, স্তূপীকৃত দক্ষতা জরিমানা (পুনরাবৃত্ত সরবেন্ট-বেড অবনতি)।",
  "incident.scrubber-iss.response.manualVenting": "ম্যানুয়াল ভেন্টিং: এককালীন CO₂ হ্রাস; স্ক্রাবার অফলাইন থাকে।",
  "incident.scrubber-iss.response.noResponse": "কোনো পদক্ষেপ নেই — স্ক্রাবার অফলাইন থাকে, CO₂ ক্রমাগত জমা হতে থাকে।",
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

/**
 * Renders one `briefKey`/`i18nKey` at one level and language. `{analogue}` is the only
 * placeholder any entry here uses; every other detail (costs, permanence, ongoing-ness) is
 * rendered separately by the phrase functions below, straight from the response's own
 * declared fields. Falls back to the English table (not the raw key) when a Bangla DRAFT
 * entry is missing, then to the raw key, same missing-template discipline as logText.ts.
 */
export function decisionText(key: string, level: DialLevel, analogue?: string, language: Language = "en"): string {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  const template = tables[level][key] ?? TABLES[level][key] ?? SPECIALIST[key];
  if (template === undefined) return key;
  return analogue === undefined ? template : template.replace(/\{analogue\}/g, analogue);
}

export function hasDecisionTemplate(key: string, level: DialLevel = "specialist", language: Language = "en"): boolean {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return key in tables[level];
}

export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts` — every DRAFT Bangla table covers exactly the
 *  same keys as its English counterpart, no more and no less. */
export { TABLES, TABLES_BN };

// --- Trade-off phrases: built from an IncidentResponse's own declared fields, never invented ---

export function stationNamedPhrase(
  level: DialLevel,
  stationId: Parameters<typeof stationLabel>[0],
  language: Language = "en",
): string {
  const name = stationLabel(stationId, level, language);
  if (language === "bn") return level === "cadet" ? `${name} এটা দেখছে।` : `দায়িত্বপ্রাপ্ত স্টেশন: ${name}।`;
  return level === "cadet" ? `${name} is on this.` : `Owning station: ${name}.`;
}

export function crewHoursCostPhrase(level: DialLevel, hours: number, language: Language = "en"): string {
  if (language === "bn") {
    if (level === "cadet") return `প্রায় ${hours} ঘণ্টা ক্রুর কাজ লাগে।`;
    if (level === "commander") return `${hours} ক্রু-ঘণ্টা ঘোষিত।`;
    return `${hours} ক্রু-ঘণ্টা খরচ হয়।`;
  }
  if (level === "cadet") return `Takes about ${hours} hour(s) of crew work.`;
  if (level === "commander") return `${hours} crew-hour(s) declared.`;
  return `Costs ${hours} crew-hour(s).`;
}

export function sparesCostPhrase(level: DialLevel, count: number, systemName: string, language: Language = "en"): string {
  if (language === "bn") {
    if (level === "cadet") return `${systemName} থেকে ${count}টি স্পেয়ার পার্ট ব্যবহার হয়।`;
    if (level === "commander")
      return `${systemName} থেকে ${count}টি স্পেয়ার নেওয়া হয়েছে; ঘাটতি সফলতার সম্ভাবনা খারাপ করে।`;
    return `${systemName} থেকে ${count}টি স্পেয়ার খরচ হয়।`;
  }
  if (level === "cadet") return `Uses up ${count} spare part(s) from ${systemName}.`;
  if (level === "commander") return `${count} spare(s) drawn from ${systemName}; a shortfall worsens the success roll.`;
  return `Costs ${count} spare(s) from ${systemName}.`;
}

export function permanentPenaltyPhrase(level: DialLevel, language: Language = "en"): string {
  if (language === "bn") {
    if (level === "cadet") return "এই খরচ কখনো যাবে না, সমস্যা ঠিক হওয়ার পরেও না।";
    if (level === "commander") return "ঘোষিত permanentPenalty: এই খরচ মিশনের বাকি সময় জুড়ে থাকবে।";
    return "এই খরচ স্থায়ী — এটা মিশনের বাকি সময় জুড়ে থাকবে।";
  }
  if (level === "cadet") return "This cost never goes away, even after the problem is fixed.";
  if (level === "commander") return "Declared permanentPenalty: this cost persists for the rest of the mission.";
  return "This cost is permanent — it lasts for the rest of the mission.";
}

export function leavesOngoingPhrase(level: DialLevel, language: Language = "en"): string {
  if (language === "bn") {
    if (level === "cadet") return "এটা সমস্যা পুরোপুরি ঠিক করে না — এটা আরও খারাপ হতে পারে।";
    if (level === "commander") return "মূল কারণ সমাধান করে না; অন্তর্নিহিত প্রক্রিয়া চলতেই থাকে।";
    return "এটা দুর্ঘটনা পুরোপুরি সমাধান করে না — পরে এটা আরও খারাপ হতে পারে।";
  }
  if (level === "cadet") return "This doesn't fully fix the problem — it can keep getting worse.";
  if (level === "commander") return "Does not address the root cause; the underlying process continues.";
  return "This does not fully resolve the incident — it can keep getting worse afterward.";
}

export function willResolveThisHourPhrase(level: DialLevel, willResolve: boolean, language: Language = "en"): string {
  if (language === "bn") {
    if (willResolve) return level === "cadet" ? "এখনই ঘটবে।" : "এই ঘণ্টায় কার্যকর হবে।";
    return level === "cadet"
      ? "অনেক সময় লাগছে — এখনই না, পরে শেষ হবে।"
      : "এই ঘণ্টায় সম্পন্ন হবে না — বাকি কাজ পরের দিনে সারিবদ্ধ হবে।";
  }
  if (willResolve) {
    return level === "cadet" ? "Happens right away." : "Takes effect this hour.";
  }
  return level === "cadet"
    ? "Takes too long — will finish later, not right away."
    : "Will not complete this hour — the remaining work queues into a later day.";
}

export function noChoicePhrase(level: DialLevel, language: Language = "en"): string {
  if (language === "bn") {
    if (level === "cadet") return "কেউ যদি সিদ্ধান্ত না নেয়:";
    if (level === "commander") return "কোনো প্রতিক্রিয়া না বেছে নিলে ডিফল্ট ফলাফল:";
    return "আপনি যদি কিছু না করেন:";
  }
  if (level === "cadet") return "If nobody decides:";
  if (level === "commander") return "Default consequence if no response is chosen:";
  return "If you do nothing:";
}
