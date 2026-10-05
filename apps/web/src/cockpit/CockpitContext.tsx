import { createContext, useContext } from "react";
import type { CockpitPanel } from "./types.js";

/** Set by StationCockpit.tsx while cockpit mode is active; absent (`null`, the default)
 *  outside a StationCockpit entirely, or when that console has no screen map / is showing
 *  Classic view — so CockpitTarget.tsx can tell "not in cockpit view at all" apart from "in
 *  cockpit view, this panel has no region yet (assignment hasn't run)". */
export interface CockpitApi {
  readonly register: (panel: CockpitPanel) => void;
  readonly unregister: (id: string) => void;
  /** `null` = no region assigned yet (or this panel overflowed with nowhere to go — should
   *  not happen once overflow tabs exist, but CockpitTarget renders nothing rather than
   *  throwing if it does). An `HTMLElement` = portal `children` there. */
  readonly regionFor: (panelId: string) => HTMLElement | null;
}

export const CockpitContext = createContext<CockpitApi | null>(null);

export function useCockpitApi(): CockpitApi | null {
  return useContext(CockpitContext);
}
