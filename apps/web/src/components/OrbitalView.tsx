import { useEffect, useState } from "react";
import { environment, type Body } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";

/**
 * Player request: "tell me if it's possible to use eyes.nasa.gov/apps/solar-system/ for the
 * orbital display directly into this trainer." Investigated directly (curled the page,
 * checked response headers, drove the app's own Share UI) rather than guessing:
 *
 * - No `X-Frame-Options`/CSP `frame-ancestors` header — embedding isn't blocked.
 * - The app's own Share panel has a real "Embed" tab with per-element visibility toggles,
 *   including "Show NASA logo". Toggling it off and reading the generated `<iframe>` code
 *   confirmed the real query parameter: `logo=false` — verified live (loaded that URL and
 *   checked the logo element was genuinely absent, not just hidden by CSS) that it actually
 *   removes the insignia from NASA's own rendered page, not a cross-origin CSS-cropping hack
 *   that couldn't reach into someone else's DOM anyway. That's what resolves brief rule 5
 *   ("no NASA logo, insignia, or 'meatball' anywhere") for this specific embed — confirmed
 *   with the player first, since attribution alone (crediting the source) does not: rule 5 is
 *   a trademark/insignia restriction, unrelated to rule 1's data-attribution requirement.
 * - `featured=false&detailPanel=false&search=false&menu=false&collapseSettingsOptions=true`
 *   (also read off the same real Embed panel, not guessed) strip the rest of NASA's own site
 *   chrome down to just the 3D view + its native drag/zoom camera controls, matching this
 *   console's own minimal-panel style.
 * - `#/mars` and `#/moon` are real, working routes on the same app (confirmed by loading each
 *   directly) — a live, camera-controllable, textured view of the actual body a Mars or Moon
 *   mission is on, with real labelled real mission markers (landers, orbiters) NASA's own
 *   telemetry places there.
 *
 * What this trades away, disclosed rather than silently dropped: this is NASA's own live,
 * real-time solar system view — it runs on the real current date/time and has no documented
 * postMessage API this page could reach through the iframe's cross-origin boundary to drive
 * it. The previous Three.js build's own real-orbital-period/1x-4x-16x sim-clock sync (and the
 * player's earlier explicit ask for it) is not something an embed of someone else's live app
 * can reproduce — so this view is intentionally independent of Sol Planning/Run the
 * sol/speed, not silently pretending to track it. The player confirmed this trade explicitly:
 * "don't need to make it offline available" (this is genuinely not — no network, no NASA
 * view) and accepted that, unlike the custom build, there's no way to pin a specific landing
 * site (the same real limitation the custom build already had).
 */
const EMBED_PARAMS =
  "logo=false&featured=false&detailPanel=false&search=false&menu=false&collapseSettingsOptions=true&interactPrompt=false";

const BODY_ROUTE: Record<Body, string> = {
  mars: "mars",
  moon: "moon",
};

export function OrbitalView() {
  const scenario = useRun((s) => s.scenario);
  const body: Body = scenario.body;
  // `reloadCount` is folded into the iframe's `key` below purely to force React to tear down
  // and recreate the <iframe> DOM node on "Reload view" — the one real lever this page has
  // over a cross-origin embed's own internal state (a WebGL context that failed to init, a
  // request that stalled) when there's no postMessage API to ask it to retry itself.
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const src = `https://eyes.nasa.gov/apps/solar-system/#/${BODY_ROUTE[body]}?${EMBED_PARAMS}`;

  // Every mount of this view is a fresh <iframe> — `App.tsx` only renders MissionCommandConsole
  // while that tab is active, so navigating away and back reloads NASA's own app from scratch
  // every time. That's the real reason the embed sometimes "takes too long": there is no
  // warm state to return to. Resetting `loaded` here (rather than leaving a stale `true` from
  // a previous body) is what makes the loading state below actually reappear on a body switch
  // or a manual reload, not just on first mount.
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const id = setTimeout(() => {
      setSlow(true);
    }, 6000);
    return () => {
      clearTimeout(id);
    };
  }, [src, reloadCount]);

  return (
    <section className="panel orbital-view" aria-labelledby="orbital-view-heading">
      <div className="panel-head-row">
        <h2 id="orbital-view-heading">Orbital display</h2>
        <span className="orbital-view-state">
          <span aria-hidden="true">●</span> LIVE, FROM NASA
        </span>
      </div>
      <p className="panel-hint">
        {body === "mars"
          ? "NASA's own real, live Eyes on the Solar System — the real Mars, right now, with real mission markers. Drag to look around; this runs on the real clock, independent of Sol Planning."
          : "NASA's own real, live Eyes on the Solar System — the real Moon, right now, with real mission markers. Drag to look around; this runs on the real clock, independent of Sol Planning."}
      </p>

      <div className="orbital-iframe-container">
        {!loaded && (
          <div className="orbital-loading-overlay" role="status">
            <span className="orbital-loading-spinner" aria-hidden="true" />
            <span>
              {slow
                ? "Still loading NASA's live 3D view — it can be slow on a weaker connection or device."
                : "Loading NASA's live 3D view…"}
            </span>
          </div>
        )}
        <iframe
          key={reloadCount}
          className="orbital-iframe"
          src={src}
          title={`NASA Eyes on the Solar System: ${body === "mars" ? "Mars" : "the Moon"}, live`}
          allowFullScreen
          onLoad={() => {
            setLoaded(true);
          }}
        />
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-tiny btn-quiet"
          onClick={() => {
            setReloadCount((n) => n + 1);
          }}
        >
          Reload view
        </button>
        <span className="panel-hint">
          Black screen or stuck loading? NASA's own 3D view can fail to start on some devices —
          reload it, or{" "}
          <a href={src} target="_blank" rel="noreferrer">
            open it directly in a new tab
          </a>
          .
        </span>
      </div>

      <table className="ripple-table">
        <caption className="visually-hidden">Real orbital periods, for reference</caption>
        <tbody>
          {body === "moon" ? (
            <tr>
              <th scope="row">Moon's real orbital period</th>
              <td>{environment.lunarSiderealOrbitalPeriodDays.value} days around Earth</td>
            </tr>
          ) : (
            <>
              <tr>
                <th scope="row">Earth's real orbital period</th>
                <td>{environment.earthOrbitalPeriodDays.value} days around the Sun</td>
              </tr>
              <tr>
                <th scope="row">Mars' real orbital period</th>
                <td>{environment.marsOrbitalPeriodDays.value} days around the Sun</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <p className="panel-hint">
        Not affiliated with or endorsed by NASA — this is a direct, unmodified embed of NASA's
        own public visualization at{" "}
        <a href="https://eyes.nasa.gov/apps/solar-system/" target="_blank" rel="noreferrer">
          eyes.nasa.gov/apps/solar-system
        </a>
        , with its own NASA logo switched off via that app's own documented embed option, not
        NASA-branded content this project made itself.
      </p>
    </section>
  );
}
