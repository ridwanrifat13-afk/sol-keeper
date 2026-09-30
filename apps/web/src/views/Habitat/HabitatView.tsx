import {
  crewCondition,
  dayLengthHours,
  sunFactor,
  cropRequiredLightHours,
  STATION_IDS,
  type CrewMember,
  type CropTray,
  type StationId,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Starfield } from "../../components/Starfield.js";
import { STATUS } from "../../components/status.js";
import { AlarmBanner } from "../../components/AlarmBanner.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { Avatar } from "../../components/Avatar.js";
import { MiniBar } from "../../components/MiniBar.js";
import { locationLabel, stationLabel, cropLabel } from "../../dial/labels.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { timestampLabel } from "../../dial/missionTime.js";
import { habitatEffects } from "../../dial/habitatEffects.js";

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

/** A tray's leaf colour blends from a healthy green toward a wilted brown as
 *  `healthFraction` falls — the same `mixHex` blend `skyColor` already uses, not a new
 *  mechanism. Decorative only (aria-hidden, see CropSprite below) — the real health number
 *  reads from the text table beside it (rule 6: never colour alone). */
function cropHealthColor(healthFraction: number): string {
  return mixHex("#8a6a2c", "#4ade80", Math.max(0, Math.min(1, healthFraction)));
}

/**
 * Player request: "add visuals for crops in the habitat." One compact sprite per real
 * `CropTray` (state.food.trays — already exported, no new sim field), grown inside the
 * secondary module drawn below as the mission's own small greenhouse. A stem height that
 * grows with `lightHours / cropRequiredLightHours(crop)` (the same fraction
 * LifeSupportConsole's own crop status list already computes) and a leaf colour that fades
 * toward brown with `healthFraction` reuse the sim's real numbers rather than a decorative
 * animation with nothing behind it. Four distinct, simple silhouettes (not attempting botanical
 * accuracy) so the four crop types read as different plants at a glance, not identical dots.
 */
