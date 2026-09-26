/**
 * M11 brief item: "i18n completeness test: no missing keys in en or bn." Two independent
 * things can go missing, checked separately:
 *   - `locales/en.json`/`bn.json` (i18next namespaces): every leaf key present in one must be
 *     present in the other.
 *   - The five DRAFT/needsReview Bangla template tables (logText, decisionText,
 *     onboardingText, goalText, gaugeHelp — see `docs/i18n/bn_review.csv`): each must cover
 *     exactly the same keys as its English counterpart at every Reality Dial level, so a typo'd
 *     Bangla key never silently falls back to English without anyone noticing.
 */
import { describe, expect, it } from "vitest";
import en from "../src/i18n/locales/en.json" with { type: "json" };
import bn from "../src/i18n/locales/bn.json" with { type: "json" };
import { TABLES as LOG_TABLES, TABLES_BN as LOG_TABLES_BN } from "../src/i18n/logText.js";
import { TABLES as DECISION_TABLES, TABLES_BN as DECISION_TABLES_BN } from "../src/i18n/decisionText.js";
import { TABLES as ONBOARDING_TABLES, TABLES_BN as ONBOARDING_TABLES_BN } from "../src/i18n/onboardingText.js";
import { TABLES as GOAL_TABLES, TABLES_BN as GOAL_TABLES_BN } from "../src/i18n/goalText.js";
import { TABLES as GAUGE_TABLES, TABLES_BN as GAUGE_TABLES_BN } from "../src/i18n/gaugeHelp.js";
import { DIAL_LEVELS, type DialLevel } from "../src/dial/types.js";

type TemplateTable = Record<string, string>;
type LevelTables = Record<DialLevel, TemplateTable>;

/** Recursively flattens a nested JSON translation tree into dotted leaf-key paths. */
function leafKeys(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (node === null || typeof node !== "object") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix === "" ? key : `${prefix}.${key}`),
  );
}

describe("M11: i18n completeness (no missing keys in en or bn)", () => {
  it("locales/en.json and locales/bn.json declare exactly the same leaf keys", () => {
    const enKeys = new Set(leafKeys(en));
    const bnKeys = new Set(leafKeys(bn));

    const missingInBn = [...enKeys].filter((k) => !bnKeys.has(k)).sort();
    const missingInEn = [...bnKeys].filter((k) => !enKeys.has(k)).sort();

    expect(missingInBn, "keys present in en.json but missing from bn.json").toEqual([]);
    expect(missingInEn, "keys present in bn.json but missing from en.json").toEqual([]);
  });

  const tablePairs: Array<[string, LevelTables, LevelTables]> = [
    ["logText", LOG_TABLES, LOG_TABLES_BN],
    ["decisionText", DECISION_TABLES, DECISION_TABLES_BN],
    ["onboardingText", ONBOARDING_TABLES, ONBOARDING_TABLES_BN],
    ["goalText", GOAL_TABLES, GOAL_TABLES_BN],
    ["gaugeHelp", GAUGE_TABLES, GAUGE_TABLES_BN],
  ];

  for (const [name, en_, bn_] of tablePairs) {
    it(`${name}: every Bangla DRAFT table covers exactly the same keys as its English table`, () => {
      for (const level of DIAL_LEVELS) {
        const enKeys = Object.keys(en_[level]).sort();
        const bnKeys = Object.keys(bn_[level]).sort();
        const missingInBn = enKeys.filter((k) => !bnKeys.includes(k));
        const extraInBn = bnKeys.filter((k) => !enKeys.includes(k));
        expect(missingInBn, `${name}.${level}: missing in Bangla table`).toEqual([]);
        expect(extraInBn, `${name}.${level}: extra keys in Bangla table not in English`).toEqual([]);
      }
    });
  }
});
