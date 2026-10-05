import { forwardRef } from "react";
import type { ScreenRegion } from "./types.js";

/**
 * One region's visual chrome: dark screen backing, inset shadow, a thin bezel glow, subtle
 * corner rounding — the "Screen styling" section of M9.1. Content taller than the region
 * scrolls within it (the page itself never scrolls sideways); text keeps the app's own
 * existing monospace-telemetry/status styling (`.panel`'s own descendant rules already give
 * gauges, buttons and tables that look — this wrapper only changes the frame around them, the
 * Reality Dial and every control inside stays exactly as Classic view renders it).
 *
 * Content arrives via a portal (CockpitTarget.tsx) into the ref'd inner div — `CockpitScreen`
 * itself renders no children of its own, only the frame, positioned absolutely within the
 * photo at the region's own percentage bounds.
 *
 * Scanlines/glow-pulse are opt-in per region (the `alert` role only, by default) and CSS-gated
 * by both `prefers-reduced-motion` and the manual low-power-mode class (styles.css), same as
 * every other effect in this app.
 */
export const CockpitScreen = forwardRef<HTMLDivElement, { readonly region: ScreenRegion }>(
  function CockpitScreen({ region }, ref) {
    return (
      <div
        className={`cockpit-screen cockpit-screen-${region.role}`}
        style={{
          position: "absolute",
          left: `${region.xPct}%`,
          top: `${region.yPct}%`,
          width: `${region.wPct}%`,
          height: `${region.hPct}%`,
          transform: region.rotateDeg ? `rotate(${region.rotateDeg}deg)` : undefined,
        }}
      >
        <div ref={ref} className="cockpit-screen-content" />
      </div>
    );
  },
);
