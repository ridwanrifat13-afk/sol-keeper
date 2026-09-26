/**
 * Mission goal text, at a chosen Reality Dial level (M8.4 Part E — the first place any
 * `MissionGoal.briefKey` is actually rendered). Same discipline as logText.ts/decisionText.ts:
 * the simulation never stores prose (brief rule 4) — only the stable `briefKey` each
 * scenario's own `primaryGoal`/`stretchGoal` already declares (packages/sim/src/data/
 * scenarios/*.ts). Whether a goal is currently met is never described in this text — that
 * comes from `checkGoal` (packages/sim), called live by whatever renders this.
 */
import type { DialLevel, Language } from "../dial/types.js";
import enTemplates from "./en/goalText.json" with { type: "json" };
import bnTemplates from "./bn/goalText.json" with { type: "json" };

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
