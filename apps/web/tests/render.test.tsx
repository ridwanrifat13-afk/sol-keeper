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
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/App";
import { useRun } from "../src/store/run";
import { logText } from "../src/i18n/logText";
import { statusFromCeiling, statusFromReserve } from "../src/components/status";

/** Render, with React's text-node separators removed. */
function render(): string {
  return renderToString(<App />).replace(/<!-- -->/g, "");
}

beforeEach(() => {
  useRun.getState().reset();
});

describe("Operate view, first frame", () => {
  it("shows the mission header for the Jezero scenario", () => {
    const out = render();
    expect(out).toContain("Sol Keeper");
    expect(out).toContain("Jezero Crater");
    expect(out).toContain("30 sols");
    expect(out).toContain("4/4 crew");
  });

  it("renders every resource gauge with its real opening value", () => {
    const out = render();
    for (const label of ["Oxygen", "Carbon dioxide", "Water", "Food", "Battery", "Cabin"]) {
      expect(out, `missing gauge: ${label}`).toContain(label);
    }
    // The scenario opens with 1200 kg of water and 150 kg of dry food.
    expect(out).toContain("1200 kg");
    expect(out).toContain("150 kg dry");
    // Outside temperature comes from the corrected Mars mean, -59 degC.
    expect(out).toContain("outside -59 °C");
  });

  it("renders the time controls, priority list and mission log", () => {
    const out = render();
    expect(out).toContain("Sol 0.00");
    expect(out).toContain("+1 sol");
    expect(out).toContain("Power priority");
    expect(out).toContain("Life support");
    expect(out).toContain("Mission log");
    expect(out).toContain("Nothing has happened yet");
  });

  it("lists every system in shed order, least essential last", () => {
    const out = render();
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
    const out = render();
    expect(out).not.toContain("Shed");
    expect(out).toContain("Standby");
  });

  it("renders the ration controls with their sourced calorie figures", () => {
    const out = render();
    expect(out).toContain("Rations");
    expect(out).toContain("3600 kcal");
    expect(out).toContain("1800 kcal");
    expect(out).toContain("600 kcal");
  });

  it("shows crew dose against the career limit, not as a bare number", () => {
    const out = render();
    expect(out).toContain("600 mSv career limit");
  });

  it("carries the credit line and no NASA insignia (brief rule 5)", () => {
    const out = render();
    expect(out).toContain("Not affiliated with or endorsed by NASA");
    expect(out.toLowerCase()).not.toContain("meatball");
    expect(out).not.toMatch(/nasa[-_]?logo|insignia/i);
    expect(out).not.toMatch(/<img[^>]+nasa/i);
  });
});

describe("accessibility: status is never carried by colour alone (brief rule 6)", () => {
  it("every gauge prints a status word beside its glyph", () => {
    const out = render();
    const statusWords = (out.match(/Nominal|Caution|Critical/g) ?? []).length;
    expect(statusWords).toBeGreaterThanOrEqual(6);
  });

  it("meters expose their real value to assistive technology", () => {
    const out = render();
    expect(out).toContain('role="meter"');
    expect(out).toContain('aria-valuetext="1200 kg, Nominal"');
    expect(out).toContain("aria-valuenow");
  });

  it("priority reorder buttons say what they do, not just an arrow", () => {
    const out = render();
    expect(out).toContain("keep it powered longer");
    expect(out).toContain("shed it sooner");
  });

  it("the run status is a live region carrying text", () => {
    const out = render();
    expect(out).toContain('role="status"');
    expect(out).toContain("Running");
    expect(out).toContain('aria-live="polite"');
  });

  it("decorative glyphs are hidden from screen readers", () => {
    const out = render();
    // Every bare glyph is paired with aria-hidden so it is not read out as punctuation.
    expect(out).toContain('<span aria-hidden="true">●</span>');
  });
});

/**
 * The view's response to a changing simulation, asserted where the logic actually lives.
 * See the note at the top for why this cannot go through renderToString.
 */
describe("the view's data sources respond to the running simulation", () => {
  it("stepping the clock advances mission time and fills the log", () => {
    expect(useRun.getState().state.hour).toBe(0);
    useRun.getState().step(200);

    const state = useRun.getState().state;
    expect(state.hour).toBe(200);
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
    useRun.getState().step(50);
    expect(useRun.getState().state.hour).toBe(50);

    useRun.getState().reset();
    expect(useRun.getState().state.hour).toBe(0);
    expect(useRun.getState().state.log).toHaveLength(0);
    expect(useRun.getState().speed).toBe("paused");
  });
});
