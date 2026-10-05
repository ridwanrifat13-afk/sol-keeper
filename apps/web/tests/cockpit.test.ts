/**
 * M9.1 — Station Cockpit View: the two pieces the brief's own "Tests" section calls out as
 * pure/unit-testable (assignment, screen-map validation). The portal/toggle/fallback behavior
 * needs a real DOM and lives in e2e/cockpit.spec.ts instead.
 */
import { describe, expect, it } from "vitest";
import { assignPanelsToRegions } from "../src/cockpit/assignPanels";
import { validateScreenMap } from "../src/cockpit/validateScreenMap";
import { SCREEN_MAPS } from "../src/cockpit/screenMaps";
import type { CockpitPanel, ScreenRegion } from "../src/cockpit/types";

const region = (over: Partial<ScreenRegion> & Pick<ScreenRegion, "id" | "role">): ScreenRegion => ({
  xPct: 0,
  yPct: 0,
  wPct: 20,
  hPct: 20,
  minPanelWidthPx: 50,
  ...over,
});

describe("assignPanelsToRegions", () => {
  it("places one panel per region of the matching role, in priority order", () => {
    const panels: CockpitPanel[] = [
      { id: "b", role: "secondary", priority: 2 },
      { id: "a", role: "secondary", priority: 1 },
    ];
    const regions = [region({ id: "r1", role: "secondary" }), region({ id: "r2", role: "secondary" })];
    const { placements, overflow } = assignPanelsToRegions(panels, regions, 1000);
    expect(placements.get("a")).toBe("r1");
    expect(placements.get("b")).toBe("r2");
    expect(overflow).toEqual([]);
  });

  it("is total: a panel with no region of its own role goes to overflow, never dropped", () => {
    const panels: CockpitPanel[] = [
      { id: "a", role: "secondary", priority: 1 },
      { id: "b", role: "secondary", priority: 2 },
    ];
    const regions = [region({ id: "r1", role: "secondary" })];
    const { placements, overflow } = assignPanelsToRegions(panels, regions, 1000);
    expect(placements.get("a")).toBe("r1");
    expect(overflow).toEqual(["b"]);
  });

  it("is deterministic: the same input always produces the same assignment", () => {
    const panels: CockpitPanel[] = [
      { id: "x", role: "primary", priority: 1 },
      { id: "y", role: "ticker", priority: 1 },
      { id: "z", role: "secondary", priority: 3 },
    ];
    const regions = [
      region({ id: "p", role: "primary" }),
      region({ id: "t", role: "ticker" }),
      region({ id: "s", role: "secondary" }),
    ];
    const first = assignPanelsToRegions(panels, regions, 1000);
    const second = assignPanelsToRegions(panels, regions, 1000);
    expect([...first.placements.entries()]).toEqual([...second.placements.entries()]);
    expect(first.overflow).toEqual(second.overflow);
  });

  it("treats a region narrower than its own minPanelWidthPx as absent", () => {
    const panels: CockpitPanel[] = [{ id: "a", role: "secondary", priority: 1 }];
    // 10% of a 500px frame is 50px, under this region's own 200px minimum.
    const regions = [region({ id: "r1", role: "secondary", wPct: 10, minPanelWidthPx: 200 })];
    const { placements, overflow } = assignPanelsToRegions(panels, regions, 500);
    expect(placements.size).toBe(0);
    expect(overflow).toEqual(["a"]);
  });

  it("never assigns a panel to a region of a different role", () => {
    const panels: CockpitPanel[] = [{ id: "a", role: "ticker", priority: 1 }];
    const regions = [region({ id: "r1", role: "primary" }), region({ id: "r2", role: "secondary" })];
    const { placements, overflow } = assignPanelsToRegions(panels, regions, 1000);
    expect(placements.size).toBe(0);
    expect(overflow).toEqual(["a"]);
  });
});

describe("validateScreenMap", () => {
  const valid = (): ScreenRegion[] => [
    region({ id: "a", role: "alert", xPct: 0, yPct: 0, wPct: 20, hPct: 20 }),
    region({ id: "p", role: "primary", xPct: 30, yPct: 0, wPct: 20, hPct: 20 }),
  ];

  it("passes a well-formed map with at least one alert and one primary region", () => {
    expect(validateScreenMap({ imageBase: "x", aspectRatio: 1, regions: valid() })).toEqual([]);
  });

  it("flags a region extending past the image bounds", () => {
    const regions = valid();
    const issues = validateScreenMap({
      imageBase: "x",
      aspectRatio: 1,
      regions: [...regions, region({ id: "over", role: "ticker", xPct: 95, yPct: 0, wPct: 10, hPct: 10 })],
    });
    expect(issues.some((i) => i.message.includes("over") && i.message.includes("outside"))).toBe(true);
  });

  it("flags two regions overlapping by more than 2% of the smaller one's area", () => {
    const regions = valid();
    const issues = validateScreenMap({
      imageBase: "x",
      aspectRatio: 1,
      regions: [...regions, region({ id: "clash", role: "ticker", xPct: 1, yPct: 1, wPct: 20, hPct: 20 })],
    });
    expect(issues.some((i) => i.message.includes("clash") && i.message.includes("overlap"))).toBe(true);
  });

  it("flags a map with no 'alert' region", () => {
    const issues = validateScreenMap({
      imageBase: "x",
      aspectRatio: 1,
      regions: [region({ id: "p", role: "primary" })],
    });
    expect(issues.some((i) => i.message.includes("alert"))).toBe(true);
  });

  it("flags a map with no 'primary' region", () => {
    const issues = validateScreenMap({
      imageBase: "x",
      aspectRatio: 1,
      regions: [region({ id: "a", role: "alert" })],
    });
    expect(issues.some((i) => i.message.includes("primary"))).toBe(true);
  });

  it("every registered screen map in SCREEN_MAPS is itself valid", () => {
    for (const [key, map] of Object.entries(SCREEN_MAPS)) {
      if (map === undefined) continue;
      expect(validateScreenMap(map), `${key}: ${JSON.stringify(validateScreenMap(map))}`).toEqual([]);
    }
  });
});
