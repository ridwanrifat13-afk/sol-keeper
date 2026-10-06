import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { assignPanelsToRegions } from "./assignPanels.js";
import { CockpitContext, type CockpitApi } from "./CockpitContext.js";
import { CockpitScreen } from "./CockpitScreen.js";
import { CockpitTicker, TICKER_METRICS } from "./CockpitTicker.js";
import { OverflowTabs } from "./OverflowTabs.js";
import { getScreenMap } from "./screenMaps.js";
import { stationImageSources } from "./stationImage.js";
import { useCockpitMode } from "./useCockpitMode.js";
import type { Body, CockpitPanel, StationKey } from "./types.js";

const FALLBACK_REASON_TEXT: Record<
  NonNullable<ReturnType<typeof useCockpitMode>["fallbackReason"]>,
  string
> = {
  narrow: "Cockpit view needs a wider screen (1024px+).",
  "low-power": "Cockpit view is off while low-power mode is on.",
  "no-screen-map": "No calibrated photo for this station yet.",
  "image-failed": "The station photo failed to load.",
};

/**
 * M9.1 — renders `children` (an existing console, unmodified) either plainly (Classic) or
 * inside the matching station photo's own screen regions (Cockpit), toggled per the brief's
 * own rule 2: strictly additive and reversible, with Classic as the guaranteed fallback.
 *
 * `alertContent` is the one piece of cockpit-only UI this file asks its caller for — a small,
 * station-specific "most critical gauge" summary (the brief's own default for the `alert`
 * region when no Decision Card is pending). Everything else on screen is the console's own
 * real panels, re-parented via CockpitTarget, never duplicated or rewritten.
 */
