/**
 * M10.6: `share/bootRunLink.ts`'s own three modes (none/config-only/config+fragment) plus
 * version-mismatch/invalid, and that each one hydrates (or deliberately leaves untouched)
 * `useRun`'s store exactly as `App.tsx`'s boot-time effect depends on.
 *
 * M10.9 changed what "config+fragment" actually does: instead of jumping straight to the
 * final state, it resets to hour 0 and starts `store/replay.ts`'s `useReplay` ticking through
 * the recorded decisions. The test below drives that replay to completion by hand (no real
 * timer) and checks the result against `replayRun` computed independently — the same
 * done-when claim ("two browsers opening the same link produce byte-identical final states")
 * proven directly against the mechanism a real replay actually uses.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { replayRun, type RecordedInput } from "@sol-keeper/sim";
import { applyRunLinkFromLocation } from "../src/share/bootRunLink.js";
import { encodeRunLinkFragment, encodeRunLinkQuery, type RunLinkConfig } from "../src/share/runLink.js";
import { useRun } from "../src/store/run.js";
import { useReplay } from "../src/store/replay.js";

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
  useReplay.getState().stop();
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

  it("config+fragment resets to hour 0 and starts a replay, rather than jumping to the end", () => {
    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "commsPriority", priority: "personal" } },
      { hour: 12, input: { kind: "rations", mode: "mode1" } },
    ];
    const throughHour = 48;
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment(inputLog, throughHour);

    const result = applyRunLinkFromLocation({ search: query, hash: `#i=${fragment}` });
    expect(result).toEqual({ kind: "replaying" });

    const store = useRun.getState();
    // Hour 0 is where the replay starts, not the end it's replaying toward — the hour-0
    // input (commsPriority) is already applied (a pre-play Sol Planning choice), the
    // hour-12 one (rations) is not yet.
    expect(store.state.hour).toBe(0);
    expect(store.state.comms.priority).toBe("personal");
    expect(store.state.food.mode).toBe("nominal");
    expect(useReplay.getState().active).toBe(true);
    expect(useReplay.getState().throughHour).toBe(throughHour);
  });

  it("done-when: driving that replay to completion matches replayRun computed independently — the same claim two separate browsers opening the identical link would each have to satisfy", () => {
    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "commsPriority", priority: "personal" } },
      { hour: 12, input: { kind: "rations", mode: "mode1" } },
    ];
    const throughHour = 48;
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment(inputLog, throughHour);

    // "Browser A": opens the link and watches the replay play out, one tick at a time (no
    // real timer — the interval in ReplayControls.tsx is a presentation concern only).
    applyRunLinkFromLocation({ search: query, hash: `#i=${fragment}` });
    let guard = 0;
    while (useReplay.getState().active && guard++ < throughHour + 10) {
      useReplay.getState().tickOnce();
    }
    expect(useReplay.getState().active).toBe(false);

    const replayedByWatching = useRun.getState();

    // "Browser B": decodes the exact same link and reconstructs the run directly, with no UI
    // or animation involved at all — packages/sim's own replayRun (M10.4).
    const replayedDirectly = replayRun(replayedByWatching.params, replayedByWatching.scenario, inputLog, throughHour);

    expect(replayedByWatching.state).toEqual(replayedDirectly);
    expect(replayedByWatching.state.hour).toBe(throughHour);
    expect(replayedByWatching.state.comms.priority).toBe("personal");
    expect(replayedByWatching.state.food.mode).toBe("mode1");
  });
});
