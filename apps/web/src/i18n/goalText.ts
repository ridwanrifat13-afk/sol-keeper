/**
 * Mission goal text, at a chosen Reality Dial level (M8.4 Part E — the first place any
 * `MissionGoal.briefKey` is actually rendered). Same discipline as logText.ts/decisionText.ts:
 * the simulation never stores prose (brief rule 4) — only the stable `briefKey` each
 * scenario's own `primaryGoal`/`stretchGoal` already declares (packages/sim/src/data/
 * scenarios/*.ts). Whether a goal is currently met is never described in this text — that
 * comes from `checkGoal` (packages/sim), called live by whatever renders this.
 */
import type { DialLevel, Language } from "../dial/types.js";

type TemplateTable = Record<string, string>;

const SPECIALIST: TemplateTable = {
  "scenario.jezero.goal.primary":
    "Meet the science target, keep every system running, and bring the whole crew home.",
  "scenario.jezero.goal.stretch": "Harvest every crop tray before the mission ends.",
  "scenario.firstLight.goal.primary": "Survive the full night-day-night cycle with the whole crew alive.",
  "scenario.firstLight.goal.stretch": "End the mission with no system left failed.",
  "scenario.theLongNight.goal.primary": "Survive all three lunar nights with the whole crew alive.",
  "scenario.theLongNight.goal.stretch": "End the mission with no system left failed.",
};

const CADET: TemplateTable = {
  "scenario.jezero.goal.primary": "Do enough science, keep everything working, and get everyone home safe.",
  "scenario.jezero.goal.stretch": "Pick every plant tray before you're done.",
  "scenario.firstLight.goal.primary": "Keep everyone alive through the whole mission.",
  "scenario.firstLight.goal.stretch": "Don't let anything stay broken.",
  "scenario.theLongNight.goal.primary": "Keep everyone alive through all three long nights.",
  "scenario.theLongNight.goal.stretch": "Don't let anything stay broken.",
};

const COMMANDER: TemplateTable = {
  "scenario.jezero.goal.primary":
    "science.points >= scenarioTargetPoints, every system operational, full crew survival (engine/goals.ts's missionGoalsMet).",
  "scenario.jezero.goal.stretch": "All crop trays harvested at least once (harvestAllCropTrays).",
  "scenario.firstLight.goal.primary": "Full mission duration elapsed, zero crew loss (surviveFullDurationNoLoss).",
  "scenario.firstLight.goal.stretch": "No system in a failed state at mission end (noSystemLeftFailed).",
  "scenario.theLongNight.goal.primary": "Full mission duration elapsed, zero crew loss (surviveFullDurationNoLoss).",
  "scenario.theLongNight.goal.stretch": "No system in a failed state at mission end (noSystemLeftFailed).",
};

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`). */
const SPECIALIST_BN: TemplateTable = {
  "scenario.jezero.goal.primary": "বিজ্ঞান লক্ষ্য পূরণ করুন, প্রতিটি সিস্টেম চালু রাখুন, এবং পুরো ক্রুকে বাড়ি ফিরিয়ে আনুন।",
  "scenario.jezero.goal.stretch": "মিশন শেষ হওয়ার আগে প্রতিটি ফসলের ট্রে সংগ্রহ করুন।",
  "scenario.firstLight.goal.primary": "পুরো ক্রু জীবিত রেখে সম্পূর্ণ রাত-দিন-রাত চক্র টিকে থাকুন।",
  "scenario.firstLight.goal.stretch": "কোনো সিস্টেম বিকল না রেখে মিশন শেষ করুন।",
  "scenario.theLongNight.goal.primary": "পুরো ক্রু জীবিত রেখে তিনটি চন্দ্র-রাতই টিকে থাকুন।",
  "scenario.theLongNight.goal.stretch": "কোনো সিস্টেম বিকল না রেখে মিশন শেষ করুন।",
};

const CADET_BN: TemplateTable = {
  "scenario.jezero.goal.primary": "পর্যাপ্ত বিজ্ঞান করুন, সব কিছু কাজ করা অবস্থায় রাখুন, এবং সবাইকে নিরাপদে বাড়ি আনুন।",
  "scenario.jezero.goal.stretch": "শেষ হওয়ার আগে প্রতিটি গাছের ট্রে তুলুন।",
  "scenario.firstLight.goal.primary": "পুরো মিশন জুড়ে সবাইকে বাঁচিয়ে রাখুন।",
  "scenario.firstLight.goal.stretch": "কোনো কিছু ভাঙা রাখবেন না।",
  "scenario.theLongNight.goal.primary": "তিনটি লম্বা রাত জুড়ে সবাইকে বাঁচিয়ে রাখুন।",
  "scenario.theLongNight.goal.stretch": "কোনো কিছু ভাঙা রাখবেন না।",
};

const COMMANDER_BN: TemplateTable = {
  "scenario.jezero.goal.primary":
    "science.points >= scenarioTargetPoints, প্রতিটি সিস্টেম কার্যক্ষম, সম্পূর্ণ ক্রু বেঁচে থাকা (engine/goals.ts-এর missionGoalsMet)।",
  "scenario.jezero.goal.stretch": "সব ফসলের ট্রে অন্তত একবার সংগ্রহ করা হয়েছে (harvestAllCropTrays)।",
  "scenario.firstLight.goal.primary": "সম্পূর্ণ মিশন সময়কাল অতিক্রান্ত, শূন্য ক্রু ক্ষতি (surviveFullDurationNoLoss)।",
  "scenario.firstLight.goal.stretch": "মিশন শেষে কোনো সিস্টেম বিকল অবস্থায় নেই (noSystemLeftFailed)।",
  "scenario.theLongNight.goal.primary": "সম্পূর্ণ মিশন সময়কাল অতিক্রান্ত, শূন্য ক্রু ক্ষতি (surviveFullDurationNoLoss)।",
  "scenario.theLongNight.goal.stretch": "মিশন শেষে কোনো সিস্টেম বিকল অবস্থায় নেই (noSystemLeftFailed)।",
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

export function goalText(briefKey: string, level: DialLevel, language: Language = "en"): string {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return tables[level][briefKey] ?? TABLES[level][briefKey] ?? SPECIALIST[briefKey] ?? briefKey;
}

export function hasGoalTemplate(briefKey: string, level: DialLevel = "specialist", language: Language = "en"): boolean {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return briefKey in tables[level];
}

export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts`. */
export { TABLES, TABLES_BN };