export function StationCockpit({
  body,
  station,
  alertContent,
  children,
}: {
  readonly body: Body;
  readonly station: StationKey;
  readonly alertContent: ReactNode;
  readonly children: ReactNode;
}) {
  const screenMap = getScreenMap(body, station);
  const [imageFailed, setImageFailed] = useState(false);
  const { preference, setPreference, active, fallbackReason } = useCockpitMode(
    screenMap !== undefined,
    imageFailed,
  );

  // Player request: the sidebar nav should float on top of the cockpit photo (true
  // corner-to-corner), not reserve its own column that shrinks the frame. CSS alone can't
  // react to "is a StationCockpit currently active" — only one is ever mounted at a time
  // (App.tsx renders at most one station view), so a single class on <html> is enough, no
  // store or context needed. Mirrors this codebase's own established pattern for view-driven
  // document-level state (compare App.tsx's removed data-station-bg effect, same idea).
  useEffect(() => {
    document.documentElement.classList.toggle("cockpit-active", active);
    return () => {
      document.documentElement.classList.remove("cockpit-active");
    };
  }, [active]);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  useLayoutEffect(() => {
    if (!active) return;
    const el = frameRef.current;
    if (el === null) return;
    const measure = () => {
      setFrameWidth(el.getBoundingClientRect().width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [active]);

  const [registry, setRegistry] = useState<ReadonlyMap<string, CockpitPanel>>(new Map());
  const register = useCallback((panel: CockpitPanel) => {
    setRegistry((prev) => {
      const existing = prev.get(panel.id);
      if (existing?.role === panel.role && existing.priority === panel.priority) return prev;
      const next = new Map(prev);
      next.set(panel.id, panel);
      return next;
    });
  }, []);
  const unregister = useCallback((id: string) => {
    setRegistry((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // One "nudge" to re-render after refs (region nodes, overflow slot nodes) have mounted —
  // regionFor() reads plain refs, which only exist after the commit that created them, one
  // render after the region/slot elements themselves first appear.
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const regionNodes = useRef<Record<string, HTMLDivElement | null>>({});
  const overflowSlotNodes = useRef<Record<string, HTMLDivElement | null>>({});

  // Stable (never-changing-identity) ref callbacks, one per id, cached here rather than
  // created inline in JSX — an inline `ref={(el) => ...}` arrow gets a *new* function identity
  // every render, which makes React detach and reattach the ref (null, then the element) on
  // every single render; since that attach call itself triggered `bump()`, the result was an
  // infinite detach/attach/bump loop (confirmed directly: React error #185, "maximum update
  // depth exceeded", the very first time this screen actually rendered in a browser).
  const regionRefCallbacks = useRef<Record<string, (el: HTMLDivElement | null) => void>>({});
  const getRegionRef = useCallback((id: string) => {
    return (regionRefCallbacks.current[id] ??= (el: HTMLDivElement | null) => {
      if (regionNodes.current[id] === el) return;
      regionNodes.current[id] = el;
      bump();
    });
  }, []);
  const overflowSlotRefCallbacks = useRef<Record<string, (el: HTMLDivElement | null) => void>>({});
  const getOverflowSlotRef = useCallback((id: string) => {
    return (overflowSlotRefCallbacks.current[id] ??= (el: HTMLDivElement | null) => {
      if (overflowSlotNodes.current[id] === el) return;
      overflowSlotNodes.current[id] = el;
      bump();
    });
  }, []);

  const nonAlertRegions = useMemo(
    () => (screenMap ? screenMap.regions.filter((r) => r.role !== "alert") : []),
    [screenMap],
  );
  const alertRegion = screenMap?.regions.find((r) => r.role === "alert");
  // The brief's own overflow rule ("the lowest-priority regions get a tabbed container"):
  // the last secondary region in the map's own declared order is reserved as the overflow
  // host instead of taking a panel directly, so there is always somewhere for the panels a
  // small screen can't fit on its own to go.
  const secondaryRegions = nonAlertRegions.filter((r) => r.role === "secondary");
  const overflowHost = secondaryRegions[secondaryRegions.length - 1];
  // Ticker regions don't take a registered console panel at all (CockpitTicker.tsx's own
  // doc comment) — excluded from the generic assignment pool the same way the alert region
  // is, and rendered directly below instead.
  const tickerRegions = nonAlertRegions.filter((r) => r.role === "ticker");
  const assignableRegions = useMemo(
    () =>
      nonAlertRegions.filter(
        (r) => r.role !== "ticker" && (overflowHost === undefined || r.id !== overflowHost.id),
      ),
    [nonAlertRegions, overflowHost],
  );

  const panels = useMemo(() => [...registry.values()], [registry]);
  const assignment = useMemo(
    () => assignPanelsToRegions(panels, assignableRegions, frameWidth || 1200),
    [panels, assignableRegions, frameWidth],
  );

  const regionFor = useCallback(
    (panelId: string): HTMLElement | null => {
      const regionId = assignment.placements.get(panelId);
      if (regionId !== undefined) return regionNodes.current[regionId] ?? null;
      if (assignment.overflow.includes(panelId)) return overflowSlotNodes.current[panelId] ?? null;
      return null;
    },
    [assignment],
  );

  const api: CockpitApi = useMemo(
    () => ({ register, unregister, regionFor }),
    [register, unregister, regionFor],
  );

  const toggle = screenMap !== undefined && (
    <div className="cockpit-toggle" role="group" aria-label="View style">
      <button
        type="button"
        className={`btn btn-tiny ${preference === "cockpit" ? "btn-active" : ""}`}
        aria-pressed={preference === "cockpit"}
        onClick={() => {
          setPreference("cockpit");
        }}
      >
        Cockpit
      </button>
      <button
        type="button"
        className={`btn btn-tiny ${preference === "classic" ? "btn-active" : ""}`}
        aria-pressed={preference === "classic"}
        onClick={() => {
          setPreference("classic");
        }}
      >
        Classic
      </button>
      {fallbackReason !== undefined && preference === "cockpit" && (
        <span className="cockpit-fallback-note">{FALLBACK_REASON_TEXT[fallbackReason]}</span>
      )}
    </div>
  );

  if (!active || screenMap === undefined) {
    return (
      <div className="station-cockpit-shell">
        {toggle}
        {children}
      </div>
    );
  }

  const overflowTabs = assignment.overflow.map((id) => ({
    id,
    label: registry.get(id)?.label ?? id,
  }));
  const sources = stationImageSources(screenMap.imageBase);
  const sizes = "(min-width: 1280px) 1280px, 100vw";

  return (
    <div className="station-cockpit-shell">
      {toggle}
      <div ref={frameRef} className="cockpit-frame">
        <picture>
          <source type="image/avif" srcSet={sources.avifSrcSet} sizes={sizes} />
          <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sizes} />
          <img
            className="cockpit-frame-img"
            src={sources.fallbackSrc}
            srcSet={sources.jpegSrcSet}
            sizes={sizes}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={() => {
              setImageFailed(true);
            }}
            onLoad={bump}
          />
        </picture>
        {alertRegion && <CockpitScreen region={alertRegion} ref={getRegionRef(alertRegion.id)} />}
        {assignableRegions.map((region) => (
          <CockpitScreen key={region.id} region={region} ref={getRegionRef(region.id)} />
        ))}
        {tickerRegions.map((region) => (
          <CockpitScreen key={region.id} region={region} ref={getRegionRef(region.id)} />
        ))}
        {overflowHost && overflowTabs.length > 0 && (
          <div
            className="cockpit-screen cockpit-screen-overflow-host"
            style={{
              position: "absolute",
              left: `${overflowHost.xPct}%`,
              top: `${overflowHost.yPct}%`,
              width: `${overflowHost.wPct}%`,
              height: `${overflowHost.hPct}%`,
            }}
          >
            <OverflowTabs tabs={overflowTabs} slot={(id) => <div ref={getOverflowSlotRef(id)} />} />
          </div>
        )}
      </div>
      {/* The alert region's own content isn't a registered/portaled panel — it's rendered
         directly here, inside the DOM node CockpitScreen already gave it. */}
      {/* The alert region's content isn't part of the generic assignment pool (the brief's
         own rule makes it state-dependent, not a static per-panel property — see this
         component's own doc comment) — portaled directly here instead of via CockpitTarget. */}
      {alertRegion &&
        regionNodes.current[alertRegion.id] &&
        createPortal(alertContent, regionNodes.current[alertRegion.id] as HTMLElement)}
      {/* Ticker regions cycle through TICKER_METRICS in the screen map's own declared order —
         see CockpitTicker.tsx's own doc comment for why this isn't a registered panel. */}
      {tickerRegions.map((region, i) => {
        const node = regionNodes.current[region.id];
        if (!node) return null;
        const metric = TICKER_METRICS[i % TICKER_METRICS.length];
        if (metric === undefined) return null;
        return createPortal(<CockpitTicker metric={metric} />, node, region.id);
      })}
      {/* The console still renders here, fully mounted (so its state, gauges and every
         useRun/useDial subscription keep ticking) — just visually hidden, since whichever of
         its panels CockpitTarget could place have already portaled out into the regions
         above. What's left in this hidden copy is either chrome made redundant by the photo
         (section headings, the Resources panel's now-empty gauge-grid wrapper) or a panel
         with nowhere to go yet, which CockpitTarget already rendered as nothing rather than
         show twice. */}
      <div className="station-cockpit-classic-source" aria-hidden="true">
        <CockpitContext.Provider value={api}>{children}</CockpitContext.Provider>
      </div>
    </div>
  );
}
