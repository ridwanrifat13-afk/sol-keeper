import { useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCockpitApi } from "./CockpitContext.js";
import type { CockpitPanel } from "./types.js";

/**
 * Wraps one existing panel so StationCockpit.tsx can show it inside a console photo's screen
 * region, without that panel's own JSX changing at all (M9.1's "re-parented, not rewritten").
 *
 * In Classic view (no CockpitContext ancestor — outside a StationCockpit, or that console has
 * no screen map / cockpit mode is off): renders `children` exactly in place, a plain
 * passthrough. Classic view's DOM is byte-identical to before this wrapper existed —
 * DashboardGrid's masonry packing and drag-to-reorder both still see the same direct children
 * they always did.
 *
 * In Cockpit view: registers `{ id, role, priority }` with the nearest StationCockpit (the
 * only input its generic assignment algorithm needs), then portals `children` into whatever
 * DOM node that panel resolved to — a region on the photo, a hidden overflow-tab slot, or
 * nothing yet (first paint, before assignment has run).
 */
export function CockpitTarget({
  id,
  role,
  priority,
  children,
}: {
  readonly id: string;
  readonly role: CockpitPanel["role"];
  readonly priority: number;
  readonly children: ReactNode;
}) {
  const api = useCockpitApi();

  const register = api?.register;
  const unregister = api?.unregister;
  useLayoutEffect(() => {
    if (register === undefined || unregister === undefined) return;
    register({ id, role, priority });
    return () => {
      unregister(id);
    };
    // `register`/`unregister` are stable (StationCockpit.tsx wraps them in useCallback with
    // no deps) — depending on them directly, not the whole `api` object, means this effect
    // only re-runs when the panel's own declared metadata changes, not every time the
    // assignment (and so `api.regionFor`'s closure) recomputes.
  }, [register, unregister, id, role, priority]);

  if (api === null) return <>{children}</>;
  const target = api.regionFor(id);
  if (target === null) return null;
  return createPortal(children, target);
}
