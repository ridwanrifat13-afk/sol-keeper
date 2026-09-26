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
import type { DialLevel, Language } from "../dial/types.js";

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

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`). */
const SPECIALIST_BN: TemplateTable = {
  power: "পাওয়ার: উৎপাদন, ব্যাটারি, এবং চাহিদা সরবরাহের চেয়ে বেশি হলে কোন সিস্টেম আগে বন্ধ হবে।",
  lifeSupport: "লাইফ সাপোর্ট: অক্সিজেন, CO₂, পানি, খাবার, এবং কেবিনের তাপমাত্রা — ক্রুর টিকে থাকার সীমা।",
  incidentCommand: "ইনসিডেন্ট কমান্ড: দুর্ঘটনা শনাক্ত হওয়ার সাথে সাথে যেখানে আপনি সমাধান করেন, এবং ক্রুর আশ্রয়/ইভিএ অবস্থা ঠিক করেন।",
  comms: "কমস: পৃথিবীর সাথে সংযোগ, আলোক-সময় বিলম্ব, এবং ব্ল্যাকআউটের সময় কোনটি ডাউনলিংক অগ্রাধিকার পাবে।",
  missionCommand: "মিশন কমান্ড: ক্রুর স্টেশন নিয়োগ, দৈনিক পরিকল্পনা, এবং মিশনের লক্ষ্যের দিকে অগ্রগতি।",
};

const CADET_BN: TemplateTable = {
  power: "পাওয়ার: বাতি জ্বালিয়ে রাখে আর ঘাঁটি চালু রাখে।",
  lifeSupport: "লাইফ সাপোর্ট: ক্রুকে শ্বাস নিতে, খেতে এবং গরম থাকতে সাহায্য করে।",
  incidentCommand: "ইনসিডেন্ট কমান্ড: সমস্যা হলে এখানেই আপনি সেটা ঠিক করেন।",
  comms: "কমস: পৃথিবীর সাথে কথা বলা, দেরি হলেও।",
  missionCommand: "মিশন কমান্ড: কে কী করছে, আর মিশন কেমন চলছে।",
};

const COMMANDER_BN: TemplateTable = {
  power: "পাওয়ার: উৎপাদন/চাহিদার ভারসাম্য, ব্যাটারির চার্জ অবস্থা, এবং লোড-শেডিং অগ্রাধিকার ক্রম।",
  lifeSupport: "লাইফ সাপোর্ট: pO₂/pCO₂, পানযোগ্য পানি ও খাবারের মজুত, এবং বাসস্থানের তাপ নিয়ন্ত্রণ।",
  incidentCommand: "ইনসিডেন্ট কমান্ড: শনাক্ত হওয়া দুর্ঘটনার জন্য প্রতিক্রিয়া সারি; প্রতি ক্রুর বাসস্থান/আশ্রয়/ইভিএ অবস্থা।",
  comms: "কমস: আলোক-সময় বিলম্ব এবং ডাউনলিংক অগ্রাধিকার ক্রম, শুধুমাত্র ব্ল্যাকআউট উইন্ডোর সময় প্রযোজ্য।",
  missionCommand: "মিশন কমান্ড: স্টেশন কভারেজ ও নিয়োগ, সোলের সারসংক্ষেপ পরিকল্পনা, এবং স্কোর করা লক্ষ্য অগ্রগতি।",
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

export function coachMarkText(station: StationId, level: DialLevel, language: Language = "en"): string {
  return language === "bn" ? TABLES_BN[level][station] : TABLES[level][station];
}

export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts`. */
export { TABLES, TABLES_BN };
