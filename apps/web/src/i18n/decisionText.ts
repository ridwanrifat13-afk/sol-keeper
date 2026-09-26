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
import enTemplates from "./en/decisionText.json" with { type: "json" };
import bnTemplates from "./bn/decisionText.json" with { type: "json" };

type TemplateTable = Record<string, string>;

const { cadet: CADET, specialist: SPECIALIST, commander: COMMANDER }: Record<DialLevel, TemplateTable> =
  enTemplates;

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
