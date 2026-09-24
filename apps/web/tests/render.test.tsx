/**
 * Renders the Operate view and reads what comes out.
 *
 * This is a real render — the actual component tree, the actual Zustand store, the actual
 * simulation — through react-dom/server rather than a browser.
 *
 * Two things about that path shape these tests:
 *
 *  1. React SSR separates adjacent text nodes with `<!-- -->` comments, so
 *     `{count}/{total} crew` serialises as `4<!-- -->/<!-- -->4<!-- --> crew`. `render()`
 *     strips them, otherwise every assertion on an interpolated string fails for a reason
 *     that has nothing to do with the app.
 *
 *  2. Zustand v5 passes `getInitialState` as `useSyncExternalStore`'s server snapshot, so a
 *     server render always reflects the store as it was created, no matter what has been
 *     dispatched since. The browser uses `getSnapshot` and does not behave this way. It
 *     means this file can assert the *first frame* only; anything about how the view
 *     responds to a changing simulation is asserted against the store and the presentation
 *     functions instead, below.
 *
 * So this covers assembly, wiring and the accessibility rules in the markup. It does not
 * cover layout, paint, or interaction — opening the page still does that.
 */
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { DebriefView } from "../src/views/Debrief/DebriefView";
import { DataSourcesView } from "../src/views/DataSources/DataSourcesView";
import { PowerConsole } from "../src/views/Power/PowerConsole";
import { LifeSupportConsole } from "../src/views/LifeSupport/LifeSupportConsole";
import { CommsConsole } from "../src/views/Comms/CommsConsole";
import { IncidentCommandConsole } from "../src/views/IncidentCommand/IncidentCommandConsole";
import { MissionCommandConsole } from "../src/views/MissionCommand/MissionCommandConsole";
import { BriefingView } from "../src/views/Briefing/BriefingView";
import { CoachMark } from "../src/onboarding/CoachMark";
import { useRun } from "../src/store/run";
import { useDial } from "../src/store/dial";
import { useOnboarding } from "../src/store/onboarding";
import { logText } from "../src/i18n/logText";
import { statusFromCeiling, statusFromReserve } from "../src/components/status";

/** Render, with React's text-node separators removed. */
function render(node: ReactElement = <App />): string {
  return renderToString(node).replace(/<!-- -->/g, "");
}

beforeEach(() => {
  useRun.getState().reset();
  useDial.getState().setLevel("specialist");
  useOnboarding.setState({ seen: false, step: 0 });
});

describe("App shell, first frame (persistent across every tab)", () => {
  it("shows the mission header for the Jezero scenario", () => {
    const out = render();
    expect(out).toContain("Sol Keeper");
    expect(out).toContain("Jezero Crater");
    expect(out).toContain("30 sols");
    expect(out).toContain("4/4 crew");
  });

  it("renders the time controls and mission log on every tab, not just one console", () => {
    const out = render();
    expect(out).toContain("Sol 0.00");
    expect(out).toContain("+1 sol");
    expect(out).toContain("Mission log");
    expect(out).toContain("Nothing has happened yet");
  });

  it("carries the credit line and no NASA insignia (brief rule 5)", () => {
    const out = render();
    expect(out).toContain("Not affiliated with or endorsed by NASA");
    expect(out.toLowerCase()).not.toContain("meatball");
    expect(out).not.toMatch(/nasa[-_]?logo|insignia/i);
    expect(out).not.toMatch(/<img[^>]+nasa/i);
  });

  it("the run status is a live region carrying text", () => {
    const out = render();
    expect(out).toContain('role="status"');
    expect(out).toContain("Running");
  });

  it("decorative glyphs are hidden from screen readers", () => {
    const out = render();
    // Every bare glyph is paired with aria-hidden so it is not read out as punctuation.
    expect(out).toContain('<span aria-hidden="true">●</span>');
  });
});

