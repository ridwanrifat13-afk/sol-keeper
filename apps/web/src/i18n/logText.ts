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
import type { CommsPriority, Co2ScrubberMode, CropTray, CrewLocation, LogEntry, StationId, SurvivalMode, SystemId } from "@sol-keeper/sim";
import {
  co2ScrubberModeLabel,
  commsPriorityLabel,
  cropLabel,
  locationLabel,
  stationLabel,
  survivalModeLabel,
  systemLabel,
} from "../dial/labels.js";
import type { DialLevel, Language } from "../dial/types.js";
import enTemplates from "./en/logText.json" with { type: "json" };
import bnTemplates from "./bn/logText.json" with { type: "json" };

type TemplateTable = Record<string, string>;

/** Three ages/vocabulary levels — see docs/PHASE2_BRIEF.md's Reality Dial section — kept as
 *  a JSON sibling (en/logText.json) rather than inline object literals. */
const { cadet: CADET, specialist: SPECIALIST, commander: COMMANDER }: Record<DialLevel, TemplateTable> =
  enTemplates;

/** M11: Bangla draft translations (needsReview — see `docs/i18n/bn_review.csv`), kept as a
 *  JSON sibling rather than an inline object literal so `scripts/bn-review-import.ts` can
 *  safely write a native reviewer's corrections straight back into this exact file.
 *  `resolveField`'s own label lookups (`dial/labels.ts`) carry their own Bangla tables and
 *  are picked by the same `language` argument, so an interpolated value is never English
 *  left stranded inside a Bangla sentence (or the reverse). */
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
  if (key === "co2ScrubberMode") {
    const mode = entry.data["co2ScrubberMode"];
    return typeof mode === "string" ? co2ScrubberModeLabel(mode as Co2ScrubberMode, level, language) : "";
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
