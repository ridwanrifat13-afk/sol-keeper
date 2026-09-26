/**
 * The "?" help text on every gauge (M8.7, brief: "A '?' on every gauge explains it at the
 * current depth."). Same three-level-table shape as logText.ts/decisionText.ts/goalText.ts —
 * one short, real explanation of what the gauge measures and why it matters, not a repeat of
 * the number already on screen.
 */
import type { DialLevel, Language } from "../dial/types.js";
import enTemplates from "./en/gaugeHelp.json" with { type: "json" };
import bnTemplates from "./bn/gaugeHelp.json" with { type: "json" };

type TemplateTable = Record<string, string>;

const { cadet: CADET, specialist: SPECIALIST, commander: COMMANDER }: Record<DialLevel, TemplateTable> = enTemplates;

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`), kept as a
 *  JSON sibling rather than an inline object literal so `scripts/bn-review-import.ts` can
 *  safely write a native reviewer's corrections straight back into this exact file. */
const { cadet: CADET_BN, specialist: SPECIALIST_BN, commander: COMMANDER_BN }: Record<DialLevel, TemplateTable> =
  bnTemplates;

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
