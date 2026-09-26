/**
 * M10.3: a real bug the M10 planning pass found and reproduced (Jezero seed 7, prudentBot):
 * `apps/web`'s `store/run.ts` builds a fresh `EventLogger` per player action (`resolveIncident`,
 * not per tick), so an hour whose tick already wrote entries via its own logger gets a second
 * logger instance later the same hour. `EventLogger.seq` used to restart at 0 for every new
 * instance regardless of what that hour already held, producing a genuine duplicate `EventId`
 * (`"4:0"` twice) — which silently corrupts `rootCauses`/`causalCascade` (both key a `Map` by
 * `id`) and any UI keyed on `entry.id` (React's own `key` prop, e.g. `DebriefView.tsx`).
 */
import { describe, expect, it } from "vitest";
import { EventLogger } from "../engine/log.js";
import type { LogEntry } from "../types.js";

describe("EventLogger — starting seq for a repeated hour", () => {
  it("a second logger for an hour the first already wrote to does not repeat an EventId", () => {
    const entries: LogEntry[] = [];

    const tick = new EventLogger(entries, 4);
    tick.log({ kind: "resource", severity: "info", code: "a" });
    tick.log({ kind: "resource", severity: "info", code: "b" });
    tick.log({ kind: "resource", severity: "info", code: "c" });
    tick.log({ kind: "resource", severity: "info", code: "d" });

    // The player-decision path: a second, independent logger instance for the same hour.
    const decision = new EventLogger(entries, 4);
    decision.log({ kind: "decision", severity: "info", code: "incident.test.resolved" });

    const ids = entries.map((e) => e.id);
    expect(ids).toEqual(["4:0", "4:1", "4:2", "4:3", "4:4"]);
    expect(new Set(ids).size).toBe(ids.length); // no duplicate id, the bug's own symptom
  });

  it("a logger for a genuinely new hour still starts at 0 (unchanged behaviour)", () => {
    const entries: LogEntry[] = [];
    new EventLogger(entries, 4).log({ kind: "resource", severity: "info", code: "a" });
    new EventLogger(entries, 5).log({ kind: "resource", severity: "info", code: "b" });

    expect(entries.map((e) => e.id)).toEqual(["4:0", "5:0"]);
  });

  it("a third logger for the same hour continues from the highest seq used, not the count", () => {
    const entries: LogEntry[] = [];
    new EventLogger(entries, 4).log({ kind: "resource", severity: "info", code: "a" });
    new EventLogger(entries, 4).log({ kind: "resource", severity: "info", code: "b" });
    new EventLogger(entries, 4).log({ kind: "resource", severity: "info", code: "c" });

    expect(entries.map((e) => e.id)).toEqual(["4:0", "4:1", "4:2"]);
  });
});
