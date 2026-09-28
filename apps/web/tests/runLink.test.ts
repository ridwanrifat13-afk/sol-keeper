/**
 * M10.5: `share/runLink.ts`'s own encode/decode round-trips, whitelist/range validation,
 * legacy-difficulty mapping, versionMismatch/invalid results, and a frozen-literal regression
 * test — the last one guards against a future refactor silently changing the wire format and
 * breaking every run link a class or a student has already shared, without anyone noticing
 * until a "made with an older version" banner starts showing up on links that should work.
 */
import { describe, expect, it } from "vitest";
import { INCIDENT_CATALOG, SIM_VERSION, type RecordedInput } from "@sol-keeper/sim";
import {
  buildRunLinkUrl,
  decodeRunLinkFragment,
  decodeRunLinkQuery,
  encodeRunLinkFragment,
  encodeRunLinkQuery,
  MAX_SEED,
  type RunLinkConfig,
} from "../src/share/runLink.js";

const JEZERO_CONFIG: RunLinkConfig = {
  scenarioId: "jezero-outpost",
  difficulty: "nominal",
  crewSize: 4,
  landingSiteId: "MARS-JEZERO",
  powerArchitecture: "solarBattery",
  shieldingApproach: "hullOnly",
  seed: 123456,
};

describe("M10.5: runLink query codec", () => {
  it("round-trips a config exactly, and builds a matching params + scenario", () => {
    const query = encodeRunLinkQuery(JEZERO_CONFIG);
    const decoded = decodeRunLinkQuery(query);

    expect(decoded.kind).toBe("config");
    if (decoded.kind !== "config") return;
    expect(decoded.config).toEqual(JEZERO_CONFIG);
    expect(decoded.params).toEqual({
      scenarioId: "jezero-outpost",
      seed: 123456,
      crewSize: 4,
      missionStartIso: "2033-03-01",
      difficulty: "nominal",
    });
    expect(decoded.scenario.crewSize).toBe(4);
    expect(decoded.scenario.site.name).toBe("Jezero Crater");
  });

  it("accepts every scenario/site/power/shielding combination the setup wizard offers", () => {
    const configs: RunLinkConfig[] = [
      JEZERO_CONFIG,
      { ...JEZERO_CONFIG, scenarioId: "first-light", landingSiteId: "MOON-MALAPERT", crewSize: 2 },
      {
        ...JEZERO_CONFIG,
        scenarioId: "the-long-night",
        landingSiteId: "MOON-EQUATORIAL",
        powerArchitecture: "fission",
        shieldingApproach: "regolithBerm",
      },
      { ...JEZERO_CONFIG, landingSiteId: "MARS-GALE", powerArchitecture: "hybrid", shieldingApproach: "waterWall" },
      { ...JEZERO_CONFIG, landingSiteId: "MARS-ARCADIA" },
      { ...JEZERO_CONFIG, scenarioId: "first-light", landingSiteId: "MOON-CONNECTING-RIDGE" },
    ];
    for (const config of configs) {
      const decoded = decodeRunLinkQuery(encodeRunLinkQuery(config));
      expect(decoded.kind, JSON.stringify(config)).toBe("config");
      if (decoded.kind === "config") expect(decoded.config).toEqual(config);
    }
  });

  it("maps every Phase 1 legacy difficulty value to its Phase 2 preset", () => {
    const cases: [string, string][] = [
      ["cadet", "training"],
      ["standard", "nominal"],
      ["commander", "flightRated"],
    ];
    for (const [legacy, expected] of cases) {
      const query = encodeRunLinkQuery(JEZERO_CONFIG).replace("d=nominal", `d=${legacy}`);
      const decoded = decodeRunLinkQuery(query);
      expect(decoded.kind).toBe("config");
      if (decoded.kind === "config") expect(decoded.config.difficulty).toBe(expected);
    }
  });

  it("no whitelisted keys at all is \"none\", not \"invalid\" — an ordinary fresh app load", () => {
    expect(decodeRunLinkQuery("").kind).toBe("none");
    expect(decodeRunLinkQuery("utm_source=newsletter").kind).toBe("none");
  });

  it("an unrecognised extra key is ignored, not fatal, alongside a valid link", () => {
    const decoded = decodeRunLinkQuery(`${encodeRunLinkQuery(JEZERO_CONFIG)}&utm_source=newsletter`);
    expect(decoded.kind).toBe("config");
  });

  it("a mismatched SIM_VERSION reports versionMismatch, not invalid", () => {
    const query = encodeRunLinkQuery(JEZERO_CONFIG).replace(`v=${SIM_VERSION}`, "v=999");
    expect(decodeRunLinkQuery(query)).toEqual({ kind: "versionMismatch", foundVersion: 999 });
  });

  const invalidCases: [string, string][] = [
    ["v=notanumber&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=1", "version"],
    [`v=${SIM_VERSION}&sc=bogus&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=1`, "scenario"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=bogus&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=1`, "difficulty"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=1&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=1`, "crew size"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=99&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=1`, "crew size"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=BOGUS&power=solarBattery&shield=hullOnly&seed=1`, "landing site"],
    // A real site, but for the wrong body — jezero-outpost is Mars, MOON-MALAPERT is the Moon.
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MOON-MALAPERT&power=solarBattery&shield=hullOnly&seed=1`, "does not match"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=bogus&shield=hullOnly&seed=1`, "power"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=bogus&seed=1`, "shielding"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=-1`, "seed"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=${MAX_SEED + 1}`, "seed"],
    [`v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly`, "seed"],
  ];
  for (const [query, expectedReasonFragment] of invalidCases) {
    it(`rejects as invalid: ${query}`, () => {
      const decoded = decodeRunLinkQuery(query);
      expect(decoded.kind).toBe("invalid");
      if (decoded.kind === "invalid") expect(decoded.reason).toContain(expectedReasonFragment);
    });
  }
});

describe("M10.5: runLink fragment codec", () => {
  it("round-trips every RunInput kind, including a real incident response, in order", () => {
    const def = INCIDENT_CATALOG.find((d) => d.id === "fire-mir97");
    expect(def).toBeDefined();
    const responseId = def?.responses[0]?.id;
    expect(responseId).toBeDefined();
    if (def === undefined || responseId === undefined) return;

    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "commsPriority", priority: "personal" } },
      { hour: 0, input: { kind: "crewLocation", crewId: "crew-2", location: "stormShelter" } },
      { hour: 0, input: { kind: "station", crewId: "crew-1", station: "comms" } },
      { hour: 0, input: { kind: "priority", systemId: "comms", direction: -1 } },
      { hour: 12, input: { kind: "rations", mode: "mode1" } },
      { hour: 12, input: { kind: "co2ScrubberMode", mode: "eco" } },
      { hour: 20, input: { kind: "cleanSolarArrays" } },
      { hour: 42, input: { kind: "incidentResponse", incidentId: `${def.id}-42`, responseId } },
    ];

    const fragment = encodeRunLinkFragment(inputLog, 400);
    const decoded = decodeRunLinkFragment(`#i=${fragment}`);

    expect(decoded).toEqual({ kind: "log", inputLog, throughHour: 400 });
  });

  it("a config-only link (no i= key) decodes as \"none\"", () => {
    expect(decodeRunLinkFragment("").kind).toBe("none");
    expect(decodeRunLinkFragment("#").kind).toBe("none");
  });

  it("an empty input log still round-trips", () => {
    const fragment = encodeRunLinkFragment([], 0);
    expect(decodeRunLinkFragment(`i=${fragment}`)).toEqual({ kind: "log", inputLog: [], throughHour: 0 });
  });

  it("rejects a fragment with an invalid base64url character", () => {
    expect(decodeRunLinkFragment("i=not!valid!!").kind).toBe("invalid");
  });

  it("rejects trailing bytes after a complete, well-formed input log", () => {
    const fragment = encodeRunLinkFragment([{ hour: 0, input: { kind: "commsPriority", priority: "science" } }], 10);
    // Appends one more base64url character's worth of garbage after a genuinely complete log.
    const decoded = decodeRunLinkFragment(`i=${fragment}AAAA`);
    expect(decoded.kind).toBe("invalid");
  });

  it("rejects a truncated fragment (cut off mid varint or mid payload)", () => {
    const fragment = encodeRunLinkFragment(
      [{ hour: 5, input: { kind: "station", crewId: "crew-1", station: "power" } }],
      10,
    );
    const decoded = decodeRunLinkFragment(`i=${fragment.slice(0, Math.max(1, fragment.length - 2))}`);
    expect(decoded.kind).toBe("invalid");
  });
});

