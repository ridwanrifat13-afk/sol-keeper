/**
 * M10.6: `share/bootRunLink.ts`'s own three modes (none/config-only/config+fragment) plus
 * version-mismatch/invalid, and that each one hydrates (or deliberately leaves untouched)
 * `useRun`'s store exactly as `App.tsx`'s boot-time effect depends on.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { replayRun, type RecordedInput } from "@sol-keeper/sim";
import { applyRunLinkFromLocation } from "../src/share/bootRunLink.js";
import { encodeRunLinkFragment, encodeRunLinkQuery, type RunLinkConfig } from "../src/share/runLink.js";
import { useRun } from "../src/store/run.js";

const CONFIG: RunLinkConfig = {
  scenarioId: "jezero-outpost",
  difficulty: "nominal",
  crewSize: 4,
  landingSiteId: "MARS-JEZERO",
  powerArchitecture: "solarBattery",
  shieldingApproach: "hullOnly",
  seed: 42,
};

beforeEach(() => {
  useRun.getState().reset();
});

describe("M10.6: applyRunLinkFromLocation", () => {
  it("\"none\": no run-link params leaves the store untouched", () => {
    const before = useRun.getState();
    const result = applyRunLinkFromLocation({ search: "", hash: "" });
    expect(result).toEqual({ kind: "none" });
    expect(useRun.getState().params).toEqual(before.params);
    expect(useRun.getState().state).toEqual(before.state);
  });

  it("versionMismatch leaves the store untouched", () => {
    const before = useRun.getState();
    const query = encodeRunLinkQuery(CONFIG).replace(/v=\d+/, "v=999");
    const result = applyRunLinkFromLocation({ search: query, hash: "" });
    expect(result).toEqual({ kind: "versionMismatch", foundVersion: 999 });
    expect(useRun.getState().params).toEqual(before.params);
    expect(useRun.getState().state).toEqual(before.state);
  });

  it("an invalid config leaves the store untouched", () => {
    const before = useRun.getState();
    const query = encodeRunLinkQuery(CONFIG).replace("sc=jezero-outpost", "sc=bogus");
    const result = applyRunLinkFromLocation({ search: query, hash: "" });
    expect(result.kind).toBe("invalid");
    expect(useRun.getState().params).toEqual(before.params);
    expect(useRun.getState().state).toEqual(before.state);
  });

  it("a valid config with an invalid fragment reports invalid and leaves the store untouched — never a silent config-only fallback", () => {
    const before = useRun.getState();
    const query = encodeRunLinkQuery(CONFIG);
    const result = applyRunLinkFromLocation({ search: query, hash: "i=not!valid!!" });
    expect(result.kind).toBe("invalid");
    expect(useRun.getState().params).toEqual(before.params);
    expect(useRun.getState().state).toEqual(before.state);
  });

  it("config-only hydrates a fresh hour-0 run with the decoded config and setup choices", () => {
    const query = encodeRunLinkQuery(CONFIG);
    const result = applyRunLinkFromLocation({ search: query, hash: "" });
    expect(result).toEqual({ kind: "configOnly" });

    const store = useRun.getState();
    expect(store.params).toEqual({
      scenarioId: "jezero-outpost",
      seed: 42,
      crewSize: 4,
      missionStartIso: "2033-03-01",
      difficulty: "nominal",
    });
    expect(store.setupChoices).toEqual({
      landingSiteId: "MARS-JEZERO",
      powerArchitecture: "solarBattery",
      shieldingApproach: "hullOnly",
    });
    expect(store.state.hour).toBe(0);
    expect(store.inputLog).toEqual([]);
  });

  it("config+fragment hydrates the exact final state replayRun itself produces", () => {
    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "commsPriority", priority: "personal" } },
      { hour: 12, input: { kind: "rations", mode: "mode1" } },
    ];
    const throughHour = 48;
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment(inputLog, throughHour);

    const result = applyRunLinkFromLocation({ search: query, hash: `#i=${fragment}` });
    expect(result).toEqual({ kind: "fullReplay" });

    const store = useRun.getState();
    expect(store.inputLog).toEqual(inputLog);
    expect(store.state).toEqual(replayRun(store.params, store.scenario, inputLog, throughHour));
    expect(store.state.hour).toBe(throughHour);
    expect(store.state.comms.priority).toBe("personal");
    expect(store.state.food.mode).toBe("mode1");
  });
});
