import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRun } from "../store/run.js";
import { TREK_LAYERS } from "../map/trekLayers.js";

/**
 * The landing-site map (M6, folded into Briefing wholesale at M8.6 — see BriefingView.tsx).
 * Tile URLs, zoom range and attribution all come from map/trekLayers.ts, itself a direct
 * copy of the two rows in docs/trek_layers.md marked Status "tested" — nothing here
 * constructs or guesses a tile URL.
 *
 * Both Trek layers are equirectangular (2:1 at zoom 0, not Web Mercator), so the map must
 * use L.CRS.EPSG4326 or the tiles misalign — this is the one thing about this component
 * that isn't optional configuration, it's a correctness requirement docs/trek_layers.md
 * calls out explicitly.
 *
 * A viewer for the current scenario's real, fixed site, not an interactive picker: the
 * brief's own interactive landing-site picker is M9's job (mission setup flow), not this
 * read-only Briefing screen's.
 *
 * Leaflet's *JS* is imported dynamically inside the effect, not at module scope: its own
 * module touches `window` on load (checked by hitting a real `ReferenceError: window is
 * not defined` from apps/web/tests/render.test.tsx, which renders the whole App tree
 * through react-dom/server in Node), and a static import would break every render test
 * that reaches this component. The stylesheet has no such problem and stays a normal
 * static import.
 */
export function LandingSiteMap() {
  const scenario = useRun((s) => s.scenario);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: LeafletMap | undefined;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const layer = TREK_LAYERS[scenario.body];
      map = L.map(containerRef.current, {
        crs: L.CRS.EPSG4326,
        center: [scenario.site.latDeg, scenario.site.lonDeg],
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
      // a bundler without extra configuration, and a circle needs none of that.
      L.circleMarker([scenario.site.latDeg, scenario.site.lonDeg], {
        radius: 8,
        color: "#f87171",
        weight: 2,
        fillColor: "#f87171",
        fillOpacity: 0.5,
      })
        .addTo(map)
        .bindPopup(`${scenario.site.name}<br>${scenario.site.latDeg}°, ${scenario.site.lonDeg}°`);

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
    // Re-run only when the scenario (and so the body/site) actually changes, not on every
    // simulated hour — this is a structural view of the mission site, not a live layer.
  }, [scenario.body, scenario.site.latDeg, scenario.site.lonDeg, scenario.site.name]);

  return (
    <>
      {/* A plain container, not role="img": Leaflet renders real interactive controls
          (zoom buttons, keyboard-pannable tiles) inside it, and role="img" would tell
          assistive tech to treat all of that as a single static picture and hide it. The
          coordinates and attribution below are the accessible textual equivalent. */}
      <div ref={containerRef} className="trek-map" aria-label={`Interactive map of ${scenario.site.name}`} />
      <p className="panel-hint">
        {scenario.site.latDeg}°, {scenario.site.lonDeg}° · {TREK_LAYERS[scenario.body].attribution}
      </p>
    </>
  );
}
