import type { CockpitAssignment, CockpitPanel, ScreenRegion } from "./types.js";

/**
 * Panel -> screen-region assignment (M9.1's own "Panel -> screen assignment" section).
 *
 * Deterministic and total: every panel passed in ends up either in `placements` or
 * `overflow`, never silently dropped. 'alert' is not handled here — the brief's own rule
 * ("takes the active alert / Decision Card when one exists, otherwise the station's most
 * critical gauge") is state-dependent, not a static per-panel property, so the one 'alert'
 * region is filled directly by StationCockpit.tsx instead.
 *
 * Within a role, regions are tried in the order the screen map lists them (a station's
 * own declared reading order); panels are tried in priority order (lower first). A panel
 * whose role has no region left for it — not narrower than `minPanelWidthPx`, that is: a
 * too-small region is treated as absent, same as a missing one — goes to overflow.
 */
export function assignPanelsToRegions(
  panels: readonly CockpitPanel[],
  regions: readonly ScreenRegion[],
  /** The rendered width (px) of the whole cockpit frame, for `minPanelWidthPx` filtering. */
  frameWidthPx: number,
): CockpitAssignment {
  const regionsByRole = new Map<ScreenRegion["role"], ScreenRegion[]>();
  for (const region of regions) {
    if ((region.wPct / 100) * frameWidthPx < region.minPanelWidthPx) continue;
    const bucket = regionsByRole.get(region.role) ?? [];
    bucket.push(region);
    regionsByRole.set(region.role, bucket);
  }

  const placements = new Map<string, string>();
  const overflow: string[] = [];

  for (const role of ["primary", "secondary", "ticker"] as const) {
    const roleRegions = regionsByRole.get(role) ?? [];
    const rolePanels = panels
      .filter((p) => p.role === role)
      .slice()
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

    rolePanels.forEach((panel, i) => {
      const region = roleRegions[i];
      if (region === undefined) {
        overflow.push(panel.id);
      } else {
        placements.set(panel.id, region.id);
      }
    });
  }

  return { placements, overflow };
}
