import { useMemo } from "react";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { buildRippleGraph, type RippleNode } from "../../ripple/graph.js";
import { useForceLayout } from "../../ripple/useForceLayout.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { locationLabel, systemLabel } from "../../dial/labels.js";
import { systemStatusInfo } from "../../dial/systemStatus.js";
import { decisionText } from "../../i18n/decisionText.js";
import { STATUS, statusFromReserve, type StatusPresentation } from "../../components/status.js";
import { INCIDENT_CATALOG, radiation, type CrewLocation, type SystemId } from "@sol-keeper/sim";

const LOCATIONS: readonly CrewLocation[] = ["habitat", "stormShelter", "eva"];

const WIDTH = 640;
const HEIGHT = 480;

const NODE_RADIUS: Record<RippleNode["kind"], number> = {
  power: 30,
  system: 22,
  domain: 26,
  crew: 32,
};

interface NodeStatus {
  readonly glyph: string;
  readonly word: string;
  readonly className: string;
}

function fromPresentation(status: StatusPresentation): NodeStatus {
  return { glyph: status.glyph, word: status.label, className: status.className };
}

/**
 * The Incident Command console (M8.3): the Ripple Web dependency graph, moved wholesale from
 * its own old tab (M8's settled navigation — dependency awareness is exactly what deciding a
 * repair queue or a shelter order needs) — see ripple/graph.ts for the topology itself, cited
 * line-by-line to the model code it reflects.
 *
 * The Decision Card (M8.2) renders globally from App.tsx, not scoped here, so a pending
 * incident is visible regardless of which console is open — this is just its most natural
 * *home* tab, not its only path to the player.
 *
 * M8.4 Part D: a read-only repair queue (state.crewHours.queue, already real and FIFO —
 * reordering would need a crewHours.ts change, out of scope unless requested) and a real,
 * already-wired shelter/EVA control per crew member via setCrewLocation (M8.1) — no sim
 * change needed, radiationStage already reads CrewMember.location every hour.
 */
