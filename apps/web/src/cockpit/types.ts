/**
 * M9.1 — Station Cockpit View (presentation layer only, docs/PHASE2_BRIEF.md's own M9.1
 * section — the outer, non-git-tracked copy; `sol-keeper/docs/PHASE2_BRIEF.md` predates it).
 *
 * Shared types for the screen-map data (one entry per station photograph) and the generic
 * panel-to-region assignment this view runs on every console. Nothing here touches
 * packages/sim or any player-facing number — purely which existing DOM content paints where.
 */

/** One rectangular "monitor" cut into a station photograph, in percent of the image's own
 *  width/height — resolution-independent, so the same map works at 960w/1280w/1920w. */
export interface ScreenRegion {
  readonly id: string;
  readonly xPct: number;
  readonly yPct: number;
  readonly wPct: number;
  readonly hPct: number;
  /** Small perspective correction, degrees. Rarely needed; omitted when 0. */
  readonly rotateDeg?: number;
  /** Below this rendered width, the region is dropped — its panels fall to overflow tabs
   *  instead of rendering illegibly small. */
  readonly minPanelWidthPx: number;
  readonly role: "primary" | "secondary" | "alert" | "ticker";
}

export interface StationScreenMap {
  /** `/images/stations/{imageBase}-{width}.{ext}` — see cockpit/stationImage.ts. */
  readonly imageBase: string;
  /** width / height of the full photograph. */
  readonly aspectRatio: number;
  readonly regions: readonly ScreenRegion[];
}

export type Body = "moon" | "mars";
export type StationKey = "power" | "lifeSupport" | "comms" | "incidentCommand" | "missionCommand";

/** A single panel a station console offers to the cockpit layer. `role`/`priority` are the
 *  panel's own declared cockpit metadata (set where the panel is defined, via
 *  `<CockpitTarget>` — see CockpitTarget.tsx); nothing here is inferred from the DOM. */
export interface CockpitPanel {
  readonly id: string;
  readonly role: "primary" | "secondary" | "ticker";
  /** Lower sorts first — the panel placed before its same-role siblings when a role has more
   *  panels than regions. */
  readonly priority: number;
}

export interface CockpitAssignment {
  /** panelId -> regionId for every panel that got a region of its own. */
  readonly placements: ReadonlyMap<string, string>;
  /** panelIds that didn't fit any region of their role, in priority order — the overflow-tabs
   *  content, grouped under whichever region is passed as the overflow host. */
  readonly overflow: readonly string[];
}
