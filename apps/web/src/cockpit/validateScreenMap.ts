import type { ScreenRegion, StationScreenMap } from "./types.js";

export interface ScreenMapIssue {
  readonly message: string;
}

function overlapAreaPct(a: ScreenRegion, b: ScreenRegion): number {
  const left = Math.max(a.xPct, b.xPct);
  const right = Math.min(a.xPct + a.wPct, b.xPct + b.wPct);
  const top = Math.max(a.yPct, b.yPct);
  const bottom = Math.min(a.yPct + a.hPct, b.yPct + b.hPct);
  if (right <= left || bottom <= top) return 0;
  const overlap = (right - left) * (bottom - top);
  const smaller = Math.min(a.wPct * a.hPct, b.wPct * b.hPct);
  return smaller <= 0 ? 0 : (overlap / smaller) * 100;
}

/** M9.1's own required test: "every region within 0-100%, no overlaps beyond 2%, every
 *  station has at least one 'alert' and one 'primary' region." Pure and synchronous — run
 *  directly in a Vitest test over every entry in SCREEN_MAPS, and reusable by the
 *  calibration tool to warn the lead developer live while they drag regions. */
export function validateScreenMap(map: StationScreenMap): ScreenMapIssue[] {
  const issues: ScreenMapIssue[] = [];
  const ids = new Set<string>();

  for (const region of map.regions) {
    if (ids.has(region.id)) issues.push({ message: `duplicate region id "${region.id}"` });
    ids.add(region.id);

    if (
      region.xPct < 0 ||
      region.yPct < 0 ||
      region.xPct + region.wPct > 100 ||
      region.yPct + region.hPct > 100
    ) {
      issues.push({ message: `region "${region.id}" extends outside the image (0-100%)` });
    }
    if (region.wPct <= 0 || region.hPct <= 0) {
      issues.push({ message: `region "${region.id}" has zero or negative size` });
    }
  }

  for (let i = 0; i < map.regions.length; i++) {
    for (let j = i + 1; j < map.regions.length; j++) {
      const a = map.regions[i];
      const b = map.regions[j];
      if (a === undefined || b === undefined) continue;
      const pct = overlapAreaPct(a, b);
      if (pct > 2) {
        issues.push({
          message: `"${a.id}" and "${b.id}" overlap by ${pct.toFixed(1)}% (over the 2% allowance)`,
        });
      }
    }
  }

  if (!map.regions.some((r) => r.role === "alert")) {
    issues.push({ message: "no 'alert' region — every station needs one" });
  }
  if (!map.regions.some((r) => r.role === "primary")) {
    issues.push({ message: "no 'primary' region — every station needs one" });
  }

  return issues;
}
