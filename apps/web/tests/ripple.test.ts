/**
 * The Ripple Web's whole value proposition is that its edges are real — read off the model
 * code, not invented for the diagram. These tests check the graph structure directly against
 * the scenarios (does the topology actually match what each scenario's systems can do) and
 * against the four-state system status logic shared with PowerPriorities.
 */
import { describe, expect, it } from "vitest";
import { firstLight, jezeroOutpost, theLongNight } from "@sol-keeper/sim";
import { buildRippleGraph } from "../src/ripple/graph";
import { systemStatusInfo } from "../src/dial/systemStatus";

describe("buildRippleGraph", () => {
  it("includes every system the scenario actually lists, and no others", () => {
    const { nodes } = buildRippleGraph(jezeroOutpost);
    const systemNodeIds = nodes.filter((n) => n.kind === "system").map((n) => n.id);
    expect(systemNodeIds.sort()).toEqual(jezeroOutpost.systems.map((s) => s.id).sort());
  });

  it("Moon scenarios have no MOXIE node — the Moon has no CO2 atmosphere to consume", () => {
    for (const scenario of [firstLight, theLongNight]) {
      const { nodes } = buildRippleGraph(scenario);
      expect(nodes.some((n) => n.id === "moxie")).toBe(false);
    }
  });

  it("Jezero has a MOXIE node, and it feeds oxygen", () => {
    const { nodes, edges } = buildRippleGraph(jezeroOutpost);
    expect(nodes.some((n) => n.id === "moxie")).toBe(true);
    expect(edges).toContainEqual(expect.objectContaining({ source: "moxie", target: "oxygen" }));
  });

  it("every system has a power edge feeding it", () => {
    const { edges } = buildRippleGraph(jezeroOutpost);
    for (const spec of jezeroOutpost.systems) {
      expect(edges).toContainEqual(expect.objectContaining({ source: "power", target: spec.id }));
    }
  });

  it("water feeds shielding, and shielding feeds crew, whenever water is a node at all", () => {
    const { nodes, edges } = buildRippleGraph(jezeroOutpost);
    expect(nodes.some((n) => n.id === "water")).toBe(true);
    expect(edges).toContainEqual(expect.objectContaining({ source: "water", target: "radiation" }));
    expect(edges).toContainEqual(expect.objectContaining({ source: "radiation", target: "crew" }));
  });

  it("every edge carries real, non-empty evidence text", () => {
    for (const scenario of [jezeroOutpost, firstLight, theLongNight]) {
      const { edges } = buildRippleGraph(scenario);
      for (const edge of edges) {
        expect(edge.evidence.length, `${edge.source} -> ${edge.target}`).toBeGreaterThan(0);
      }
    }
  });

  it("every domain node used by an edge also exists as a node — no dangling edges", () => {
    for (const scenario of [jezeroOutpost, firstLight, theLongNight]) {
      const { nodes, edges } = buildRippleGraph(scenario);
      const ids = new Set(nodes.map((n) => n.id));
      for (const edge of edges) {
        expect(ids.has(edge.source), `dangling source: ${edge.source}`).toBe(true);
        expect(ids.has(edge.target), `dangling target: ${edge.target}`).toBe(true);
      }
    }
  });

  it("lifeSupport and comms are leaves — no model stage gates a resource on either today", () => {
    // Confirmed by grepping packages/sim/src/models for `state.systems.lifeSupport` and
    // `state.systems.comms`: neither is read by name anywhere, so neither has a real edge
    // to invent. Both draw power (the power -> system edge still exists) and stop there.
    const { edges } = buildRippleGraph(jezeroOutpost);
    expect(edges.some((e) => e.source === "comms")).toBe(false);
    expect(edges.some((e) => e.source === "lifeSupport")).toBe(false);
  });

  it("the reactor scenario's power node is labelled Reactor, the solar ones are not", () => {
    expect(buildRippleGraph(theLongNight).nodes.find((n) => n.id === "power")?.label).toBe("Reactor");
    expect(buildRippleGraph(jezeroOutpost).nodes.find((n) => n.id === "power")?.label).not.toBe("Reactor");
  });

  it("Crew is always the sink — nothing has an outgoing edge from it", () => {
    for (const scenario of [jezeroOutpost, firstLight, theLongNight]) {
      const { edges } = buildRippleGraph(scenario);
      expect(edges.some((e) => e.source === "crew")).toBe(false);
    }
  });
});

describe("systemStatusInfo", () => {
  const base = {
    id: "co2Scrubber" as const,
    trl: 8,
    nominalPowerKw: 1.2,
    priority: 2,
    spares: 1,
    efficiencyPenaltyFraction: 0,
  };

  it("reads Standby before the mission starts, regardless of the system's own flags", () => {
    const info = systemStatusInfo({ ...base, operational: true, poweredThisHour: true }, false);
    expect(info.runState).toBe("standby");
    expect(info.word).toBe("Standby");
  });

  it("reads Standby for a system this scenario does not have, once the mission has started", () => {
    const info = systemStatusInfo(undefined, true);
    expect(info.runState).toBe("standby");
  });

  it("reads Powered once running and drawing power", () => {
    const info = systemStatusInfo({ ...base, operational: true, poweredThisHour: true }, true);
    expect(info.runState).toBe("powered");
    expect(info.className).toBe("is-nominal");
  });

  it("reads Shed when operational but not powered this hour", () => {
    const info = systemStatusInfo({ ...base, operational: true, poweredThisHour: false }, true);
    expect(info.runState).toBe("shed");
    expect(info.className).toBe("is-caution");
  });

  it("reads Failed when not operational, regardless of the power flag", () => {
    const info = systemStatusInfo({ ...base, operational: false, poweredThisHour: true }, true);
    expect(info.runState).toBe("failed");
    expect(info.className).toBe("is-critical");
  });
});
