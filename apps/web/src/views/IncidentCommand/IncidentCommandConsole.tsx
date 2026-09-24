import { useMemo } from "react";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { buildRippleGraph, type RippleNode } from "../../ripple/graph.js";
import { useForceLayout } from "../../ripple/useForceLayout.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { systemLabel } from "../../dial/labels.js";
import { systemStatusInfo } from "../../dial/systemStatus.js";
import { STATUS, statusFromReserve, type StatusPresentation } from "../../components/status.js";
import { radiation, type SystemId } from "@sol-keeper/sim";

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
 */
export function IncidentCommandConsole() {
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);

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
    </div>
  );
}