describe("M10.5: frozen-literal regression", () => {
  // Generated once from JEZERO_CONFIG and a small fixed input log — pinned so a future change
  // to the codec's wire format is caught here rather than silently breaking every run link
  // already shared. A deliberate format change updates these two literals *and* explains why
  // in the commit message, per CLAUDE.md's own SIM_VERSION-adjacent discipline.
  const FROZEN_QUERY =
    `v=${SIM_VERSION}&sc=jezero-outpost&d=nominal&cs=4&site=MARS-JEZERO&power=solarBattery&shield=hullOnly&seed=123456`;
  const FROZEN_FRAGMENT = "kAMCAAQBBAAB";

  it("the frozen query string still decodes to the exact same config", () => {
    const decoded = decodeRunLinkQuery(FROZEN_QUERY);
    expect(decoded.kind).toBe("config");
    if (decoded.kind === "config") expect(decoded.config).toEqual(JEZERO_CONFIG);
  });

  it("the frozen fragment still decodes to the exact same input log", () => {
    const decoded = decodeRunLinkFragment(`i=${FROZEN_FRAGMENT}`);
    expect(decoded).toEqual({
      kind: "log",
      throughHour: 400,
      inputLog: [
        { hour: 0, input: { kind: "commsPriority", priority: "science" } },
        { hour: 4, input: { kind: "rations", mode: "mode1" } },
      ],
    });
  });
});

