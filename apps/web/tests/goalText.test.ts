/**
 * Same discipline as decisionText.test.ts: derives the expected key list from the sim's own
 * scenario data rather than a hand-copied list, so a new/changed scenario goal fails this
 * immediately rather than silently rendering its own machine key to a player.
 */
import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@sol-keeper/sim";
import { goalText, hasGoalTemplate } from "../src/i18n/goalText";
import { DIAL_LEVELS } from "../src/dial/types";

function allDeclaredKeys(): string[] {
  const keys: string[] = [];
  for (const scenario of Object.values(SCENARIOS)) {
    keys.push(scenario.primaryGoal.briefKey, scenario.stretchGoal.briefKey);
  }
  return keys;
}

describe("Mission goal text", () => {
  it("covers every scenario's primaryGoal/stretchGoal briefKey, at all three levels", () => {
    const keys = allDeclaredKeys();
    expect(keys.length).toBeGreaterThan(0);

    for (const level of DIAL_LEVELS) {
      const missing = keys.filter((key) => !hasGoalTemplate(key, level));
      expect(missing, `${level} is missing templates for: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("never falls back to the raw key for a declared key, at any level", () => {
    for (const key of allDeclaredKeys()) {
      for (const level of DIAL_LEVELS) {
        expect(goalText(key, level), `${level}/${key} rendered as its own raw key`).not.toBe(key);
      }
    }
  });

  it("an unknown key falls back to itself rather than throwing", () => {
    expect(goalText("totally.unknown.key", "specialist")).toBe("totally.unknown.key");
  });
});
