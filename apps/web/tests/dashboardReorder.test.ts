/**
 * The pure half of drag-to-reorder (components/dashboardReorder.ts): how a move changes a
 * sequence, and how a saved order is merged with the panels that are actually on the page. The
 * pointer/keyboard half needs a real browser and lives in e2e/reorder.spec.ts.
 */
import { describe, expect, it } from "vitest";
import { moveItem, rankOrder } from "../src/components/dashboardReorder";

describe("moveItem", () => {
  it("moves an item forward and back, shifting the ones in between", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns an equal copy for a no-op or out-of-range move, never the same array", () => {
    const input = ["a", "b", "c"];
    for (const [from, to] of [[1, 1], [-1, 0], [0, 3], [5, 0]] as const) {
      const out = moveItem(input, from, to);
      expect(out).toEqual(input);
      expect(out).not.toBe(input);
    }
  });
});

describe("rankOrder", () => {
  it("applies a saved order to the panels present", () => {
    expect(rankOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });

  it("with nothing saved, keeps the natural order", () => {
    expect(rankOrder(["a", "b", "c"], [])).toEqual(["a", "b", "c"]);
  });

  it("ignores saved ids that are no longer on the page", () => {
    expect(rankOrder(["a", "b"], ["gone", "b", "a"])).toEqual(["b", "a"]);
  });

  it("leaves a panel that was never saved where it naturally sits, instead of sending it to the end", () => {
    // `new` appears in some states only; the player had rearranged a/b/c without it.
    expect(rankOrder(["a", "new", "b", "c"], ["c", "b", "a"])).toEqual(["c", "new", "b", "a"]);
  });

  it("tolerates duplicate saved ids", () => {
    expect(rankOrder(["a", "b"], ["b", "b", "a"])).toEqual(["b", "a"]);
  });
});
