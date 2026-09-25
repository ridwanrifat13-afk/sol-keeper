import { dayLengthHours, sunFactor } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { Starfield } from "../../components/Starfield.js";

/** Mars' real daytime sky is a dusty butterscotch, not Earth blue — no atmosphere means the
 *  Moon's sky is black at any hour, sun up or not (both are art-direction facts, not sourced
 *  mission parameters, so they carry no `Constant` wrapper). */
const MARS_NIGHT_SKY = "#0b0f1e";
const MARS_DAY_SKY = "#c98a4b";
const MOON_SKY = "#04050a";

const DUST_PRESENTATION = {
  clear: { glyph: "●", word: "Clear", className: "is-nominal" },
  hazy: { glyph: "▲", word: "Hazy — dust accumulating", className: "is-caution" },
  storm: { glyph: "■", word: "Dust storm active", className: "is-critical" },
} as const;

function dustStatus(dustObscurationFraction: number, stormActive: boolean): (typeof DUST_PRESENTATION)[keyof typeof DUST_PRESENTATION] {
  if (stormActive) return DUST_PRESENTATION.storm;
  if (dustObscurationFraction >= 0.15) return DUST_PRESENTATION.hazy;
  return DUST_PRESENTATION.clear;
}

/** Mixes two hex colours by `t` (0 = a, 1 = b) — the sky's own day/night gradient has no
 *  hard cut, unlike `isDaylight`, so a linear blend on `sunFactor` reads more like a real sky
 *  than a jump would. */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mixed = pa.map((ca, i) => Math.round(ca + (pb[i]! - ca) * t));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * M9.4a: the habitat cutaway scaffold — day/night and dust-storm conditions rendered as a
 * scene, on a new 6th tab alongside the five station consoles. Crew sprites and the
 * red-alert/shelter/depressurization states are M9.4b's addition on top of this; this step
 * is deliberately just the environment (`state.environment`, already exported, no new
 * `SimState` field needed) and the module scaffold it sits in.
 *
 * Follows the Ripple pattern (`IncidentCommandConsole.tsx`): an animated
 * `<svg role="img" aria-label="...">` immediately followed by a real, visible text table
 * carrying the same facts — dust severity is never colour alone (rule 6): glyph, word, and
 * class all change together.
 */
export function HabitatView() {
  // environment mutates in place tick to tick — subscribing to version is what actually
  // triggers a re-render (the same fix every other live console already needs).
  useRun((s) => s.version);
  const scenario = useRun((s) => s.scenario);
  const state = useRun((s) => s.state);

  const dayHours = dayLengthHours(scenario.body);
  const sun = sunFactor(state.hour, dayHours);
  const isMars = scenario.body === "mars";
  const dust = dustStatus(state.environment.dustObscurationFraction, state.environment.stormActive);

  const skyColor = isMars ? mixHex(MARS_NIGHT_SKY, MARS_DAY_SKY, sun) : MOON_SKY;
  // The sun arcs across the top third of the scene, hidden below the horizon at night.
  const sunX = 60 + sun * 280;
  const sunY = 130 - sun * 100;
  const showStars = !isMars || sun < 0.15;
  const dustOverlayOpacity = isMars ? Math.min(state.environment.dustObscurationFraction, 1) * 0.55 : 0;

  return (
    <div className="console">
      <header className="view-head">
        <h2>Habitat</h2>
        <p className="view-hint">
          {scenario.site.name}, {isMars ? "Mars" : "the Moon"} — the outpost's current
          conditions, at a glance.
        </p>
      </header>

      <section className="panel" aria-labelledby="habitat-scene-heading">
        <h2 id="habitat-scene-heading" className="visually-hidden">
          Habitat scene
        </h2>
        <svg
          className="habitat-svg"
          viewBox="0 0 400 220"
          role="img"
          aria-label={`${state.environment.isDaylight ? "Daytime" : "Night"} at ${scenario.site.name}, ${
            isMars ? "Mars" : "the Moon"
          }. ${dust.word}. A full text version follows below.`}
        >
          <rect x="0" y="0" width="400" height="220" fill={skyColor} />
          {showStars && <Starfield count={45} className="habitat-stars" />}
          {!isMars && <circle cx="330" cy="35" r="6" fill="#3a6ea5" />}
          {sun > 0.02 && <circle cx={sunX} cy={sunY} r="10" fill="#fff3c4" />}

          {/* Ground */}
          <rect x="0" y="170" width="400" height="50" fill={isMars ? "#7a4a30" : "#6b6e73"} />

          {/* Habitat module cutaway — a plain schematic dome, crew sprites arrive in M9.4b. */}
          <path d="M 140 170 L 140 120 A 60 60 0 0 1 260 120 L 260 170 Z" fill="#dfe4f2" stroke="#8b93b8" strokeWidth="2" />
          <line x1="140" y1="150" x2="260" y2="150" stroke="#8b93b8" strokeWidth="1.5" />
          <line x1="200" y1="150" x2="200" y2="170" stroke="#8b93b8" strokeWidth="1.5" />

          {isMars && dustOverlayOpacity > 0 && (
            <rect x="0" y="0" width="400" height="220" fill="#a8592c" opacity={dustOverlayOpacity} />
          )}
        </svg>
      </section>

      <section className="panel" aria-labelledby="habitat-facts-heading">
        <h2 id="habitat-facts-heading">Current conditions</h2>
        <table className="ripple-table">
          <tbody>
            <tr>
              <th scope="row">Location</th>
              <td>
                {scenario.site.name} — {isMars ? "Mars" : "the Moon"}
              </td>
            </tr>
            <tr>
              <th scope="row">Time of day</th>
              <td>
                {state.environment.isDaylight ? `Day (${Math.round(sun * 100)}% sun elevation)` : "Night"}
              </td>
            </tr>
            <tr>
              <th scope="row">Sky conditions</th>
              <td className={dust.className}>
                <span aria-hidden="true">{dust.glyph}</span> {isMars ? dust.word : "No atmosphere — dust storms don't occur"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
