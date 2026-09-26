/**
 * Renders the Habitat view (M9.4a/b) and reads the first frame — the same `renderToString`
 * approach `render.test.tsx` already uses, and the same limitation: Zustand v5's SSR path
 * always reflects the store as it was first created, not anything dispatched afterward (see
 * that file's own doc comment), so this only covers the default-state render. Everything
 * that depends on a state change after mount (a crew member sent to the shelter, a solar
 * particle event, a depressurization incident) is covered in e2e/habitat.spec.ts instead,
 * against a real, reactive browser render.
 */
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { HabitatView } from "../src/views/Habitat/HabitatView";
import { useRun } from "../src/store/run";
import { useDial } from "../src/store/dial";
// M11: HabitatView now reads the player's language (useAppLanguage -> useTranslation) to pass
// through to stationLabel/locationLabel — this import is what initializes react-i18next in
// this test file (render.test.tsx gets it for free by importing App.tsx; this file never did).
import "../src/i18n/config";

function render(): string {
  return renderToString(<HabitatView />).replace(/<!-- -->/g, "");
}

beforeEach(() => {
  useRun.getState().reset();
  useDial.getState().setLevel("specialist");
});

describe("Habitat view (M9.4a/b), first frame", () => {
  it("shows the real mission site and body, with no alarm banners by default", () => {
    const out = render();
    expect(out).toContain("Jezero Crater, Mars");
    expect(out).not.toContain("Solar particle event in progress");
    expect(out).not.toContain("Depressurization in progress");
  });

  it("lists every living crew member with their real station and condition", () => {
    const out = render();
    for (const member of useRun.getState().state.crew) {
      expect(out).toContain(member.name);
    }
    expect(out).toContain("Nominal"); // every crew member starts healthy
    expect(out).toContain("the habitat"); // everyone starts in the habitat, not sheltering or on EVA
  });

  it("dust status is never colour alone: the word and glyph are both in the markup", () => {
    const out = render();
    expect(out).toContain("Clear");
    expect(out).toContain("●");
  });
});
