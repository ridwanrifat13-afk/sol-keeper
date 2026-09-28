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
  /** Player request #2: "detailing how everything connects, with data evidence links on the
   *  connecting lines" — the exact real model file and mechanism this edge represents, so a
   *  player can check the claim rather than trust a drawn line. Every edge already had a real
   *  code line behind it (this file's own header comment); this is that same evidence, moved
   *  from one paragraph onto the specific edge it backs. */
  readonly evidence: string;
}

/** Which domain(s) a system's own model file actually checks that system's power for, and the
 *  real per-domain mechanism (never invented — mirrors the model file's own gate). */
const SYSTEM_TO_DOMAINS: Partial<Record<SystemId, readonly { domain: DomainId; evidence: string }[]>> = {
  co2Scrubber: [
    { domain: "co2", evidence: "models/atmosphere.ts: CO2 removal rate applies only while this system is operational and powered." },
  ],
  oxygenGenerator: [
    { domain: "oxygen", evidence: "models/water.ts: electrolysis O2 output applies only while this system is operational and powered." },
    { domain: "water", evidence: "models/water.ts: electrolysis consumes stored water to make oxygen, only while this system is powered." },
  ],
  waterRecovery: [
    { domain: "water", evidence: "models/water.ts: the recovery fraction is the system's baseline rate while operational and powered, or 0 otherwise." },
  ],
  thermalControl: [
    { domain: "thermal", evidence: "models/thermal.ts: active cabin-temperature control runs only while this system is operational and powered." },
  ],
  greenhouse: [
    { domain: "food", evidence: "models/food.ts: crop trays accumulate lit hours only while the greenhouse is operational and powered." },
  ],
  moxie: [
    { domain: "oxygen", evidence: "models/isru.ts: MOXIE's O2 production runs only while operational and powered." },
  ],
  // lifeSupport, comms, powerDistribution: power sinks with no further modelled domain
  // effect today. Left out of this map on purpose, not an oversight.
};

/** Every domain's edge into Crew is a real, separately-checked penalty in crew.ts/radiation.ts. */
const DOMAIN_TO_CREW: Record<DomainId, string> = {
  oxygen: "models/crew.ts: pIO2 below the hypoxia threshold accumulates a real hypoxiaClock toward crew condition loss.",
  co2: "models/crew.ts: CO2 above the current survival mode's own limit accumulates lasting fatigue/performance cost.",
  water: "models/crew.ts: a shortfall in water intakeFraction accumulates a real hydrationClock.",
  food: "models/crew.ts: a shortfall in food intakeFraction accumulates a real starvationClock.",
  thermal: "models/crew.ts: cabin temperature below comfort accumulates a real hypothermiaClock.",
  radiation: "models/radiation.ts: ambient and event dose accumulate directly into each crew member's cumulativeDoseMSv.",
  crew: "",
};

const DOMAIN_TO_CREW_LIST: readonly DomainId[] = ["oxygen", "co2", "water", "food", "thermal", "radiation"];

export function buildRippleGraph(scenario: Scenario): { nodes: RippleNode[]; edges: RippleEdge[] } {
  const nodes: RippleNode[] = [
    { id: "power", kind: "power", label: scenario.initial.fissionReactorKwe > 0 ? "Reactor" : "Solar + battery" },
  ];
  const edges: RippleEdge[] = [];
  const domainsUsed = new Set<DomainId>();

  for (const spec of scenario.systems) {
    nodes.push({ id: spec.id, kind: "system", label: spec.id });
    edges.push({
      source: "power",
      target: spec.id,
      evidence: "models/power.ts: this system draws from the shared power priority list; losing its share sets poweredThisHour = false for every model it feeds.",
    });

    for (const { domain, evidence } of SYSTEM_TO_DOMAINS[spec.id] ?? []) {
      domainsUsed.add(domain);
      edges.push({ source: spec.id, target: domain, evidence });
    }
  }

  // Water's shielding contribution only matters if something is drawing on radiation at
  // all, which is every scenario (ambient dose is unconditional) — so always include it
  // once Water itself is a real node in this scenario.
  if (domainsUsed.has("water")) {
    domainsUsed.add("radiation");
    edges.push({
      source: "water",
      target: "radiation",
      evidence: "models/water.ts: stored water mass (potableKg) adds directly to state.radiation.shieldingGPerCm2 as a water wall.",
    });
  } else {
    // Radiation dose accrues regardless of the water loop's presence.
    domainsUsed.add("radiation");
  }

  for (const domain of domainsUsed) {
    nodes.push({ id: domain, kind: "domain", label: DOMAIN_LABELS[domain] });
  }
  nodes.push({ id: "crew", kind: "crew", label: "Crew" });

  for (const domain of DOMAIN_TO_CREW_LIST) {
    if (domainsUsed.has(domain)) {
      edges.push({ source: domain, target: "crew", evidence: DOMAIN_TO_CREW[domain] });
    }
  }

  return { nodes, edges };
}