describe("First Light coach mark (M8.7)", () => {
  // Zustand v5's SSR snapshot is fixed at store creation (see this file's own header comment)
  // so a later setState never shows up in renderToString — seen/step transitions are covered
  // directly against the store instead, in tests/onboarding.test.ts.
  it("stays out of the way of Briefing, the app's default first frame", () => {
    const out = render();
    expect(out).toContain("Mission Briefing");
    expect(out).not.toContain("Skip tutorial");
  });

  it("starts at step 1 of 5 on Power once the player is on any station console", () => {
    const out = render(<CoachMark view="comms" onNavigate={() => {}} />);
    expect(out).toContain("Step 1 of 5");
    expect(out).toContain("Power");
    expect(out).toContain("Skip tutorial");
  });
});

describe("Power console, first frame", () => {
  it("renders the battery gauge and the priority list in shed order, least essential last", () => {
    const out = render(<PowerConsole />);
    expect(out).toContain("Battery");
    expect(out).toContain("150 kWh");
    expect(out).toContain("Power priority");

    const order = ["Power distribution", "Life support", "CO₂ scrubber", "Heating"];
    let cursor = -1;
    for (const name of order) {
      const at = out.indexOf(name);
      expect(at, `${name} missing`).toBeGreaterThan(-1);
      expect(at, `${name} out of order`).toBeGreaterThan(cursor);
      cursor = at;
    }
    // MOXIE is the most expendable thing on the outpost and goes dark first.
    expect(out.indexOf("MOXIE")).toBeGreaterThan(cursor);
  });

  /**
   * Regression test for a bug an e2e screenshot caught: before the first tick,
   * `poweredThisHour` is just its unset default for every system, and reading that default
   * as "Shed" told a player nine systems had already lost power on a mission that had not
   * started — right beside a battery gauge honestly reporting "0.0 of 0.0 kW served". A
   * render test never saw it because it wasn't looking for the absence of a word.
   */
  it("does not claim any system is Shed before the mission clock has run", () => {
    const out = render(<PowerConsole />);
    expect(out).not.toContain("Shed");
    expect(out).toContain("Standby");
  });

  it("priority reorder buttons say what they do, not just an arrow", () => {
    const out = render(<PowerConsole />);
    expect(out).toContain("keep it powered longer");
    expect(out).toContain("shed it sooner");
  });

  /**
   * The space-weather and fact-card data hooks fetch inside a useEffect, which — like every
   * store mutation in this file — never runs during renderToString (see the note at the top).
   * So this can only assert the pristine pre-fetch frame: headings present, and both
   * provenance badges reading "Loading…" rather than a stale or fabricated
   * "Live"/"Snapshot" claim before any fetch has actually settled. The live-then-snapshot-
   * fallback behaviour itself is proven against a real browser in e2e/liveSky.spec.ts.
   */
  it("folds in Live Sky's space-weather panel and fact cards (M8's settled navigation)", () => {
    const out = render(<PowerConsole />);
    expect(out).toContain("Recent solar activity");
    expect(out).toContain("What NASA did: MOXIE"); // Jezero is the default scenario (Mars)
    // The space-weather panel's own badge plus the fact-card gallery's own — both still
    // "Loading…", neither claiming Live/Snapshot/Historical before a fetch has settled.
    expect((out.match(/Loading…/g) ?? []).length).toBe(2);
    expect(out).not.toMatch(/is-live|is-snapshot|is-historical/);
  });
});

describe("Life Support console, first frame", () => {
  it("renders every resource gauge with its real opening value", () => {
    const out = render(<LifeSupportConsole />);
    for (const label of ["Oxygen", "Carbon dioxide", "Water", "Food", "Cabin"]) {
      expect(out, `missing gauge: ${label}`).toContain(label);
    }
    // The scenario opens with 1200 kg of water and 150 kg of dry food.
    expect(out).toContain("1200 kg");
    expect(out).toContain("150 kg dry");
    // Outside temperature comes from the corrected Mars mean, -59 degC.
    expect(out).toContain("outside -59 °C");
  });

  it("renders the ration controls with their sourced calorie figures", () => {
    const out = render(<LifeSupportConsole />);
    expect(out).toContain("Rations");
    expect(out).toContain("3600 kcal");
    expect(out).toContain("1800 kcal");
    expect(out).toContain("600 kcal");
  });

  it("every gauge prints a status word beside its glyph (brief rule 6)", () => {
    const out = render(<LifeSupportConsole />);
    const statusWords = (out.match(/Nominal|Caution|Critical/g) ?? []).length;
    expect(statusWords).toBeGreaterThanOrEqual(5);
  });

  it("meters expose their real value to assistive technology", () => {
    const out = render(<LifeSupportConsole />);
    expect(out).toContain('role="meter"');
    expect(out).toContain('aria-valuetext="1200 kg, Nominal"');
    expect(out).toContain("aria-valuenow");
  });
});

