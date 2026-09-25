import { useMemo } from "react";
import { getScenario, type Body } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import { Starfield } from "../../components/Starfield.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const BODY_INFO: Record<Body, { label: string; color: string; radius: number }> = {
  mars: { label: "Mars", color: "#c1440e", radius: 11 },
  moon: { label: "the Moon", color: "#aab0bd", radius: 9 },
};

function oneWayLabel(seconds: number): string {
  return seconds >= 60 ? `${(seconds / 60).toFixed(1)} minutes` : `${seconds.toFixed(1)} seconds`;
}

/**
 * M9.3: a real-data establishing shot between choosing a landing site and reviewing power
 * and shielding — not a NASA "Eyes on the Solar System" embed (investigated and rejected:
 * no documented way to pin a surface lat/long, third-party NASA/JPL branding inside the
 * iframe violates brief rule 5, uncacheable for offline, not original art). This is a
 * compliant, original SVG scene instead.
 *
 * The craft's motion across the scene is decorative — there is no multi-row Horizons time
 * series backing a real trajectory shape (deferred per the M9 plan, only worth adding if the
 * straight-line version looks wrong once built). What is real: the distance and one-way
 * light-time overlaid on it, from the exact same `/api/light-time` + snapshot pair
 * `CommsConsole` reads during a run, via the shared `useLiveOrSnapshot` client strategy — the
 * same fact, never a fabricated travel time the sim doesn't track.
 *
 * Follows the Ripple pattern (`IncidentCommandConsole.tsx`): an animated
 * `<svg role="img" aria-label="...">` immediately followed by a real, visible `<table>`
 * carrying the same facts in text, not just a hidden ARIA label doing all the work.
 */
export function EstablishingShot() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const scenario = getScenario(scenarioId);
  const body = BODY_INFO[scenario.body];

  const date = useMemo(() => todayIso(), []);
  const lightTime = useLiveOrSnapshot<LightTimeResponse>(
    `/snapshots/light-time-${scenario.body}.json`,
    `/api/light-time?body=${scenario.body}&date=${date}`,
  );
  const distanceKm = lightTime.data?.distanceKm;
  const oneWaySeconds = lightTime.data?.oneWayLightSeconds;

  return (
    <section className="panel establishing-shot" aria-labelledby="setup-transit-heading">
      <div className="panel-head-row">
        <h2 id="setup-transit-heading">Earth to {body.label}</h2>
        <ProvenanceBadge status={lightTime.status} fetchedAt={lightTime.data?.fetchedAt} />
      </div>
      <p className="panel-hint">
        {scenario.site.name} is the destination — the distance below is how far Earth is from{" "}
        {body.label} right now, the same figure Comms reads during the mission itself.
      </p>

      <svg
        className="establishing-shot-svg"
        viewBox="0 0 400 160"
        role="img"
        aria-label={`An animated transit from Earth to ${body.label}, where the mission will land at ${scenario.site.name}. A full text version follows below.`}
      >
        <Starfield count={70} className="establishing-shot-stars" />
        <circle cx="40" cy="80" r="14" fill="#2a6fdb" />
        <circle cx="40" cy="80" r="14" fill="none" stroke="#7fb1ff" strokeWidth="1" opacity="0.6" />
        <circle cx="360" cy="80" r={body.radius} fill={body.color} />
        <line x1="54" y1="80" x2="346" y2="80" stroke="#3a4568" strokeWidth="1" strokeDasharray="2 4" />
        <circle className="establishing-shot-craft" cx="54" cy="80" r="3" fill="#e8ecf8" />
      </svg>

      <table className="ripple-table">
        <caption className="visually-hidden">Earth-to-destination transit, in text</caption>
        <tbody>
          <tr>
            <th scope="row">Destination</th>
            <td>
              {body.label} — {scenario.site.name}
            </td>
          </tr>
          <tr>
            <th scope="row">Distance today</th>
            <td>{distanceKm !== undefined ? `${Math.round(distanceKm).toLocaleString()} km` : "loading…"}</td>
          </tr>
          <tr>
            <th scope="row">One-way light time</th>
            <td>{oneWaySeconds !== undefined ? oneWayLabel(oneWaySeconds) : "loading…"}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
