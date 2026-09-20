/**
 * The Ripple Web's graph structure — not invented, read straight off the real tick
 * pipeline's data flow (packages/sim/src/engine/tick.ts and the models it runs). Every edge
 * here corresponds to an actual line of sim code that reads one piece of state to change
 * another:
 *
 *   - a system node's edge to a resource domain exists only where that system's model file
 *     actually checks `system.operational && system.poweredThisHour` before doing
 *     something to that domain (models/atmosphere.ts, water.ts, thermal.ts, food.ts,
 *     isru.ts) — `lifeSupport` and `comms` draw power but gate no domain in the current
 *     sim, so they are drawn as leaves, not connected to anything further.
 *   - Water's edge to Radiation is `models/water.ts`'s water-wall shielding: stored water
 *     literally becomes part of `state.radiation.shieldingGPerCm2`.
 *   - every domain's edge to Crew is a real check in `models/crew.ts` (cold, hypoxia, the
 *     CO2 limit, thirst, hunger) or `models/radiation.ts` (accumulated dose).
 *
 * This is why the graph is built per scenario rather than hardcoded once: a scenario that
 * omits a system (no MOXIE on the Moon) must not show an edge for a dependency that scenario
 * does not actually have.
 */
import type { Scenario, SystemId } from "@sol-keeper/sim";

export type DomainId = "oxygen" | "co2" | "water" | "food" | "thermal" | "radiation" | "crew";

export const DOMAIN_LABELS: Record<DomainId, string> = {
  oxygen: "Oxygen",
  co2: "CO₂",
  water: "Water",
  food: "Food",
  thermal: "Thermal",
  radiation: "Radiation",
  crew: "Crew",
};

export interface RippleNode {
  readonly id: string;
  readonly kind: "power" | "system" | "domain" | "crew";
  readonly label: string;
}

export interface RippleEdge {
  readonly source: string;
  readonly target: string;
}

/** Which domain(s) a system's own model file actually checks that system's power for. */
const SYSTEM_TO_DOMAINS: Partial<Record<SystemId, readonly DomainId[]>> = {
  co2Scrubber: ["co2"],
  oxygenGenerator: ["oxygen", "water"],
  waterRecovery: ["water"],
  thermalControl: ["thermal"],
  greenhouse: ["food"],
  moxie: ["oxygen"],
  // lifeSupport, comms, powerDistribution: power sinks with no further modelled domain
  // effect today. Left out of this map on purpose, not an oversight.
};

/** Every domain's edge into Crew is a real, separately-checked penalty in crew.ts/radiation.ts. */
const DOMAIN_TO_CREW: readonly DomainId[] = [
  "oxygen",
  "co2",
  "water",
  "food",
  "thermal",
  "radiation",
];

export function buildRippleGraph(scenario: Scenario): { nodes: RippleNode[]; edges: RippleEdge[] } {
  const nodes: RippleNode[] = [
    { id: "power", kind: "power", label: scenario.initial.fissionReactorKwe > 0 ? "Reactor" : "Solar + battery" },
  ];
  const edges: RippleEdge[] = [];
  const domainsUsed = new Set<DomainId>();

  for (const spec of scenario.systems) {
    nodes.push({ id: spec.id, kind: "system", label: spec.id });
    edges.push({ source: "power", target: spec.id });

    for (const domain of SYSTEM_TO_DOMAINS[spec.id] ?? []) {
      domainsUsed.add(domain);
      edges.push({ source: spec.id, target: domain });
    }
  }

  // Water's shielding contribution only matters if something is drawing on radiation at
  // all, which is every scenario (ambient dose is unconditional) — so always include it
  // once Water itself is a real node in this scenario.
  if (domainsUsed.has("water")) {
    domainsUsed.add("radiation");
    edges.push({ source: "water", target: "radiation" });
  } else {
    // Radiation dose accrues regardless of the water loop's presence.
    domainsUsed.add("radiation");
  }

  for (const domain of domainsUsed) {
    nodes.push({ id: domain, kind: "domain", label: DOMAIN_LABELS[domain] });
  }
  nodes.push({ id: "crew", kind: "crew", label: "Crew" });

  for (const domain of DOMAIN_TO_CREW) {
    if (domainsUsed.has(domain)) {
      edges.push({ source: domain, target: "crew" });
    }
  }

  return { nodes, edges };
}