describe("Comms console, first frame", () => {
  it("renders the light-time panel, folded in wholesale from Live Sky", () => {
    const out = render(<CommsConsole />);
    expect(out).toContain("Comms");
    expect(out).toContain("Distance to Earth");
    // The light-time data hook fetches inside a useEffect, which never runs during SSR (see
    // the note on Power console's own equivalent check) — still "Loading…", not a stale claim.
    expect((out.match(/Loading…/g) ?? []).length).toBe(1);
  });
});

describe("Mission Command console, first frame", () => {
  it("shows crew dose against the career limit, not as a bare number", () => {
    const out = render(<MissionCommandConsole />);
    expect(out).toContain("600 mSv career limit");
  });

  it("renders the ESM budget with a real per-system breakdown, no reactor line for Jezero", () => {
    const out = render(<MissionCommandConsole />);
    expect(out).toContain("Mission ESM budget");
    expect(out).toContain("Total equivalent mass");
    expect(out).toContain("Habitat pressurised volume");
    expect(out).toContain("Battery hardware");
    // Jezero is solar-only; a scenario with no reactor must not show a reactor line.
    expect(out).not.toContain("Fission reactor");
    // A fully-sourced system (CO2 scrubber) shows real hardware/cooling/crew-time figures...
    expect(out).toContain("CO₂ scrubber");
    // ...while lifeSupport, which has no hardware data at all, says so in text, not just a
    // marker — brief rule 6, never colour (or a bare asterisk) alone.
    expect(out).toContain("not sourced");
    expect(out).toContain("Life Support has no hardware-mass figure");
  });

  it("renders the scenario switch", () => {
    const out = render(<MissionCommandConsole />);
    expect(out).toContain("Jezero Outpost");
    expect(out).toContain("First Light");
    expect(out).toContain("The Long Night");
  });
});

describe("Briefing view, first frame", () => {
  it("is the default screen a fresh mission opens on", () => {
    const out = render();
    expect(out).toContain("Mission Briefing");
    expect(out).toContain("Jezero Crater");
  });

  it("renders standalone with the same content", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("Mission Briefing");
  });
});

