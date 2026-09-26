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
import enTemplates from "./en/onboardingText.json" with { type: "json" };
import bnTemplates from "./bn/onboardingText.json" with { type: "json" };

export const COACH_MARK_ORDER: readonly StationId[] = [
  "power",
  "lifeSupport",
  "incidentCommand",
  "comms",
  "missionCommand",
];

type TemplateTable = Record<StationId, string>;

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

export function coachMarkText(station: StationId, level: DialLevel, language: Language = "en"): string {
  return language === "bn" ? TABLES_BN[level][station] : TABLES[level][station];
}

export { CADET_BN, COMMANDER_BN, SPECIALIST_BN };
/** For `validation/i18nCompleteness.test.ts`. */
export { TABLES, TABLES_BN };
