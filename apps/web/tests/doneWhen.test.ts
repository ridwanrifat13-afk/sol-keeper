/**
 * M10.9: the brief's own done-when bar, tested literally: "two browsers opening the same
 * link produce byte-identical final states." Two entirely independent decode-and-replay
 * calls from the identical URL string stand in for two real browsers — no shared object, no
 * shared store, between the two calls in each test. `decodeRunLinkQuery`, `decodeRunLinkFragment`,
 * and `replayRun` are all pure functions (packages/sim's own brief rule 2, and `share/
 * runLink.ts`'s own design), so this is not a simulation of the claim, it is the claim,
 * exercised exactly the way a second person's browser would exercise it from nothing but the
 * URL string.
 *
 * `apps/web/tests/bootRunLink.test.ts`'s own "done-when" test complements this one: it proves
 * the *actual shipped mechanism* (`applyRunLinkFromLocation` → `useReplay`'s animated,
 * real-time playback) agrees with the pure `replayRun` computation this file uses directly.
 * Together they fully discharge the claim: the mechanism is correct, and the mechanism is
 * what two independent browsers would each run.
 */
import { describe, expect, it } from "vitest";
import { INCIDENT_CATALOG, replayRun, runFingerprint, type RecordedInput } from "@sol-keeper/sim";
import {
  decodeRunLinkFragment,
  decodeRunLinkQuery,
  encodeRunLinkFragment,
  encodeRunLinkQuery,
  type RunLinkConfig,
} from "../src/share/runLink.js";

const CONFIG: RunLinkConfig = {
  scenarioId: "jezero-outpost",
  difficulty: "nominal",
  crewSize: 4,
  landingSiteId: "MARS-JEZERO",
  powerArchitecture: "solarBattery",
  shieldingApproach: "hullOnly",
  seed: 5,
};

/** Everything a real browser does with a shared link, starting from nothing but the URL
 *  string — no object here is ever shared with another call to this same function. */
function openLinkInABrowser(query: string, hash: string): { readonly state: unknown; readonly fingerprint: string } {
  const decodedConfig = decodeRunLinkQuery(query);
  if (decodedConfig.kind !== "config") throw new Error(`expected a valid config, got "${decodedConfig.kind}"`);
  const decodedFragment = decodeRunLinkFragment(hash);
  if (decodedFragment.kind !== "log") throw new Error(`expected a decoded input log, got "${decodedFragment.kind}"`);

  const state = replayRun(
    decodedConfig.params,
    decodedConfig.scenario,
    decodedFragment.inputLog,
    decodedFragment.throughHour,
  );
  return { state, fingerprint: runFingerprint(state) };
}

describe("M10.9 done-when: two browsers opening the same link produce byte-identical final states", () => {
  it("a class-mission-style link with no decisions at all", () => {
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment([], 200);

    const browserA = openLinkInABrowser(query, `i=${fragment}`);
    const browserB = openLinkInABrowser(query, `i=${fragment}`);

    expect(browserA.state).toEqual(browserB.state);
    expect(browserA.fingerprint).toBe(browserB.fingerprint);
  });

  it("a link recording all five non-incident decision kinds", () => {
    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "commsPriority", priority: "personal" } },
      { hour: 0, input: { kind: "crewLocation", crewId: "crew-2", location: "stormShelter" } },
      { hour: 0, input: { kind: "station", crewId: "crew-1", station: "comms" } },
      { hour: 0, input: { kind: "priority", systemId: "comms", direction: -1 } },
      { hour: 24, input: { kind: "rations", mode: "mode1" } },
      { hour: 48, input: { kind: "crewLocation", crewId: "crew-2", location: "habitat" } },
    ];
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment(inputLog, 72);

    const browserA = openLinkInABrowser(query, `i=${fragment}`);
    const browserB = openLinkInABrowser(query, `i=${fragment}`);

    expect(browserA.state).toEqual(browserB.state);
    expect(browserA.fingerprint).toBe(browserB.fingerprint);
  });

  it("a link recording a real incidentResponse decision (the one kind that draws from RNG streams beyond the tick itself)", () => {
    // Seed 7 on jezero-outpost/nominal triggers "depress-mir97" at hour 4 (checked
    // empirically — the same fact packages/sim's own validation/replay.test.ts pins).
    const config: RunLinkConfig = { ...CONFIG, seed: 7 };
    const def = INCIDENT_CATALOG.find((d) => d.id === "depress-mir97");
    expect(def).toBeDefined();
    const responseId = def?.responses.find((r) => r.id === "sealModule")?.id;
    expect(responseId).toBeDefined();
    if (def === undefined || responseId === undefined) return;

    const inputLog: RecordedInput[] = [
      { hour: 6, input: { kind: "incidentResponse", incidentId: `${def.id}-4`, responseId } },
    ];
    const query = encodeRunLinkQuery(config);
    const fragment = encodeRunLinkFragment(inputLog, 100);

    const browserA = openLinkInABrowser(query, `i=${fragment}`);
    const browserB = openLinkInABrowser(query, `i=${fragment}`);

    expect(browserA.state).toEqual(browserB.state);
    expect(browserA.fingerprint).toBe(browserB.fingerprint);
    // Not a no-op: the response really did get recorded and resolved identically both times.
    expect((browserA.state as { log: { code: string }[] }).log.some((e) => e.code === `incident.${def.id}.resolved`)).toBe(
      true,
    );
  });

  it("a full mission replayed all the way to a real ending", () => {
    // Seed 5 with no decisions ends in "loss" at hour 375 (checked empirically, same fact
    // this milestone's own manual browser verification used).
    const query = encodeRunLinkQuery(CONFIG);
    const fragment = encodeRunLinkFragment([], 740);

    const browserA = openLinkInABrowser(query, `i=${fragment}`);
    const browserB = openLinkInABrowser(query, `i=${fragment}`);

    expect(browserA.state).toEqual(browserB.state);
    expect(browserA.fingerprint).toBe(browserB.fingerprint);
    expect((browserA.state as { status: string }).status).toBe("loss");
  });
});
