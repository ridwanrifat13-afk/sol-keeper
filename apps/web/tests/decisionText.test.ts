/**
 * Same discipline as logText.test.ts: mechanically checks the three Decision Card tables
 * rather than trusting a hand-written list to stay in sync with the sim's own incident
 * catalog.
 */
import { describe, expect, it } from "vitest";
import { INCIDENT_CATALOG } from "@sol-keeper/sim";
import { decisionText, hasDecisionTemplate } from "../src/i18n/decisionText";
import { DIAL_LEVELS } from "../src/dial/types";

/** Every `briefKey`/`i18nKey` the sim's own incident catalog actually declares — derived, not
 *  hand-copied, so a new incident or response in packages/sim fails this test immediately
 *  rather than silently rendering its own machine key to a player. */
function allDeclaredKeys(): string[] {
  const keys: string[] = [];
  for (const def of INCIDENT_CATALOG) {
    keys.push(def.briefKey);
    for (const response of def.responses) {
      keys.push(response.i18nKey);
    }
  }
  return keys;
}

describe("Decision Card text", () => {
  it("covers every briefKey/i18nKey the incident catalog declares, at all three levels", () => {
    const keys = allDeclaredKeys();
    expect(keys.length).toBeGreaterThan(0);

    for (const level of DIAL_LEVELS) {
      const missing = keys.filter((key) => !hasDecisionTemplate(key, level));
      expect(missing, `${level} is missing templates for: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("never falls back to the raw key for a declared key, at any level", () => {
    for (const key of allDeclaredKeys()) {
      for (const level of DIAL_LEVELS) {
        expect(decisionText(key, level), `${level}/${key} rendered as its own raw key`).not.toBe(key);
      }
    }
  });

  it("substitutes {analogue} rather than leaving the placeholder literal", () => {
    // The commander-tier brief templates are the ones that actually use {analogue} — the
    // cadet/specialist tiers work the historical event into their own prose instead.
    const def = INCIDENT_CATALOG.find((d) => d.id === "fire-mir97")!;
    const text = decisionText(def.briefKey, "commander", def.analogue);
    expect(text).toContain(def.analogue);
    expect(text).not.toContain("{analogue}");
  });

  it("an unknown key falls back to itself rather than throwing", () => {
    expect(decisionText("totally.unknown.key", "specialist")).toBe("totally.unknown.key");
  });
});
