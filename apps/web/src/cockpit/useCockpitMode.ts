import { useEffect, useState } from "react";
import { useAccessibility } from "../store/accessibility.js";

const STORAGE_KEY = "sol-keeper.cockpitView";
/** M9.1's own responsive rule: "< 1024px: Classic view ... Do not attempt the cockpit on
 *  phones." 1024–1279px still gets cockpit, just with ticker/low-priority regions dropped
 *  (StationCockpit.tsx's own minPanelWidthPx filtering handles that half). */
const MIN_COCKPIT_WIDTH_PX = 1024;

export type CockpitPreference = "cockpit" | "classic";

/** The player's own saved choice — defaults to Cockpit on desktop, Classic on a narrow
 *  viewport at first load (M9.1's own default), read once and remembered after that. */
function readStoredPreference(): CockpitPreference | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "cockpit" || raw === "classic" ? raw : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredPreference(pref: CockpitPreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage blocked (private window): the choice still holds for this page view.
  }
}

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MIN_COCKPIT_WIDTH_PX,
  );
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MIN_COCKPIT_WIDTH_PX - 1}px)`);
    const sync = () => {
      setNarrow(query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);
  return narrow;
}

export interface CockpitModeResult {
  /** The player's own stored preference, independent of whether it's honoured right now. */
  readonly preference: CockpitPreference;
  readonly setPreference: (pref: CockpitPreference) => void;
  /** Whether cockpit rendering should actually happen this render — `preference` folded
   *  together with every hard fallback rule (M9.1's own rule 2): narrow viewport, low-power
   *  mode, no screen map for this station, or (passed in by the caller) the image failed to
   *  load. */
  readonly active: boolean;
  /** Why `active` is false, for the toggle button's own disabled-state label — `undefined`
   *  when `active` is true or the player simply chose Classic themselves. */
  readonly fallbackReason: "narrow" | "low-power" | "no-screen-map" | "image-failed" | undefined;
}

export function useCockpitMode(hasScreenMap: boolean, imageFailed: boolean): CockpitModeResult {
  const [preference, setPreferenceState] = useState<CockpitPreference>(() => {
    const stored = readStoredPreference();
    if (stored !== undefined) return stored;
    // First-ever visit: default to Cockpit on desktop, Classic on a narrow viewport —
    // M9.1's own stated default, not yet saved until the player actually touches the toggle.
    return typeof window !== "undefined" && window.innerWidth < MIN_COCKPIT_WIDTH_PX
      ? "classic"
      : "cockpit";
  });
  const narrow = useNarrowViewport();
  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);

  const setPreference = (pref: CockpitPreference): void => {
    setPreferenceState(pref);
    writeStoredPreference(pref);
  };

  const fallbackReason: CockpitModeResult["fallbackReason"] = !hasScreenMap
    ? "no-screen-map"
    : imageFailed
      ? "image-failed"
      : lowPowerMode
        ? "low-power"
        : narrow
          ? "narrow"
          : undefined;

  const active = preference === "cockpit" && fallbackReason === undefined;

  return { preference, setPreference, active, fallbackReason };
}