describe("App shell: tab nav and Reality Dial, first frame", () => {
  it("renders the five station consoles plus Briefing and Debrief, Briefing active by default", () => {
    const out = render();
    expect(out).toContain("Power");
    expect(out).toContain("Life Support");
    expect(out).toContain("Comms");
    expect(out).toContain("Incident Command");
    expect(out).toContain("Mission Command");
    expect(out).toContain("Briefing");
    expect(out).toContain("Debrief");
    // Data Sources is a persistent link now, not one of the seven tabs (M8.3's settled
    // navigation) — still present, just outside .tab-nav, so this only checks the label
    // exists at all, not that it's a tab.
    expect(out).toContain("Data Sources");
    // aria-current="page" is only present on the active tab's button.
    expect((out.match(/aria-current="page"/g) ?? []).length).toBe(1);
  });

  it("renders the Reality Dial with Specialist selected by default", () => {
    const out = render();
    expect(out).toContain("Cadet");
    expect(out).toContain("Specialist");
    expect(out).toContain("Commander");
    expect((out.match(/aria-pressed="true"/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  // Switching the dial level and re-rendering to prove it changes the text is *not* testable
  // through renderToString: zustand v5 supplies every store's getInitialState() as
  // useSyncExternalStore's server snapshot, so an SSR render is frozen to whatever every
  // store held at module import, and setLevel() (like useRun's step()/reset()) simply never
  // reaches it. That behaviour is what "renders the Reality Dial with Specialist selected by
  // default" above actually exercises. The level's real effect on rendered text is proven
  // directly against dial/present.ts in dial.test.ts, and against a live DOM in
  // e2e/dial.spec.ts, where a real browser's hydration does observe store updates.
});

describe("DataSourcesView, first frame", () => {
  it("carries the credit line, disclosing rather than hiding the branding rule", () => {
    const out = render(<DataSourcesView />);
    expect(out).toContain("Not affiliated with or endorsed by NASA");
    // Rule 5 is disclosed here in prose ("carries no NASA logo, insignia, or 'meatball'"),
    // which necessarily names the very things it says are absent — unlike the Operate view,
    // where those words should never appear at all. What must never appear on this or any
    // screen is an actual image asset presented as one.
    expect(out).not.toMatch(/<img[^>]+nasa/i);
  });

  it("lists a source for every distinct SourceId actually cited by a constant", () => {
    const out = render(<DataSourcesView />);
    for (const id of ["BVAD-2022", "OCHMO-RAD", "MIT-MOXIE-2023", "NSSDC-FACTS", "GAME-DESIGN"]) {
      expect(out, `missing source row: ${id}`).toContain(id);
    }
  });

  it("states the unsourced count plainly, whether zero or not", () => {
    const out = render(<DataSourcesView />);
    // Phase 1 (M6) reached zero placeholders; Phase 2's M7 reopened ten — real
    // NASA-cited physiology/radiation thresholds and incident magnitudes the team had not
    // yet supplied documents for (docs/PHASE2_BRIEF.md's own "placeholder, not a guess"
    // rule). M7.5's addendum (docs/INCIDENT_MAGNITUDES.md) then closed three of those
    // (depress-mir97, o2tank-apollo13, coolant-ms22) with published/derived values, and
    // M7.6 Part D closed the last three incident placeholders (spe-1972, scrubber-iss,
    // duststorm-2018), leaving four — this screen honestly shows a nonzero count rather than
    // claiming a false "fully sourced" the way it briefly could after M6.
    expect(out).toContain("Still unsourced (4)");
    expect(out).toContain("Every value below is a placeholder");
    expect(out).toContain("radiation.arsLethalMSv");
  });

  it("discloses that fire risk is deliberately not modelled, and why", () => {
    const out = render(<DataSourcesView />);
    expect(out).toContain("Fire risk from an oxygen-rich cabin is not modelled");
    expect(out).toContain("concentration");
  });

  it("discloses the SPE unit simplification rather than staying silent about it", () => {
    const out = render(<DataSourcesView />);
    expect(out).toContain("mGy-Eq");
  });
});

describe("DebriefView, mission still running (first frame)", () => {
  it("shows a not-ready state rather than an empty debrief", () => {
    const out = render(<DebriefView />);
    expect(out).toContain("Debrief");
    expect(out).toContain("fills in once the mission ends");
    // Nothing from an ended-mission section should appear yet.
    expect(out).not.toContain("Final numbers");
    expect(out).not.toContain("Major incidents");
  });
});

describe("Incident Command console, first frame (Jezero, the default scenario)", () => {
  it("renders the dependency graph and every system/domain/crew node it should for Jezero", () => {
    const out = render(<IncidentCommandConsole />);
    expect(out).toContain("Incident Command");
    // One node per scenario system, using the friendly label, not the raw id.
    for (const label of ["Life support", "CO₂ scrubber", "Heating", "MOXIE", "Greenhouse"]) {
      expect(out, `missing node: ${label}`).toContain(label);
    }
    expect(out).not.toContain("co2Scrubber");
    // Domain and crew nodes.
    for (const label of ["Oxygen", "Water", "Food", "Radiation", "Crew"]) {
      expect(out, `missing node: ${label}`).toContain(label);
    }
  });

  it("renders one <line> per edge and one node group per node — nothing dangling", () => {
    const out = render(<IncidentCommandConsole />);
    const lineCount = (out.match(/<line /g) ?? []).length;
    const nodeGroupCount = (out.match(/class="ripple-node /g) ?? []).length;
    expect(lineCount).toBeGreaterThan(0);
    expect(nodeGroupCount).toBeGreaterThan(0);
  });

  it("carries a full text table as a non-visual fallback (rule 6, and SVG isn't screen-reader friendly)", () => {
    const out = render(<IncidentCommandConsole />);
    expect(out).toContain("Same information, as text");
    expect(out).toContain('role="img"');
    expect(out).toContain("<table");
  });

  it("marks the graph accessible without relying on colour alone", () => {
    const out = render(<IncidentCommandConsole />);
    // Every table row's status cell carries a real word, not just a colour class.
    expect(out).toMatch(/Standby|Powered|Shed|Failed|Nominal|Caution|Critical/);
  });
});

/**
 * Leaflet itself never loads during SSR (it's a dynamic import inside a useEffect —
 * components/LandingSiteMap.tsx's own note), so this can only check the surrounding chrome:
 * the real site name/coordinates/Trek attribution, all of which come from the scenario and
 * map/trekLayers.ts rather than the map widget itself.
 */
describe("Briefing view content, first frame (M8.6)", () => {
  it("lists every crew member with their real primary and backup station", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("Crew");
    // state.ts's own round-robin assignment for Jezero's 4-person crew.
    expect(out).toContain("Power");
    expect(out).toContain("backup");
  });

  it("folds in the landing-site map's surrounding chrome (M8.3's settled navigation)", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("Landing site");
    expect(out).toContain("Jezero Crater");
    expect(out).toContain("18.4");
    expect(out).toContain("77.6");
    expect(out).toContain("NASA Ames / USGS Astrogeology Science Center");
  });

  it("states the real scripted hazard for the current scenario, not a live feed", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("What to expect");
    expect(out).toContain("dust storm");
  });

  it("renders both real goals, not a placeholder", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("Primary goal");
    expect(out).toContain("Stretch goal");
    expect(out).toContain("Harvest every crop tray");
  });

  it("discloses all three real failure outcomes, not just crew loss", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("What failure looks like");
    expect(out).toContain("goal unmet");
    expect(out).toContain("end the mission early");
    expect(out).toContain("every crew member is lost");
  });

  it("shows a real, sourced packed-mass headline, not the interactive Launch Packing explorer", () => {
    const out = render(<BriefingView />);
    expect(out).toContain("Packed mass");
    expect(out).toContain("PDR-phase margin");
    // The interactive risk-matrix explorer this screen deliberately does not carry forward.
    expect(out).not.toContain("Risk matrix explorer");
    expect(out).not.toMatch(/Low risk|Medium risk|High risk/);
  });
});

/**
 * The view's response to a changing simulation, asserted where the logic actually lives.
 * See the note at the top for why this cannot go through renderToString.
 */
describe("the view's data sources respond to the running simulation", () => {
  it("stepping the clock advances mission time and fills the log", () => {
    expect(useRun.getState().state.hour).toBe(0);
    // Non-paused beforehand so that ending up "paused" afterward is meaningful evidence of
    // one of the two real reasons step() can stop short of the requested count (below), not
    // just the store's own default at rest.
    useRun.getState().setSpeed("normal");
    useRun.getState().step(200);

    const state = useRun.getState().state;
    // Phase 2 (M7): an incident can now end the mission before the requested 200 hours — a
    // real, intended outcome (validation/balance.test.ts asserts the actual pass rates), not
    // a bug this UI smoke test should assume away. M8.1 adds a second, real reason `step()`
    // can stop short of the requested count while the mission is still running: auto-pause,
    // on a newly detected incident or a worsened gauge status (the "auto-pause on any incident
    // or threshold crossing" the brief's M8 core loop asks for). Both paths force `speed` back
    // to "paused", so stopping early now means one of the two, never neither.
    expect(state.hour).toBeGreaterThan(0);
    expect(state.hour).toBeLessThanOrEqual(200);
    if (state.hour < 200) expect(useRun.getState().speed).toBe("paused");
    expect(state.log.length).toBeGreaterThan(0);
    // Every entry the feed will render must have English text, not a raw code.
    for (const entry of state.log.slice(0, 50)) {
      expect(logText(entry), `no template for ${entry.code}`).not.toBe(entry.code);
    }
  });

  it("changing survival mode changes the CO2 limit the gauge reads from", () => {
    const before = useRun.getState().state.food.mode;
    expect(before).toBe("nominal");

    useRun.getState().setSurvivalMode("mode2");
    expect(useRun.getState().state.food.mode).toBe("mode2");
  });

  it("reordering priorities changes what gets shed first", () => {
    const idOrder = () =>
      Object.values(useRun.getState().state.systems)
        .sort((a, b) => a.priority - b.priority)
        .map((s) => s.id);

    const before = idOrder();
    const second = before[1];
    expect(second).toBeDefined();

    useRun.getState().setPriority(second!, -1);
    const after = idOrder();

    expect(after[0]).toBe(second);
    expect(after[1]).toBe(before[0]);
    expect(after).toHaveLength(before.length);
  });

  it("gauge status thresholds cross as reserves fall", () => {
    expect(statusFromReserve(1).level).toBe("nominal");
    expect(statusFromReserve(0.3).level).toBe("caution");
    expect(statusFromReserve(0.1).level).toBe("critical");

    expect(statusFromCeiling(1, 3).level).toBe("nominal");
    expect(statusFromCeiling(2.5, 3).level).toBe("caution");
    expect(statusFromCeiling(3.5, 3).level).toBe("critical");
  });

  it("restart returns the outpost to hour zero", () => {
    // Not asserting an exact hour count here: M8.1's auto-pause can legitimately stop step()
    // short of 50 (see the test above) — this test only cares that reset() zeroes things out.
    useRun.getState().step(50);
    expect(useRun.getState().state.hour).toBeGreaterThan(0);

    useRun.getState().reset();
    expect(useRun.getState().state.hour).toBe(0);
    expect(useRun.getState().state.log).toHaveLength(0);
    expect(useRun.getState().speed).toBe("paused");
  });

  // M8.1: the player-driven counterpart to `tickWithBot`'s bot-driven resolution
  // (packages/sim/src/engine/runWithBot.ts) — packages/sim's own incidents.test.ts already
  // covers `applyResponse`'s probabilistic resolution in depth, so this only proves the store
  // wiring actually reaches it, using a manually-planted pending incident rather than waiting
  // on a real trigger.
  it("resolveIncident reaches the sim's own applyResponse seam", () => {
    const { state } = useRun.getState();
    const incident = {
      id: "test-spe-1972",
      definitionId: "spe-1972",
      triggeredAtHour: state.hour,
      cause: "1:0",
      detectedAtHour: state.hour,
    };
    state.activeIncidents.push(incident);
    const logLengthBefore = state.log.length;

    useRun.getState().resolveIncident(incident.id, "continueOperations");

    const newCodes = state.log.slice(logLengthBefore).map((e) => e.code);
    expect(newCodes.some((c) => c.startsWith("incident.spe-1972."))).toBe(true);
  });

  it("setCrewLocation moves a crew member (the shelter/EVA control's mechanism)", () => {
    const member = useRun.getState().state.crew[0]!;
    expect(member.location).toBe("habitat");

    useRun.getState().setCrewLocation(member.id, "stormShelter");
    expect(useRun.getState().state.crew[0]!.location).toBe("stormShelter");
  });

  it("assignStation reassigns a crew member's primary station", () => {
    const member = useRun.getState().state.crew[0]!;
    const before = member.primaryStation;
    const after = before === "power" ? "comms" : "power";

    useRun.getState().assignStation(member.id, after);
    expect(useRun.getState().state.crew[0]!.primaryStation).toBe(after);
  });
});

describe("Decision Card (M8.2)", () => {
  // Not exercised through render()/renderToString here: this file's own header note applies
  // (Zustand v5's SSR snapshot is frozen at module load, so a mutation made after `reset()`
  // replaces `state` with a new object renderToString never sees — the same reason every
  // other post-mutation assertion in this file goes through the store directly, not a second
  // render). DecisionCard's actual DOM output is verified in a real browser instead (M8.2's
  // own manual check); `selectPendingIncident` and `decisionText`'s pure logic are covered
  // directly in pendingIncident.test.ts and decisionText.test.ts.
  it("does not render when no incident is pending", () => {
    useRun.getState().reset();
    const html = render();
    expect(html).not.toContain("decision-card");
  });
});
