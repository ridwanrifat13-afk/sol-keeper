import { useMemo } from "react";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { buildRippleGraph, type RippleNode } from "../../ripple/graph.js";
import { useForceLayout } from "../../ripple/useForceLayout.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { locationLabel, systemLabel } from "../../dial/labels.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { systemStatusInfo } from "../../dial/systemStatus.js";
import { decisionText } from "../../i18n/decisionText.js";
import { STATUS, statusFromReserve, type StatusPresentation } from "../../components/status.js";
import {
  INCIDENT_CATALOG,
  management,
  radiation,
  type CrewLocation,
  type SystemId,
} from "@sol-keeper/sim";
import { DashboardGrid } from "../../components/DashboardGrid.js";
import { CockpitTarget } from "../../cockpit/CockpitTarget.js";

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
  const printSpare = useRun((s) => s.printSpare);
  const reorderRepairQueue = useRun((s) => s.reorderRepairQueue);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const locked = phase !== "planning";

  const { nodes, edges } = useMemo(() => buildRippleGraph(scenario), [scenario]);
  const laidOut = useForceLayout(nodes, edges, WIDTH, HEIGHT);

  const missionStarted = state.hour > 0;
  const summary = buildResourceSummary(state, level, language);
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

  // Player request: "repair/spares interactivity in Incident Command" — a print-a-spare
  // lever (NASA AMF-inspired, management.printSpareWallClockHours's own doc comment) plus
  // repair-queue reordering, same locked/afford pattern every other quiet-sol lever uses.
  const remainingCrewHours = Math.max(
    0,
    state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours,
  );
  const printCostHours = management.printSpareCrewHours.value;
  const printWaitHours = management.printSpareWallClockHours.value;

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
    return node.kind === "system" ? systemLabel(node.id as SystemId, level, language) : node.label;
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  function labelById(id: string): string {
    const node = nodeById.get(id);
    return node === undefined ? id : label(node);
  }

  const edgeLines = edges.map((e) => {
    const source = laidOut.find((n) => n.id === e.source);
    const target = laidOut.find((n) => n.id === e.target);
    return { key: `${e.source}-${e.target}`, source, target, evidence: e.evidence };
  });

  return (
    <DashboardGrid className="console two-col" layoutKey="incidentCommand">
      <header className="view-head">
        <h2>Incident Command</h2>
        <p className="view-hint">
          What depends on what. Shedding a system on the left ripples through to everything
          connected to it on the right — see it before you decide, not after.
        </p>
      </header>

      <CockpitTarget id="incident-ripple-graph" role="primary" priority={1}>
        <section className="panel panel-span-full" aria-labelledby="ripple-graph-heading">
          <h2 id="ripple-graph-heading">Dependency map</h2>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            role="img"
            aria-label="Dependency graph of the outpost's systems, resources and crew. A full text version follows below."
            className="ripple-svg"
          >
            {edgeLines.map(({ key, source, target, evidence }) =>
              source && target ? (
                <line
                  key={key}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className="ripple-edge"
                >
                  <title>{evidence}</title>
                </line>
              ) : null,
            )}
            {laidOut.map((node) => {
              const status = nodeStatus(node);
              const r = NODE_RADIUS[node.kind];
              return (
                <g key={node.id} className={`ripple-node ${status.className}`}>
                  <circle cx={node.x} cy={node.y} r={r} />
                  <text
                    x={node.x}
                    y={node.y - r - 6}
                    textAnchor="middle"
                    className="ripple-node-label"
                  >
                    {label(node)}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    aria-hidden="true"
                    className="ripple-node-glyph"
                  >
                    {status.glyph}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>
      </CockpitTarget>

      <CockpitTarget id="incident-repair-queue" role="secondary" priority={1}>
        <section className="panel repair-queue-panel" aria-labelledby="repair-queue-heading">
          <h2 id="repair-queue-heading">Repair queue</h2>
          <p className="panel-hint">
            First in, first served — queued work pays down from each new day's crew-hours budget.
          </p>
          {state.crewHours.queue.length === 0 ? (
            <p className="panel-hint">Nothing queued.</p>
          ) : (
            <ul className="status-list">
              {state.crewHours.queue.map((item, index, queue) => {
                const def = INCIDENT_CATALOG.find((d) => d.id === item.definitionId);
                const response = def?.responses.find((r) => r.id === item.responseId);
                const sparesSystem =
                  response?.sparesFromSystem !== undefined
                    ? state.systems[response.sparesFromSystem]
                    : undefined;
                const shortfall =
                  response?.sparesCost !== undefined &&
                  sparesSystem !== undefined &&
                  sparesSystem.spares < response.sparesCost;
                return (
                  <li key={item.id}>
                    <span className="status-list-label">
                      {response !== undefined
                        ? decisionText(response.i18nKey, level, undefined, language)
                        : item.responseId}
                      {response?.sparesCost !== undefined &&
                        response.sparesFromSystem !== undefined && (
                          <span className="repair-queue-spares">
                            {" "}
                            — needs {response.sparesCost} spare(s) from{" "}
                            {systemLabel(response.sparesFromSystem, level, language)}
                            {sparesSystem !== undefined && (
                              <>
                                {" "}
                                ({sparesSystem.spares} in stock
                                {shortfall ? ", will fall short — improvised repair" : ""})
                              </>
                            )}
                          </span>
                        )}
                    </span>
                    <span className="status-list-value">
                      {item.hoursRemaining.toFixed(1)} h left
                      <span className="button-row" role="group" aria-label="Reorder this repair">
                        <button
                          type="button"
                          className="btn btn-tiny"
                          disabled={locked || index === 0}
                          aria-label="Move earlier in the queue"
                          onClick={() => {
                            reorderRepairQueue(index, -1);
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn btn-tiny"
                          disabled={locked || index === queue.length - 1}
                          aria-label="Move later in the queue"
                          onClick={() => {
                            reorderRepairQueue(index, 1);
                          }}
                        >
                          ▼
                        </button>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {state.crewHours.queue.length > 1 && (
            <p className="panel-hint">
              First in, first served by default — move an item up to pay it down sooner out of
              today's crew-hours budget.
              {locked && " Locked while the sol is running — adjust it during Sol Planning."}
            </p>
          )}
        </section>
      </CockpitTarget>

      <CockpitTarget id="incident-spares" role="secondary" priority={2}>
        <section className="panel" aria-labelledby="spares-heading">
          <h2 id="spares-heading">Spares inventory</h2>
          <p className="panel-hint">
            What each system has on hand right now — a response that costs more spares than a system
            has in stock still gets attempted, but leaves a permanent efficiency penalty (an
            improvised repair), same as the Decision Card's own declared trade-offs. Out of spares?
            Print one: modelled on the ISS Additive Manufacturing Facility, a real ground-controlled
            3D printer — {printCostHours} crew-hour(s) to start, then a real {printWaitHours}-hour
            wait (the real time NASA's AMF took to print its first tool) before the part exists.
            {locked && " Locked while the sol is running — adjust it during Sol Planning."}
          </p>
          <ul className="chip-grid">
            {Object.entries(state.systems).map(([id, sys]) => {
              const systemId = id as SystemId;
              const pending = state.printQueue.filter((job) => job.systemId === systemId);
              const canAfford = remainingCrewHours >= printCostHours;
              return (
                <li key={id} className="chip-grid-item chip-grid-stack">
                  <span className="chip-grid-label">{systemLabel(systemId, level, language)}</span>
                  <span className="chip-grid-action chip-grid-action-wide">
                    {sys.spares} spare(s)
                    {pending.map((job) => (
                      <span key={job.id} className="status-pill is-caution">
                        <span aria-hidden="true">▲</span> printing,{" "}
                        {Math.max(0, job.readyAtHour - state.hour)} h left
                      </span>
                    ))}
                    <button
                      type="button"
                      className="btn btn-tiny"
                      disabled={locked || !canAfford}
                      onClick={() => {
                        printSpare(systemId);
                      }}
                    >
                      Print spare
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </CockpitTarget>

      <CockpitTarget id="incident-ripple-table" role="secondary" priority={3}>
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
      </CockpitTarget>

      <CockpitTarget id="incident-ripple-evidence" role="secondary" priority={4}>
        <section className="panel" aria-labelledby="ripple-evidence-heading">
          <h2 id="ripple-evidence-heading">How the connections work</h2>
          <p className="panel-hint">
            Every line above corresponds to a real check in the simulation's own model code, not a
            drawn guess — hover a line for the same text, or read it here.
          </p>
          <div
            className="panel-scroll"
            role="region"
            aria-label="Connection evidence, scrollable"
            tabIndex={0}
          >
            <table className="ripple-table">
              <thead>
                <tr>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e) => (
                  <tr key={`${e.source}-${e.target}`}>
                    <td>{labelById(e.source)}</td>
                    <td>{labelById(e.target)}</td>
                    <td className="ripple-evidence-cell">{e.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </CockpitTarget>

      <CockpitTarget id="incident-crew-location" role="secondary" priority={5}>
        <section className="panel panel-span-full" aria-labelledby="crew-location-heading">
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
                  <span
                    className="button-row"
                    role="group"
                    aria-label={`${member.name}'s location`}
                  >
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
                        {locationLabel(loc, level, language)}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </CockpitTarget>
    </DashboardGrid>
  );
}
