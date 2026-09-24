import { describe, expect, it } from "vitest";
import { useOnboarding } from "../src/store/onboarding";
import { COACH_MARK_ORDER, coachMarkText } from "../src/i18n/onboardingText";
import { DIAL_LEVELS } from "../src/dial/types";
import type { StationId } from "@sol-keeper/sim";

describe("store/onboarding", () => {
  it("defaults to not seen, step 0", () => {
    expect(useOnboarding.getState().seen).toBe(false);
    expect(useOnboarding.getState().step).toBe(0);
  });

  it("next() advances the step without marking seen before the last step", () => {
    useOnboarding.setState({ seen: false, step: 0 });
    useOnboarding.getState().next(5);
    expect(useOnboarding.getState().step).toBe(1);
    expect(useOnboarding.getState().seen).toBe(false);
  });

  it("next() on the final step marks the tutorial seen", () => {
    useOnboarding.setState({ seen: false, step: 4 });
    useOnboarding.getState().next(5);
    expect(useOnboarding.getState().seen).toBe(true);
  });

  it("skip() marks the tutorial seen regardless of step", () => {
    useOnboarding.setState({ seen: false, step: 1 });
    useOnboarding.getState().skip();
    expect(useOnboarding.getState().seen).toBe(true);
  });
});

describe("First Light coach-mark order and text", () => {
  it("follows the brief's own tutorial order, not the tab bar's order", () => {
    // The brief's explicit order (Power, Life Support, Incident Command, Comms, Mission
    // Command) intentionally differs from the tab bar's left-to-right order (which has Comms
    // before Incident Command) — see CLAUDE.md's Station section.
    const expected: readonly StationId[] = ["power", "lifeSupport", "incidentCommand", "comms", "missionCommand"];
    expect(COACH_MARK_ORDER).toEqual(expected);
  });

  it("has real, distinct text for every station at every dial level", () => {
    for (const level of DIAL_LEVELS) {
      const lines = COACH_MARK_ORDER.map((station) => coachMarkText(station, level));
      expect(new Set(lines).size).toBe(COACH_MARK_ORDER.length);
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });
});
