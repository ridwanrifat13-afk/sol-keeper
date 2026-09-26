/**
 * The "?" help text on every gauge (M8.7, brief: "A '?' on every gauge explains it at the
 * current depth."). Same three-level-table shape as logText.ts/decisionText.ts/goalText.ts —
 * one short, real explanation of what the gauge measures and why it matters, not a repeat of
 * the number already on screen.
 */
import type { DialLevel, Language } from "../dial/types.js";

type TemplateTable = Record<string, string>;

const SPECIALIST: TemplateTable = {
  "gauge.oxygen": "Cabin oxygen partial pressure. Below about 120 mmHg the crew is short of breath; the sim tracks this hour by hour, not just the total kg stored.",
  "gauge.co2": "Cabin CO₂ partial pressure. Rises as the crew breathes; the scrubber pulls it back down. The limit shown depends on the current rations mode — a harsher mode tolerates less.",
  "gauge.water": "Potable water on hand, shown as days of supply for the living crew at the current recovery rate.",
  "gauge.food": "Stored dry food mass, shown as days of supply at the current ration. Crops add to this when they're harvested.",
  "gauge.battery": "Stored electrical energy. Generation below demand draws this down; sustained zero means load shedding.",
  "gauge.cabin": "Habitat air temperature. Too cold risks hypothermia and frozen water lines; too hot stresses the crew and the equipment bay.",
};

const CADET: TemplateTable = {
  "gauge.oxygen": "The air the crew breathes. If it gets too low, they can't breathe well.",
  "gauge.co2": "The bad air building up. The air cleaner takes it back out.",
  "gauge.water": "How many days of drinking water are left.",
  "gauge.food": "How many days of food are left. Picking crops adds more.",
  "gauge.battery": "How much power is stored up, like a big phone battery for the whole base.",
  "gauge.cabin": "How warm or cold it is inside. Too cold or too hot is bad for everyone.",
};

