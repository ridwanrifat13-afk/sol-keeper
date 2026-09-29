import { environment, type Body } from "@sol-keeper/sim";
import { SPEEDS, useRun } from "../store/run.js";
import { Starfield } from "./Starfield.js";

/**
 * Player request: "a 3d model like eyes.nasa.gov... to show moon/mars orbiting when the sol
 * is ran, stop when the sol is paused, speed up when the sol is ran 4x/16x."
 *
 * Not a WebGL/Three.js globe: `docs/M10_PLAN.md`'s own decision on NASA's real "Eyes on the
 * Solar System" (an embed, rejected — third-party NASA/JPL branding violates brief rule 5,
 * uncacheable for offline, not original art) already settled this project on "SVG first,
 * escalate only if the SVG version's FPS genuinely struggles" — a WebGL library would be a new
 * dependency CLAUDE.md requires asking about first, and the same reasoning applies here as it
 * did to the establishing shot. This is that same compliant, original SVG scene, extended
 * with real motion instead of a static schematic.
 *
 * What's real: the orbital *periods* (environment.lunarSiderealOrbitalPeriodDays/
 * earthOrbitalPeriodDays/marsOrbitalPeriodDays, all NSSDC-FACTS) and their ratios to each
 * other. What's tuned (disclosed below, not a `packages/sim` constant — this never touches a
 * simulated number, so it carries no SIM_VERSION weight): the ABSOLUTE on-screen pace. A
 * literal real-time scale-down using the same ms-per-simulated-hour the sim clock itself uses
 * (store/run.ts's SPEEDS) would take the Moon ~13 minutes per revolution at 1x and Mars nearly
 * half an hour even at 16x — physically honest but nothing a player would ever see complete.
 * `BASE_FAST_ORBIT_SECONDS` fixes how long the scene's *fastest* real body takes to complete
 * one revolution at the 16x ("fast") setting to something actually watchable; every other
 * body and every other speed is then scaled off that one number by the bodies' own real period
 * ratio and by the sim's own real SPEEDS ratio — so "Mars takes ~1.9x longer than Earth" and
 * "4x is exactly 4x the rate of 1x" both stay true to real, sourced numbers, only the single
 * anchor pace itself is a presentation choice.
 */
const BASE_FAST_ORBIT_SECONDS = 20;

const SUN_COLOR = "#ffcf6b";
const EARTH_COLOR = "#2a6fdb";
const MARS_COLOR = "#c1440e";
const MOON_COLOR = "#aab0bd";

/** Real ms per simulated hour → real ms per simulated day, for scaling orbital periods
 *  (days) against the same compression ratio the mission clock itself already uses. */
function fastOrbitDurationMs(periodDays: number, referencePeriodDays: number): number {
  return (periodDays / referencePeriodDays) * BASE_FAST_ORBIT_SECONDS * 1000;
}

export function OrbitalView() {
  const scenario = useRun((s) => s.scenario);
  const speed = useRun((s) => s.speed);
  const phase = useRun((s) => s.phase);
  const status = useRun((s) => s.state.status);
  const body: Body = scenario.body;

  const isAnimating = status === "running" && phase === "running" && speed !== "paused";
  const playState: "running" | "paused" = isAnimating ? "running" : "paused";
  // SPEEDS.fast is the fastest real rate (smallest ms-per-hour); every duration below is
  // anchored to it, then scaled up for a slower speed by the same real ratio store/run.ts's
  // own setInterval already uses to advance the clock itself.
  const speedRatio = SPEEDS[speed === "paused" ? "fast" : speed] / SPEEDS.fast;

  const moonDurationMs = fastOrbitDurationMs(
    environment.lunarSiderealOrbitalPeriodDays.value,
    environment.lunarSiderealOrbitalPeriodDays.value,
  ) * speedRatio;
  const earthDurationMs =
    fastOrbitDurationMs(environment.earthOrbitalPeriodDays.value, environment.earthOrbitalPeriodDays.value) *
    speedRatio;
  const marsDurationMs =
    fastOrbitDurationMs(environment.marsOrbitalPeriodDays.value, environment.earthOrbitalPeriodDays.value) *
    speedRatio;

  const stateWord = isAnimating ? `orbiting at ${speed === "fast" ? "16x" : speed === "normal" ? "4x" : "1x"}` : "stopped";

  return (
    <section className="panel orbital-view" aria-labelledby="orbital-view-heading">
      <div className="panel-head-row">
        <h2 id="orbital-view-heading">Orbital display</h2>
        <span className="orbital-view-state">{isAnimating ? "● " : "○ "}{stateWord.toUpperCase()}</span>
      </div>
      <p className="panel-hint">
        {body === "moon"
          ? "The Moon's real orbit around Earth — moves with the clock: stopped in Sol Planning, faster at 4x/16x."
          : "Earth and Mars' real orbits around the Sun — moves with the clock: stopped in Sol Planning, faster at 4x/16x."}
      </p>

      <svg
        className="orbital-svg"
        viewBox="0 0 400 200"
        role="img"
        aria-label={`${
          body === "moon" ? "The Moon orbiting Earth" : "Earth and Mars orbiting the Sun"
        }, currently ${stateWord}. A full text version follows below.`}
      >
        <Starfield count={50} className="orbital-stars" />

        {body === "moon" ? (
          <>
            <circle cx="200" cy="100" r="72" fill="none" stroke="#3a4568" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="200" cy="100" r="16" fill={EARTH_COLOR} />
            <g
              className="orbital-spin"
              style={{ transformOrigin: "200px 100px", animationDuration: `${moonDurationMs}ms`, animationPlayState: playState }}
            >
              <circle cx="272" cy="100" r="6" fill={MOON_COLOR} />
            </g>
          </>
        ) : (
          <>
            <circle cx="200" cy="100" r="14" fill={SUN_COLOR} />
            <circle cx="200" cy="100" r="55" fill="none" stroke="#3a4568" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="200" cy="100" r="88" fill="none" stroke="#3a4568" strokeWidth="1" strokeDasharray="2 4" />
            <g
              className="orbital-spin"
              style={{ transformOrigin: "200px 100px", animationDuration: `${earthDurationMs}ms`, animationPlayState: playState }}
            >
              <circle cx="255" cy="100" r="8" fill={EARTH_COLOR} />
            </g>
            <g
              className="orbital-spin"
              style={{ transformOrigin: "200px 100px", animationDuration: `${marsDurationMs}ms`, animationPlayState: playState }}
            >
              <circle cx="288" cy="100" r="6" fill={MARS_COLOR} />
            </g>
          </>
        )}
      </svg>

      <table className="ripple-table">
        <caption className="visually-hidden">Real orbital periods behind the display above</caption>
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
        The on-screen pace is compressed for viewing (real orbits are far slower than any player
        would sit and watch) — but the ratio between bodies, and the 1x/4x/16x relationship, both
        stay real.
      </p>
    </section>
  );
}
