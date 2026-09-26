import {
  crewCondition,
  dayLengthHours,
  sunFactor,
  STATION_IDS,
  type CrewMember,
  type StationId,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Starfield } from "../../components/Starfield.js";
import { STATUS } from "../../components/status.js";
import { AlarmBanner } from "../../components/AlarmBanner.js";
import { locationLabel, stationLabel } from "../../dial/labels.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { timestampLabel } from "../../dial/missionTime.js";

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

/** `crewCondition`'s own four rungs, presented with `STATUS`'s shared glyph/colour vocabulary
 *  but the condition ladder's real word — "Impaired" is a distinct fact from a resource
 *  gauge's "Caution", even though both share the amber tier, so the label isn't borrowed
 *  from `STATUS` even though the glyph and colour class are. `lost` never reaches this table
 *  (filtered to living crew, see `aliveCrew` below) or the scene (no crew-body imagery for a
 *  death, matching Debrief's own "Crew lost" panel — a text report, never an illustration). */
const CONDITION_PRESENTATION = {
  nominal: { glyph: STATUS.nominal.glyph, className: STATUS.nominal.className, label: "Nominal" },
  impaired: { glyph: STATUS.caution.glyph, className: STATUS.caution.className, label: "Impaired" },
  critical: { glyph: STATUS.critical.glyph, className: STATUS.critical.className, label: "Critical" },
} as const;

/** Mixes two hex colours by `t` (0 = a, 1 = b) — the sky's own day/night gradient has no
 *  hard cut, unlike `isDaylight`, so a linear blend on `sunFactor` reads more like a real sky
 *  than a jump would. */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mixed = pa.map((ca, i) => Math.round(ca + (pb[i]! - ca) * t));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Where each station's marker sits along the module's interior floor — evenly spaced,
 *  brief's own tab-bar order (matches STATION_IDS, not the tutorial's teaching order). */
const STATION_X: Record<StationId, number> = {
  power: 130,
  lifeSupport: 165,
  comms: 200,
  incidentCommand: 235,
  missionCommand: 270,
};
const STATION_Y = 145;
const SHELTER_X = 200;
const SHELTER_Y = 160;
const EVA_X = 340;
const EVA_Y = 190;

/** A crew condition rendered as a shape as well as a colour (rule 6: never colour alone) —
 *  the same nominal/caution/critical glyph shapes `STATUS` already uses elsewhere, drawn as
 *  actual marker shapes here since an SVG dot has no room for the glyph character itself. */
function ConditionMarker({ cx, cy, condition }: { cx: number; cy: number; condition: "nominal" | "impaired" | "critical" }) {
  if (condition === "nominal") return <circle cx={cx} cy={cy} r="6" fill="var(--nominal)" stroke="#0b1020" strokeWidth="1" />;
  if (condition === "impaired") {
    return <polygon points={`${cx},${cy - 7} ${cx - 7},${cy + 6} ${cx + 7},${cy + 6}`} fill="var(--caution)" stroke="#0b1020" strokeWidth="1" />;
  }
  return <rect x={cx - 6} y={cy - 6} width="12" height="12" fill="var(--critical)" stroke="#0b1020" strokeWidth="1" />;
}

/**
 * M9.4a/b: the habitat cutaway — day/night and dust conditions (M9.4a) plus crew sprites and
 * the red-alert/shelter/depressurization alarm states (M9.4b), on the 6th tab alongside the
 * five station consoles. All from state already exported by the sim, no new `SimState` field:
 * `state.environment` for the scene, `state.crew[i].{primaryStation, location, alive}` plus
 * `crewCondition(member)` for sprites, `state.radiation.solarParticleEventActive` for the red
 * alert, and `state.activeIncidents` for depressurization — all confirmed live fields.
 *
 * A crew member's sprite sits at their own station when `location === "habitat"`, clusters at
 * a shared shelter spot when sheltering from a solar particle event, or sits outside the dome
 * when on EVA — the same three-way distinction Incident Command's own location control
 * already offers, just drawn instead of listed. Depressurization gets a warning banner only,
 * deliberately no crew-body imagery — matching the tone Debrief's own "Crew lost" panel
 * already uses (a text report, never an illustration of harm).
 *
 * Follows the Ripple pattern (`IncidentCommandConsole.tsx`): an animated
 * `<svg role="img" aria-label="...">` immediately followed by a real, visible text table
 * carrying the same facts — every status here is glyph + word + colour together, never
 * colour alone (rule 6).
 *
 * M9.6 adds the `habitat-telemetry` class (styles.css gives every `.panel` here a shared
 * accent-topped chrome with the setup wizard's own panels) and a monospace sol/hour readout
 * on the scene panel itself — the same real `state.hour` `TimeControls` already shows above
 * every view, restyled as a HUD-style corner readout specifically where the player is
 * looking at the environment that clock is driving, not a second, independent clock.
 */
