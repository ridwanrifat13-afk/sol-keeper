import { useEffect, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { RippleEdge, RippleNode } from "./graph.js";

export interface LaidOutNode extends RippleNode {
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  readonly id: string;
}

/**
 * Runs a small d3-force simulation to lay out the Ripple Web, and re-runs it only when the
 * graph's actual shape changes (a different scenario), not on every store tick — the graph
 * is a structural diagram, not something that should visibly jiggle every simulated hour.
 */
export function useForceLayout(
  nodes: readonly RippleNode[],
  edges: readonly RippleEdge[],
  width: number,
  height: number,
): LaidOutNode[] {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);

  // A key that only changes when the graph's actual node/edge set changes, so switching
  // Reality Dial level or ticking the clock never restarts the layout.
  const shapeKey = `${nodes.map((n) => n.id).join(",")}|${edges.map((e) => `${e.source}-${e.target}`).join(",")}`;

  useEffect(() => {
    const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }));
    const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));

    const sim = forceSimulation(simNodes)
      .force("charge", forceManyBody().strength(-220))
      .force(
        "link",
        forceLink(simLinks)
          .id((d) => (d as SimNode).id)
          .distance(90),
      )
      .force("center", forceCenter(width / 2, height / 2))
      // forceCollide only keeps *circles* from overlapping — it knows nothing about the
      // text label drawn above each one. At the old radius (34, barely past the largest
      // node's own 32px radius) two nodes could sit close enough that a neighbour's opaque
      // circle painted right over the tail of an adjacent label ("Power distribution" came
      // out as "Power distributi" behind the MOXIE node). Caught by looking at the actual
      // screenshot, not by any test — measuring the label's own bounding box confirmed it
      // never left the viewBox, so the cause was occlusion, not clipping. A wider radius
      // buys the label room on every side without a layout aware of text metrics.
      .force("collide", forceCollide(52))
      .stop();

    // Run to convergence synchronously rather than animating tick-by-tick: this is a
    // structural diagram computed once per shape change, not a live physics toy.
    sim.tick(300);

    // Still clamp into the canvas with margin for the label width: nothing stops a node
    // from settling near x=0 or x=width, where its centred label would run past the
    // viewBox on one side.
    const marginX = 100;
    const marginTop = 40;
    const marginBottom = 20;
    const next = new Map<string, { x: number; y: number }>();
    for (const n of simNodes) {
      const x = Math.min(width - marginX, Math.max(marginX, n.x ?? width / 2));
      const y = Math.min(height - marginBottom, Math.max(marginTop, n.y ?? height / 2));
      next.set(n.id, { x, y });
    }
    setPositions(next);
    simRef.current = sim;

    return () => {
      sim.stop();
    };
    // Deliberately keyed on `shapeKey`, not on `nodes`/`edges` themselves: those are new
    // array literals every render, which would restart the layout every store tick.
  }, [shapeKey, width, height]);

  return nodes.map((n) => {
    const p = positions.get(n.id);
    return { ...n, x: p?.x ?? width / 2, y: p?.y ?? height / 2 };
  });
}