describe("M10.7: buildRunLinkUrl", () => {
  const location = { origin: "https://sol-keeper.example", pathname: "/" };

  it("a config-only link has a query string and no fragment", () => {
    const url = buildRunLinkUrl(location, JEZERO_CONFIG);
    expect(url).toBe(`https://sol-keeper.example/?${encodeRunLinkQuery(JEZERO_CONFIG)}`);
    expect(url).not.toContain("#");

    // Round-trips through decode: this is exactly the URL shape App.tsx's boot effect reads.
    const [, query] = url.split("?");
    const decoded = decodeRunLinkQuery(query ?? "");
    expect(decoded.kind).toBe("config");
  });

  it("a report link with a replay log appends the fragment after the query string", () => {
    const inputLog: RecordedInput[] = [{ hour: 3, input: { kind: "commsPriority", priority: "science" } }];
    const url = buildRunLinkUrl(location, JEZERO_CONFIG, { inputLog, throughHour: 10 });
    const [beforeHash, afterHash] = url.split("#");
    expect(beforeHash).toBe(`https://sol-keeper.example/?${encodeRunLinkQuery(JEZERO_CONFIG)}`);
    expect(afterHash).toBe(`i=${encodeRunLinkFragment(inputLog, 10)}`);

    const decodedFragment = decodeRunLinkFragment(afterHash ?? "");
    expect(decodedFragment).toEqual({ kind: "log", inputLog, throughHour: 10 });
  });

  it("respects a non-root pathname (a deployed subpath, not just the origin's root)", () => {
    const url = buildRunLinkUrl({ origin: "https://example.com", pathname: "/sol-keeper/" }, JEZERO_CONFIG);
    expect(url.startsWith("https://example.com/sol-keeper/?")).toBe(true);
  });
});