export function HabitatView() {
  // environment/crew/radiation/activeIncidents all mutate in place tick to tick —
  // subscribing to version is what actually triggers a re-render (the same fix every other
  // live console already needs).
  useRun((s) => s.version);
  const scenario = useRun((s) => s.scenario);
  const state = useRun((s) => s.state);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();

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

  const aliveCrew = state.crew.filter((c) => c.alive);
  const lostCount = state.crew.length - aliveCrew.length;
  const spe = state.radiation.solarParticleEventActive;
  const depressurizing = state.activeIncidents.some(
    (i) => i.definitionId === "depress-mir97" && i.resolvedAtHour === undefined,
  );

  // Station-slot crew (location === "habitat") are grouped by station so a shared slot (a
  // 6th crew member wraps onto another's primary station, see the M9 plan's own note on
  // STATION_IDS[5 % 5]) fans out instead of fully overlapping.
  const atStation = new Map<StationId, CrewMember[]>();
  const sheltering: CrewMember[] = [];
  const onEva: CrewMember[] = [];
  for (const member of aliveCrew) {
    if (member.location === "stormShelter") sheltering.push(member);
    else if (member.location === "eva") onEva.push(member);
    else {
      const group = atStation.get(member.primaryStation) ?? [];
      group.push(member);
      atStation.set(member.primaryStation, group);
    }
  }

  return (
    <div className="console habitat-telemetry">
      <header className="view-head">
        <h2>Habitat</h2>
        <p className="view-hint">
          {scenario.site.name}, {isMars ? "Mars" : "the Moon"} — the outpost's current
          conditions, at a glance.
        </p>
      </header>

      {spe && (
        <AlarmBanner severity="critical" glyph="☢">
          Solar particle event in progress — crew should be in the storm shelter.
        </AlarmBanner>
      )}
      {depressurizing && (
        <AlarmBanner severity="critical">Depressurization in progress — see Incident Command.</AlarmBanner>
      )}

      <section className="panel" aria-labelledby="habitat-scene-heading">
        <div className="panel-head-row">
          <h2 id="habitat-scene-heading" className="visually-hidden">
            Habitat scene
          </h2>
          <p className="habitat-telemetry-readout">{timestampLabel(state.hour, scenario.body)} · hour {state.hour}</p>
        </div>
        <svg
          className="habitat-svg"
          viewBox="0 0 400 220"
          role="img"
          aria-label={`${state.environment.isDaylight ? "Daytime" : "Night"} at ${scenario.site.name}, ${
            isMars ? "Mars" : "the Moon"
          }. ${dust.word}. ${aliveCrew.length} of ${state.crew.length} crew alive.${
            spe ? " Solar particle event in progress." : ""
          }${depressurizing ? " Depressurization in progress." : ""} A full text version follows below.`}
        >
          <rect x="0" y="0" width="400" height="220" fill={skyColor} />
          {showStars && <Starfield count={45} className="habitat-stars" />}
          {!isMars && <circle cx="330" cy="35" r="6" fill="#3a6ea5" />}
          {sun > 0.02 && <circle cx={sunX} cy={sunY} r="10" fill="#fff3c4" />}

          {/* Ground */}
          <rect x="0" y="170" width="400" height="50" fill={isMars ? "#7a4a30" : "#6b6e73"} />

          {/* Habitat module cutaway — a plain schematic dome. */}
          <path
            d="M 100 170 L 100 120 A 100 70 0 0 1 300 120 L 300 170 Z"
            fill="#dfe4f2"
            stroke={depressurizing ? "var(--critical)" : "#8b93b8"}
            strokeWidth={depressurizing ? 3 : 2}
          />
          <line x1="100" y1="150" x2="300" y2="150" stroke="#8b93b8" strokeWidth="1.5" />

          {/* atStation/sheltering/onEva are all built from aliveCrew — crewCondition() only
           *  ever returns "lost" for a dead member, so every marker here is genuinely one of
           *  the other three rungs. */}
          {STATION_IDS.map((station) => (
            <g key={station}>
              {(atStation.get(station) ?? []).map((member, i, group) => {
                const offset = (i - (group.length - 1) / 2) * 14;
                return (
                  <ConditionMarker
                    key={member.id}
                    cx={STATION_X[station] + offset}
                    cy={STATION_Y}
                    condition={crewCondition(member) as "nominal" | "impaired" | "critical"}
                  />
                );
              })}
            </g>
          ))}
          {sheltering.map((member, i, group) => (
            <ConditionMarker
              key={member.id}
              cx={SHELTER_X + (i - (group.length - 1) / 2) * 14}
              cy={SHELTER_Y}
              condition={crewCondition(member) as "nominal" | "impaired" | "critical"}
            />
          ))}
          {onEva.map((member, i, group) => (
            <ConditionMarker
              key={member.id}
              cx={EVA_X + (i - (group.length - 1) / 2) * 16}
              cy={EVA_Y}
              condition={crewCondition(member) as "nominal" | "impaired" | "critical"}
            />
          ))}

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

      <section className="panel" aria-labelledby="habitat-crew-heading">
        <h2 id="habitat-crew-heading">Crew</h2>
        <table className="ripple-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Station</th>
              <th scope="col">Condition</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <tbody>
            {aliveCrew.map((member) => {
              const condition = crewCondition(member);
              // crewCondition() only returns "lost" for a dead member, already excluded from
              // aliveCrew — the remaining three rungs are exactly CONDITION_PRESENTATION's keys.
              const presentation = CONDITION_PRESENTATION[condition as "nominal" | "impaired" | "critical"];
              return (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{stationLabel(member.primaryStation, level, language)}</td>
                  <td className={presentation.className}>
                    <span aria-hidden="true">{presentation.glyph}</span> {presentation.label}
                  </td>
                  <td>{locationLabel(member.location, level, language)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lostCount > 0 && (
          <p className="panel-hint">
            {lostCount} crew member{lostCount === 1 ? "" : "s"} lost this mission — see Debrief
            for the full report.
          </p>
        )}
      </section>
    </div>
  );
}
