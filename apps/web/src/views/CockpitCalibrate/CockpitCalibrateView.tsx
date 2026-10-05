import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ScreenRegion } from "../../cockpit/types.js";
import { validateScreenMap } from "../../cockpit/validateScreenMap.js";

/**
 * M9.1's own "Calibration tool (build this first — it saves hours)": a dev-only route
 * (never shipped — see App.tsx's own `import.meta.env.DEV` gate around the dynamic import of
 * this file) for the lead developer to load a station photograph, drag/resize rectangles over
 * each real screen, label and role each one, and copy a `StationScreenMap` entry straight
 * into cockpit/screenMaps.ts. Every number this tool produces comes from the player's own
 * drag, not a guess — the opposite of how `moon-lifeSupport`'s own placeholder regions were
 * necessarily built (by direct pixel measurement — see screenMaps.ts's own disclosure —
 * since no real photograph exists yet to calibrate).
 */

const ROLES: readonly ScreenRegion["role"][] = ["primary", "secondary", "alert", "ticker"];

interface DraftRegion extends ScreenRegion {
  readonly localId: string;
}

let nextLocalId = 1;

export function CockpitCalibrateView() {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState("station-id");
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [regions, setRegions] = useState<DraftRegion[]>([]);
  const [drawing, setDrawing] = useState<{ startXPct: number; startYPct: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const imgWrapRef = useRef<HTMLDivElement | null>(null);

  const onFile = (file: File | undefined) => {
    if (file === undefined) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const base = file.name.replace(/\.[^.]+$/, "");
    setImageName(base);
    const probe = new Image();
    probe.onload = () => {
      setAspectRatio(probe.naturalWidth / probe.naturalHeight);
    };
    probe.src = url;
  };

  const pctFromEvent = (e: ReactPointerEvent): { xPct: number; yPct: number } => {
    const el = imgWrapRef.current;
    if (el === null) return { xPct: 0, yPct: 0 };
    const rect = el.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { xPct, yPct };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (imageUrl === undefined) return;
    const { xPct, yPct } = pctFromEvent(e);
    setDrawing({ startXPct: xPct, startYPct: yPct });
    setSelectedId(undefined);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (drawing === null) return;
    const { xPct, yPct } = pctFromEvent(e);
    setRegions((prev) => {
      const draftId = "__drawing__";
      const without = prev.filter((r) => r.localId !== draftId);
      const x = Math.min(drawing.startXPct, xPct);
      const y = Math.min(drawing.startYPct, yPct);
      const w = Math.abs(xPct - drawing.startXPct);
      const h = Math.abs(yPct - drawing.startYPct);
      if (w < 0.5 || h < 0.5) return without;
      return [
        ...without,
        { localId: draftId, id: draftId, role: "secondary", xPct: x, yPct: y, wPct: w, hPct: h, minPanelWidthPx: 100 },
      ];
    });
  };

  const onPointerUp = () => {
    if (drawing === null) return;
    setDrawing(null);
    setRegions((prev) => {
      const draft = prev.find((r) => r.localId === "__drawing__");
      if (draft === undefined) return prev;
      const id = `region-${nextLocalId++}`;
      const finalized: DraftRegion = { ...draft, localId: id, id };
      setSelectedId(id);
      return [...prev.filter((r) => r.localId !== "__drawing__"), finalized];
    });
  };

  const updateRegion = (localId: string, patch: Partial<DraftRegion>) => {
    setRegions((prev) => prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  };

  const removeRegion = (localId: string) => {
    setRegions((prev) => prev.filter((r) => r.localId !== localId));
  };

  const screenMap = {
    imageBase: imageName,
    aspectRatio,
    regions: regions.map(({ localId: _localId, ...rest }) => rest),
  };
  const issues = validateScreenMap(screenMap);

  const json = JSON.stringify(screenMap, null, 2);

  const copyJson = () => {
    navigator.clipboard
      .writeText(json)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => {
          setCopied(false);
        }, 1500);
      })
      .catch(() => {
        // Clipboard write can fail silently (permission, non-secure context); the JSON is
        // still visible to select/copy by hand below.
      });
  };

  return (
    <div className="console calibrate-console">
      <header className="view-head">
        <h2>Cockpit calibration (dev only)</h2>
        <p className="view-hint">
          Load a station photo, drag rectangles over each real screen, set role/id/minimum
          width, then copy the JSON into cockpit/screenMaps.ts. Not part of the shipped app.
        </p>
      </header>

      <section className="panel">
        <h2>1. Load an image</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
          }}
        />
        <label className="panel-hint" style={{ display: "block", marginTop: 8 }}>
          imageBase (used in the station's file name)
          <input
            type="text"
            value={imageName}
            onChange={(e) => {
              setImageName(e.target.value);
            }}
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
      </section>

      {imageUrl !== undefined && (
        <section className="panel">
          <h2>2. Drag a rectangle over each screen</h2>
          <div
            ref={imgWrapRef}
            style={{ position: "relative", width: "100%", aspectRatio, touchAction: "none", cursor: "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              src={imageUrl}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
            />
            {regions.map((r) => (
              <div
                key={r.localId}
                onClick={() => {
                  setSelectedId(r.localId);
                }}
                style={{
                  position: "absolute",
                  left: `${r.xPct}%`,
                  top: `${r.yPct}%`,
                  width: `${r.wPct}%`,
                  height: `${r.hPct}%`,
                  border: `2px solid ${r.localId === selectedId ? "#4ade80" : "#60a5fa"}`,
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {r.localId !== "__drawing__" && `${r.id} (${r.role})`}
              </div>
            ))}
          </div>
        </section>
      )}

      {regions.filter((r) => r.localId !== "__drawing__").length > 0 && (
        <section className="panel">
          <h2>3. Label each region</h2>
          <ul className="status-list">
            {regions
              .filter((r) => r.localId !== "__drawing__")
              .map((r) => (
                <li key={r.localId} className={r.localId === selectedId ? "is-nominal" : undefined}>
                  <span className="button-row">
                    <input
                      type="text"
                      value={r.id}
                      onChange={(e) => {
                        updateRegion(r.localId, { id: e.target.value });
                      }}
                      style={{ width: 110 }}
                    />
                    <select
                      value={r.role}
                      onChange={(e) => {
                        updateRegion(r.localId, { role: e.target.value as ScreenRegion["role"] });
                      }}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={r.minPanelWidthPx}
                      onChange={(e) => {
                        updateRegion(r.localId, { minPanelWidthPx: Number(e.target.value) || 0 });
                      }}
                      style={{ width: 80 }}
                      title="minPanelWidthPx"
                    />
                    <button
                      type="button"
                      className="btn btn-tiny"
                      onClick={() => {
                        removeRegion(r.localId);
                      }}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>4. Validation</h2>
        {issues.length === 0 ? (
          <p className="panel-hint">No issues.</p>
        ) : (
          <ul className="status-list">
            {issues.map((issue, i) => (
              <li key={i} className="is-caution">
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head-row">
          <h2>5. Copy JSON</h2>
          <button type="button" className="btn btn-tiny" onClick={copyJson}>
            {copied ? "Copied!" : "Copy JSON"}
          </button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{json}</pre>
      </section>
    </div>
  );
}
