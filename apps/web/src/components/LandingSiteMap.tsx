import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Body } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { TREK_LAYERS } from "../map/trekLayers.js";

export interface MapMarker {
  readonly id: string;
  readonly name: string;
  readonly latDeg: number;
  readonly lonDeg: number;
}

interface LandingSiteMapProps {
  /** M9.2b: when given, renders every one of these as a real, clickable marker instead of
   *  the current mission's single fixed site — the setup flow's own landing-site picker.
   *  `body` is required alongside it (Setup has no running mission yet to read a body from);
   *  ignored in the default single-site mode, which reads `scenario.body` as it always has. */
  readonly sites?: readonly MapMarker[];
  readonly selectedId?: string | undefined;
  readonly onSelect?: (id: string) => void;
  readonly body?: Body;
}

/**
 * The landing-site map (M6, folded into Briefing wholesale at M8.6 — see BriefingView.tsx;
 * M9.2b extends it for the setup flow's own multi-site picker, additively — every prop is
 * optional, and with none given this is exactly the single-fixed-site viewer it always was).
 * Tile URLs, zoom range and attribution all come from map/trekLayers.ts, itself a direct
 * copy of the two rows in docs/trek_layers.md marked Status "tested" — nothing here
 * constructs or guesses a tile URL.
 *
 * Both Trek layers are equirectangular (2:1 at zoom 0, not Web Mercator), so the map must
 * use L.CRS.EPSG4326 or the tiles misalign — this is the one thing about this component
 * that isn't optional configuration, it's a correctness requirement docs/trek_layers.md
 * calls out explicitly.
 *
 * Leaflet's *JS* is imported dynamically inside the effect, not at module scope: its own
 * module touches `window` on load (checked by hitting a real `ReferenceError: window is
 * not defined` from apps/web/tests/render.test.tsx, which renders the whole App tree
 * through react-dom/server in Node), and a static import would break every render test
 * that reaches this component. The stylesheet has no such problem and stays a normal
 * static import.
 */
export function LandingSiteMap({ sites, selectedId, onSelect, body }: LandingSiteMapProps) {
  const scenario = useRun((s) => s.scenario);
  const effectiveBody = body ?? scenario.body;
  const markers: readonly MapMarker[] =
    sites ?? [{ id: scenario.id, name: scenario.site.name, latDeg: scenario.site.latDeg, lonDeg: scenario.site.lonDeg }];
  const centerMarker = markers.find((m) => m.id === selectedId) ?? markers[0];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || centerMarker === undefined) return;
    let cancelled = false;
    let map: LeafletMap | undefined;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const layer = TREK_LAYERS[effectiveBody];
      map = L.map(containerRef.current, {
        crs: L.CRS.EPSG4326,
        center: [centerMarker.latDeg, centerMarker.lonDeg],
        zoom: 3,
        minZoom: 0,
        maxZoom: layer.maxNativeZoom + 2, // allow a little upscaling past native detail
        attributionControl: true,
      });

      L.tileLayer(layer.urlTemplate, {
        tileSize: layer.tileSize,
        maxNativeZoom: layer.maxNativeZoom,
        maxZoom: layer.maxNativeZoom + 2,
        noWrap: true,
        attribution: layer.attribution,
      }).addTo(map);

      // A plain circle marker, not the default pin icon — Leaflet's default icon
      // references image assets by a relative path that does not resolve correctly under
      // a bundler without extra configuration, and a circle needs none of that. The
      // selected/current site is styled distinctly (colour + a wider ring, never colour
      // alone — brief rule 6): every other marker's own bound popup names it in text too,
      // so the distinction is never carried by colour alone even before a click.
      for (const marker of markers) {
        const isSelected = marker.id === centerMarker.id;
        L.circleMarker([marker.latDeg, marker.lonDeg], {
          radius: isSelected ? 10 : 7,
          color: isSelected ? "#f87171" : "#60a5fa",
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? "#f87171" : "#60a5fa",
          fillOpacity: isSelected ? 0.6 : 0.35,
        })
          .addTo(map)
          .bindPopup(`${isSelected ? "Selected: " : ""}${marker.name}<br>${marker.latDeg}°, ${marker.lonDeg}°`)
          .on("click", () => {
            onSelectRef.current?.(marker.id);
          });
      }

      // Leaflet measures the container synchronously at construction time. Right after a
      // dynamic import resolves, the browser hasn't necessarily run a fresh layout pass on
      // a container that only just became part of the DOM, so Leaflet can cache the wrong
      // size and misplace every tile — found by inspecting a real tile's own
      // getBoundingClientRect() sitting well outside the container's visible bounds, not
      // by guessing. requestAnimationFrame defers this one frame, after which the
      // container's real, laid-out size is what Leaflet re-measures against.
      requestAnimationFrame(() => {
        if (!cancelled) map?.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
    // Re-run when the body, the marker set, or the selection changes — not on every
    // simulated hour, this is a structural view of the site(s), not a live layer. The
    // marker set is reduced to a stable string key rather than compared by reference,
    // since callers (LandingSiteStep) may pass a freshly-mapped array each render.
  }, [effectiveBody, markers.map((m) => `${m.id}:${m.latDeg}:${m.lonDeg}`).join("|"), centerMarker?.id]);

  if (centerMarker === undefined) return null;

  return (
    <>
      {/* A plain container, not role="img": Leaflet renders real interactive controls
          (zoom buttons, keyboard-pannable tiles) inside it, and role="img" would tell
          assistive tech to treat all of that as a single static picture and hide it. The
          coordinates and attribution below are the accessible textual equivalent. */}
      <div ref={containerRef} className="trek-map" aria-label={`Interactive map of ${centerMarker.name}`} />
      <p className="panel-hint">
        {centerMarker.latDeg}°, {centerMarker.lonDeg}° · {TREK_LAYERS[effectiveBody].attribution}
      </p>
    </>
  );
}