function CropSprite({ cx, baseY, tray }: { cx: number; baseY: number; tray: CropTray }) {
  const growthFraction = Math.min(1, tray.lightHours / cropRequiredLightHours(tray.crop));
  const stemHeight = 4 + growthFraction * 12;
  const topY = baseY - stemHeight;
  const leafColor = cropHealthColor(tray.healthFraction);

  return (
    <g aria-hidden="true">
      <line x1={cx} y1={baseY} x2={cx} y2={topY} stroke="#5a6b3a" strokeWidth="1.5" />
      {tray.crop === "lettuce" && (
        <>
          <circle cx={cx} cy={topY} r={3 + growthFraction * 2.5} fill={leafColor} />
          <circle cx={cx - 2} cy={topY + 1} r={2 + growthFraction * 1.5} fill={leafColor} opacity="0.85" />
          <circle cx={cx + 2} cy={topY + 1} r={2 + growthFraction * 1.5} fill={leafColor} opacity="0.85" />
        </>
      )}
      {tray.crop === "wheat" && (
        <>
          <line x1={cx - 2} y1={baseY - 2} x2={cx - 2} y2={topY - 2} stroke={leafColor} strokeWidth="1.2" />
          <line x1={cx + 2} y1={baseY - 2} x2={cx + 2} y2={topY - 2} stroke={leafColor} strokeWidth="1.2" />
          <ellipse cx={cx} cy={topY - 2} rx={2} ry={3 + growthFraction * 2} fill={leafColor} />
          <ellipse cx={cx - 2} cy={topY - 1} rx={1.4} ry={2 + growthFraction * 1.4} fill={leafColor} opacity="0.85" />
          <ellipse cx={cx + 2} cy={topY - 1} rx={1.4} ry={2 + growthFraction * 1.4} fill={leafColor} opacity="0.85" />
        </>
      )}
      {tray.crop === "soybean" && (
        <>
          <ellipse cx={cx - 3} cy={topY} rx={2.5 + growthFraction} ry={1.8 + growthFraction} fill={leafColor} />
          <ellipse cx={cx + 3} cy={topY} rx={2.5 + growthFraction} ry={1.8 + growthFraction} fill={leafColor} />
          <ellipse cx={cx} cy={topY - 3} rx={2.5 + growthFraction} ry={1.8 + growthFraction} fill={leafColor} opacity="0.9" />
        </>
      )}
      {tray.crop === "potato" && (
        <>
          <ellipse cx={cx - 2.5} cy={topY} rx={3 + growthFraction} ry={2.2 + growthFraction * 0.8} fill={leafColor} />
          <ellipse cx={cx + 2.5} cy={topY - 1} rx={3 + growthFraction} ry={2.2 + growthFraction * 0.8} fill={leafColor} opacity="0.9" />
          {/* The tuber itself, at the soil line — potato's own defining feature versus the
           *  other three leaf-only crops, and a visible cue for what "harvest" means here. */}
          <ellipse cx={cx} cy={baseY + 1.5} rx={3} ry={2} fill="#8a5a3c" opacity={0.5 + growthFraction * 0.5} />
        </>
      )}
    </g>
  );
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

  // Player request: "apply visual effects on the habitat according to the mission logs sol by
  // sol" — real, lasting incident consequences the sim already tracks (dial/habitatEffects.ts
  // has the full reasoning and the unit test this component's own SSR test can't provide).
  const { arrayLossFraction, hasFireHistory, improvisedRepairSystemCount } = habitatEffects(state, scenario);

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
    <div className="console habitat-telemetry two-col">
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

      <section className="panel panel-span-full" aria-labelledby="habitat-scene-heading">
        <h2 id="habitat-scene-heading" className="visually-hidden">
          Habitat scene
        </h2>
        <div className="habitat-hud-wrap">
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

          {/* Player request #9: a handful of real, common architectural elements checked
           *  against actual NASA-studied outpost concepts (the FactCardGallery below has the
           *  real citations) — a solar array, a secondary inflatable module linked by a short
           *  tunnel, a comms mast, and a low regolith berm — not a reproduction of any one
           *  concept's own artwork, and not claimed as this mission's own as-built design
           *  (the scene's aria-label and the gallery's own heading both say "concept"). */}
          <g aria-hidden="true">
            {/* Regolith berm — the same real shielding approach engine/shielding.ts's own
             *  regolithBerm choice models, drawn low and wide in front of the dome. A stroked
             *  crest line (rather than a fill-only shade close to the ground's own colour)
             *  keeps the mound legible as its own feature against Mars' similarly-toned dirt. */}
            <path
              d="M 60 170 Q 130 150 200 170 Q 270 150 340 170 L 340 178 L 60 178 Z"
              fill={isMars ? "#8a5a3c" : "#5a5d63"}
            />
            <path
              d="M 60 170 Q 130 150 200 170 Q 270 150 340 170"
              fill="none"
              stroke={isMars ? "#c98a4b" : "#9aa0ab"}
              strokeWidth="2"
            />

            {/* Solar array, left of the dome — a strut plus two ribbed panels, the same
             *  panel-plus-truss shape real outpost/Gateway renders use. Player request: "apply
             *  visual effects... according to the mission logs sol by sol" — a scripted hull
             *  breach's real, permanent power.arrayAreaLossM2 (models/power.ts's own note:
             *  "sealing a leaking module takes its arrays with it") fades and cracks the panel
             *  proportionally, not just a battery gauge reading lower. */}
            <line x1="70" y1="168" x2="70" y2="128" stroke="#8b93b8" strokeWidth="2" />
            <g stroke="#4a5578" strokeWidth="1" opacity={1 - arrayLossFraction * 0.65}>
              <rect x="30" y="118" width="38" height="18" fill="#1d3a63" />
              <line x1="38" y1="118" x2="38" y2="136" />
              <line x1="46" y1="118" x2="46" y2="136" />
              <line x1="54" y1="118" x2="54" y2="136" />
              <line x1="62" y1="118" x2="62" y2="136" />
              <rect x="72" y="118" width="38" height="18" fill="#1d3a63" />
              <line x1="80" y1="118" x2="80" y2="136" />
              <line x1="88" y1="118" x2="88" y2="136" />
              <line x1="96" y1="118" x2="96" y2="136" />
              <line x1="104" y1="118" x2="104" y2="136" />
            </g>
            {arrayLossFraction > 0.3 && (
              <g stroke="var(--critical)" strokeWidth="2">
                <line x1="32" y1="120" x2="66" y2="134" />
                <line x1="66" y1="120" x2="32" y2="134" />
              </g>
            )}
          </g>

          {/* Habitat module cutaway — a plain schematic dome. */}
          <path
            d="M 100 170 L 100 120 A 100 70 0 0 1 300 120 L 300 170 Z"
            fill="#dfe4f2"
            stroke={depressurizing ? "var(--critical)" : "#8b93b8"}
            strokeWidth={depressurizing ? 3 : 2}
          />
          <line x1="100" y1="150" x2="300" y2="150" stroke="#8b93b8" strokeWidth="1.5" />

          {/* Soot smudge — fire-mir97 having happened at all is a permanent fact once it's on
           *  the mission log, even after its own temporary smoke-recovery window ends; scanning
           *  the log's own stable code (hasFireHistory, above) rather than any state flag this
           *  sim doesn't otherwise keep. */}
          {hasFireHistory && (
            <ellipse aria-hidden="true" cx="130" cy="135" rx="26" ry="16" fill="#1a1a1a" opacity="0.3" />
          )}

          {/* Improvised-repair patch — SystemState.efficiencyPenaltyFraction's own permanent
           *  "used something else" cost (engine/incidents.ts M7.7 Part 2), on the hull as a
           *  visibly different-coloured patch rather than only a lower number on Power/Life
           *  Support's own consoles. */}
          {improvisedRepairSystemCount > 0 && (
            <rect
              aria-hidden="true"
              x="170"
              y="152"
              width="26"
              height="16"
              fill="#7a6a3a"
              stroke="var(--caution)"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          )}

          {/* Comms mast, mounted on the dome's own roof and rising clear of it — drawn after
           *  the dome so it reads as mounted hardware, not a shape floating behind the hull.
           *  x=230 (off-centre, not the exact roof peak) puts the roofline itself at y~53
           *  (the dome's own arc: rx=100, ry=70, centred at 200,120), so the mast's base sits
           *  right on the hull and its dish clears the roofline into open sky. */}
          <g aria-hidden="true">
            <line x1="230" y1="53" x2="230" y2="25" stroke="#8b93b8" strokeWidth="2" />
            <circle cx="230" cy="21" r="5" fill="#c7cee3" stroke="#8b93b8" strokeWidth="2" />
          </g>

          {/* Secondary inflatable module — the real X-Hab expandable-habitat concept (see the
           *  gallery below), linked to the main module by a short tunnel rather than drawn as
           *  a second, disconnected building. Doubles as the mission's own small greenhouse —
           *  a real NASA Veggie-hardware-style planter strip plus one CropSprite per real
           *  `state.food.trays` entry (player request: "add visuals for crops in the
           *  habitat"), evenly spaced across the module's own interior width. */}
          <g aria-hidden="true">
            <rect x="300" y="148" width="22" height="10" fill="#c7cee3" stroke="#8b93b8" strokeWidth="1.5" />
            <ellipse cx="336" cy="153" rx="24" ry="20" fill="#c7cee3" stroke="#8b93b8" strokeWidth="2" />
            <rect x="317" y="163" width="38" height="5" rx="1.5" fill="#4a3a26" />
          </g>
          {state.food.trays.map((tray, i, trays) => (
            <CropSprite
              key={tray.id}
              cx={336 - 14 + ((i + 0.5) * 28) / trays.length}
              baseY={163}
              tray={tray}
            />
          ))}

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

        {/* HUD-style corner badges, real data laid over the scene itself (player reference: a
         *  drone-camera HUD). Every number here also has its own row in the tables below —
         *  this is a second, decorative presentation of the same facts, never the only one
         *  (rule 6). */}
        <span className="hud-badge hud-badge-tl">
          {state.environment.isDaylight ? "☀" : "☾"} {Math.round(state.environment.outsideTempC)}°C
        </span>
        <span className="hud-badge hud-badge-tr">
          <span className={spe || depressurizing ? "hud-alert-dot" : "hud-live-dot"} aria-hidden="true" />
          {timestampLabel(state.hour, scenario.body)} · hour {state.hour}
        </span>
        <span className="hud-badge hud-badge-bl">
          {aliveCrew.length}/{state.crew.length} CREW
        </span>
        </div>
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
              <th scope="row">Outside temperature</th>
              <td>{Math.round(state.environment.outsideTempC)}°C</td>
            </tr>
            <tr>
              <th scope="row">Sky conditions</th>
              <td className={dust.className}>
                <span aria-hidden="true">{dust.glyph}</span> {isMars ? dust.word : "No atmosphere — dust storms don't occur"}
              </td>
            </tr>
            {/* The greenhouse module's own CropSprite visuals, in words — same growth/health
             *  numbers LifeSupportConsole's own crop status list already reads, from the same
             *  real state.food.trays (rule 6: the scene's plant icons are decoration, this row
             *  is the actual fact). */}
            {state.food.trays.map((tray) => {
              const growthPct = Math.min(100, Math.round((tray.lightHours / cropRequiredLightHours(tray.crop)) * 100));
              const healthPct = Math.round(tray.healthFraction * 100);
              const trayStatusClass = healthPct < 60 ? "is-caution" : "is-nominal";
              return (
                <tr key={tray.id}>
                  <th scope="row">{cropLabel(tray.crop, level, language)}</th>
                  <td className={trayStatusClass}>
                    <span aria-hidden="true">{healthPct < 60 ? "▲" : "●"}</span> {growthPct}% grown ·{" "}
                    {healthPct}% healthy
                    <MiniBar fraction={growthPct / 100} statusClassName={trayStatusClass} />
                  </td>
                </tr>
              );
            })}
            {arrayLossFraction > 0 && (
              <tr>
                <th scope="row">Solar array damage</th>
                <td className="is-caution">
                  <span aria-hidden="true">▲</span> {Math.round(arrayLossFraction * 100)}% of rated area lost —
                  permanent, from a sealed module
                  <MiniBar fraction={1 - arrayLossFraction} statusClassName="is-caution" />
                </td>
              </tr>
            )}
            {hasFireHistory && (
              <tr>
                <th scope="row">Fire history</th>
                <td className="is-caution">
                  <span aria-hidden="true">▲</span> This mission has had a fire — soot residue remains
                </td>
              </tr>
            )}
            {improvisedRepairSystemCount > 0 && (
              <tr>
                <th scope="row">Improvised repairs</th>
                <td className="is-caution">
                  <span aria-hidden="true">▲</span> {improvisedRepairSystemCount} system
                  {improvisedRepairSystemCount === 1 ? "" : "s"} running below rated capacity from a
                  spares-short repair
                </td>
              </tr>
            )}
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
                  <td>
                    <span className="crew-row-head">
                      <Avatar name={member.name} statusClassName={presentation.className} />
                      {member.name}
                    </span>
                  </td>
                  <td>{stationLabel(member.primaryStation, level, language)}</td>
                  <td>
                    <span className={`status-pill ${presentation.className}`}>
                      <span aria-hidden="true">{presentation.glyph}</span> {presentation.label}
                    </span>
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

      {/* Player request #9: "better habitat visuals made with what an actual NASA planned or
       *  affiliated lunar/martian outpost could look like, if it's available anywhere." The
       *  scene above is a schematic, not a reproduction of any one real design — this gallery
       *  is the real thing: actual NASA/NASA-center concept renders and hardware prototypes
       *  for a body-appropriate surface habitat, the same FactCardGallery machinery (and the
       *  same "credited, never fabricated" discipline) every other station's real-hardware
       *  gallery already uses. */}
      <FactCardGallery
        topic={isMars ? "mars-habitat-concept" : "lunar-habitat-concept"}
        heading={isMars ? "Real NASA concepts: Mars surface habitats" : "Real NASA concepts: lunar surface habitats"}
      />
    </div>
  );
}