const COMMANDER: TemplateTable = {
  "gauge.oxygen": "pO₂, cabin. Hypoxic risk below ~120 mmHg (S1.1); tracked continuously, independent of the O₂ mass stored.",
  "gauge.co2": "pCO₂, cabin. Production scales with crew metabolic rate; scrubber uptime and efficiency set the removal side. Limit is mode-dependent (survivalModes' own co2LimitMmHg).",
  "gauge.water": "Potable reserve, expressed as days of supply at current per-crew consumption and recovery-loop efficiency.",
  "gauge.food": "Dry mass reserve, expressed as days of supply at the current ration's kcal/crew-day. Harvests are a real, tracked inflow.",
  "gauge.battery": "State of charge. A sustained generation/demand deficit forces the load-shed priority order (Power console) to shed systems bottom-up.",
  "gauge.cabin": "Habitat air temperature, thermostat-controlled. Drives the hypothermia clock below 15 °C and equipment/crew heat stress at the high end.",
};

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`). */
const SPECIALIST_BN: TemplateTable = {
  "gauge.oxygen":
    "কেবিনের অক্সিজেনের আংশিক চাপ। প্রায় ১২০ mmHg-এর নিচে ক্রুর শ্বাসকষ্ট হয়; সিমুলেশন এটি ঘণ্টায় ঘণ্টায় ট্র্যাক করে, শুধু মোট মজুত কেজি নয়।",
  "gauge.co2":
    "কেবিনের CO₂-এর আংশিক চাপ। ক্রুর শ্বাস-প্রশ্বাসে বাড়ে; স্ক্রাবার এটি আবার কমায়। দেখানো সীমা বর্তমান রেশন মোডের উপর নির্ভর করে — কঠোর মোড কম সহ্য করে।",
  "gauge.water": "হাতে থাকা পানযোগ্য পানি, বর্তমান পুনরুদ্ধার হারে জীবিত ক্রুর জন্য দিনের সরবরাহ হিসেবে দেখানো।",
  "gauge.food": "মজুত শুষ্ক খাবারের ভর, বর্তমান রেশনে দিনের সরবরাহ হিসেবে দেখানো। ফসল সংগ্রহ করলে এতে যোগ হয়।",
  "gauge.battery": "মজুত বৈদ্যুতিক শক্তি। চাহিদার চেয়ে কম উৎপাদন এটি কমায়; স্থায়ীভাবে শূন্য মানে লোড শেডিং।",
  "gauge.cabin": "বাসস্থানের বাতাসের তাপমাত্রা। খুব ঠান্ডা হাইপোথার্মিয়া এবং পানির পাইপ জমে যাওয়ার ঝুঁকি তৈরি করে; খুব গরম ক্রু এবং যন্ত্রপাতির উপর চাপ ফেলে।",
};

const CADET_BN: TemplateTable = {
  "gauge.oxygen": "ক্রু যে বাতাসে শ্বাস নেয়। এটা খুব কমে গেলে তারা ভালোভাবে শ্বাস নিতে পারে না।",
  "gauge.co2": "যে খারাপ বাতাস জমছে। বাতাস পরিষ্কারক এটা বের করে দেয়।",
  "gauge.water": "কতদিনের খাওয়ার পানি বাকি আছে।",
  "gauge.food": "কতদিনের খাবার বাকি আছে। ফসল তোলা হলে আরও যোগ হয়।",
  "gauge.battery": "কত বিদ্যুৎ জমা আছে, পুরো ঘাঁটির জন্য একটা বড় ফোনের ব্যাটারির মতো।",
  "gauge.cabin": "ভেতরটা কতটা গরম বা ঠান্ডা। খুব ঠান্ডা বা খুব গরম দুটোই সবার জন্য খারাপ।",
};

const COMMANDER_BN: TemplateTable = {
  "gauge.oxygen": "pO₂, কেবিন। ~১২০ mmHg-এর নিচে হাইপোক্সিক ঝুঁকি (S1.1); ক্রমাগত ট্র্যাক করা হয়, মজুত O₂ ভর থেকে স্বাধীন।",
  "gauge.co2":
    "pCO₂, কেবিন। উৎপাদন ক্রুর বিপাকীয় হারের সাথে স্কেল করে; স্ক্রাবারের আপটাইম এবং দক্ষতা অপসারণের দিকটি নির্ধারণ করে। সীমা মোড-নির্ভর (survivalModes-এর নিজস্ব co2LimitMmHg)।",
  "gauge.water": "পানযোগ্য মজুত, বর্তমান প্রতি-ক্রু ব্যবহার এবং পুনরুদ্ধার-লুপ দক্ষতায় দিনের সরবরাহ হিসেবে প্রকাশিত।",
  "gauge.food": "শুষ্ক ভরের মজুত, বর্তমান রেশনের kcal/ক্রু-দিনে দিনের সরবরাহ হিসেবে প্রকাশিত। ফসল সংগ্রহ একটি প্রকৃত, ট্র্যাক করা ইনফ্লো।",
  "gauge.battery":
    "চার্জের অবস্থা। একটি স্থায়ী উৎপাদন/চাহিদা ঘাটতি লোড-শেডিং অগ্রাধিকার ক্রমকে (পাওয়ার কনসোল) নিচ থেকে উপরে সিস্টেম বন্ধ করতে বাধ্য করে।",
  "gauge.cabin": "বাসস্থানের বাতাসের তাপমাত্রা, থার্মোস্ট্যাট-নিয়ন্ত্রিত। ১৫ °সে-এর নিচে হাইপোথার্মিয়া ঘড়ি এবং উচ্চ প্রান্তে যন্ত্রপাতি/ক্রু তাপ চাপ চালায়।",
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

export function gaugeHelp(key: string, level: DialLevel, language: Language = "en"): string {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return tables[level][key] ?? TABLES[level][key] ?? SPECIALIST[key] ?? key;
}

export function hasGaugeHelp(key: string, level: DialLevel = "specialist", language: Language = "en"): boolean {
  const tables = language === "bn" ? TABLES_BN : TABLES;
  return key in tables[level];
}

export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts`. */
export { TABLES, TABLES_BN };