export function IncidentCommandConsole() {
  // `state` is mutated in place (store/run.ts's own doc comment) — this console previously
  // did not subscribe to `version` at all, a real, pre-existing bug caught while adding Part
  // D's own content: the dependency graph and text table never actually re-rendered as the
  // mission progressed, only on whatever unrelated re-render happened to occur. Fixed here.
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const phase = useRun((s) => s.phase);
  const setCrewLocation = useRun((s) => s.setCrewLocation);
  const level = useDial((s) => s.level);
  const locked = phase !== "planning";

  const { nodes, edges } = useMemo(() => buildRippleGraph(scenario), [scenario]);
  const laidOut = useForceLayout(nodes, edges, WIDTH, HEIGHT);

  const missionStarted = state.hour > 0;
  const summary = buildResourceSummary(state, level);
  const livingCrew = state.crew.filter((c) => c.alive);
  const avgHealth =
    livingCrew.length > 0
      ? livingCrew.reduce((sum, c) => sum + c.healthFraction, 0) / livingCrew.length
      : 0;
  const avgDoseFraction =
    state.crew.length > 0
      ? state.crew.reduce((sum, c) => sum + c.cumulativeDoseMSv, 0) /
        state.crew.length /
        radiation.careerLimitMSv.value
      : 0;
  const batteryFraction = state.power.batteryEnergyKwh / state.power.batteryCapacityKwh;

  function nodeStatus(node: RippleNode): NodeStatus {
    if (node.kind === "system") {
      const info = systemStatusInfo(state.systems[node.id as SystemId], missionStarted);
      return { glyph: info.glyph, word: info.word, className: info.className };
    }
    if (node.kind === "power") {
      return fromPresentation(statusFromReserve(batteryFraction));
    }
    if (node.kind === "crew") {
      return fromPresentation(missionStarted ? statusFromReserve(avgHealth) : STATUS.nominal);
    }
    // domain nodes
    const byId: Partial<Record<string, StatusPresentation>> = {
      oxygen: summary.oxygen.status,
      co2: summary.co2.status,
      water: summary.water.status,
      food: summary.food.status,
      thermal: summary.cabin.status,
      radiation: statusFromReserve(1 - avgDoseFraction),
    };
    return fromPresentation(byId[node.id] ?? STATUS.nominal);
  }

  function label(node: RippleNode): string {
    return node.kind === "system" ? systemLabel(node.id as SystemId, level) : node.label;
  }

  const edgeLines = edges.map((e) => {
    const source = laidOut.find((n) => n.id === e.source);
    const target = laidOut.find((n) => n.id === e.target);
    return { key: `${e.source}-${e.target}`, source, target };
  });

  return (
    <div className="console">
      <header className="view-head">
        <h2>Incident Command</h2>
        <p className="view-hint">
          What depends on what. Shedding a system on the left ripples through to everything
          connected to it on the right — see it before you decide, not after.
        </p>
      </header>

      <section className="panel" aria-labelledby="ripple-graph-heading">
        <h2 id="ripple-graph-heading">Dependency map</h2>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          role="img"
          aria-label="Dependency graph of the outpost's systems, resources and crew. A full text version follows below."
          className="ripple-svg"
        >
          {edgeLines.map(({ key, source, target }) =>
            source && target ? (
              <line
                key={key}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="ripple-edge"
              />
            ) : null,
          )}
          {laidOut.map((node) => {
            const status = nodeStatus(node);
            const r = NODE_RADIUS[node.kind];
            return (
              <g key={node.id} className={`ripple-node ${status.className}`}>
                <circle cx={node.x} cy={node.y} r={r} />
                <text x={node.x} y={node.y - r - 6} textAnchor="middle" className="ripple-node-label">
                  {label(node)}
                </text>
                <text x={node.x} y={node.y + 4} textAnchor="middle" aria-hidden="true" className="ripple-node-glyph">
                  {status.glyph}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      <section className="panel" aria-labelledby="ripple-table-heading">
        <h2 id="ripple-table-heading">Same information, as text</h2>
        <p className="panel-hint">
          A force-directed graph is not something a screen reader can narrate usefully — this
          table carries the identical status for every node above.
        </p>
        <table className="ripple-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Kind</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => {
              const status = nodeStatus(node);
              return (
                <tr key={node.id}>
                  <td>{label(node)}</td>
                  <td>{node.kind}</td>
                  <td className={status.className}>
                    <span aria-hidden="true">{status.glyph}</span> {status.word}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="repair-queue-heading">
        <h2 id="repair-queue-heading">Repair queue</h2>
        <p className="panel-hint">
          First in, first served — queued work pays down from each new day's crew-hours budget.
        </p>
        {state.crewHours.queue.length === 0 ? (
          <p className="panel-hint">Nothing queued.</p>
        ) : (
          <ul className="status-list">
            {state.crewHours.queue.map((item) => {
              const def = INCIDENT_CATALOG.find((d) => d.id === item.definitionId);
              const response = def?.responses.find((r) => r.id === item.responseId);
              return (
                <li key={item.id}>
                  <span className="status-list-label">
                    {response !== undefined ? decisionText(response.i18nKey, level) : item.responseId}
                  </span>
                  <span className="status-list-value">{item.hoursRemaining.toFixed(1)} h left</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="crew-location-heading">
        <h2 id="crew-location-heading">Crew location</h2>
        <p className="panel-hint">
          Send crew to the storm shelter ahead of a solar event, or out on an EVA.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <ul className="crew-location-list">
          {state.crew
            .filter((c) => c.alive)
            .map((member) => (
              <li key={member.id} className="crew-location-row">
                <span className="crew-location-name">{member.name}</span>
                <span className="button-row" role="group" aria-label={`${member.name}'s location`}>
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      className={`btn btn-tiny ${member.location === loc ? "btn-active" : ""}`}
                      aria-pressed={member.location === loc}
                      disabled={locked}
                      onClick={() => {
                        setCrewLocation(member.id, loc);
                      }}
                    >
                      {locationLabel(loc, level)}
                    </button>
                  ))}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
