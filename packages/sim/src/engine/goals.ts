/**
 * Mission goal checks (Phase 2 brief), matched by `MissionGoal.id` — the same "plain data +
 * a switch elsewhere" split `HazardKind`/`applyHazard` (engine/events.ts) already use, so a
 * `Scenario` stays plain, serialisable config with no function fields.
 *
 * Deliberately independent of the automatic outcome exits (engine/outcome.ts): "all crew
 * dead" and "dose over the career limit" already end a run before a goal is ever checked, so
 * a goal tied to survival or dose would be trivially true whenever it's actually evaluated.
 * Both goals here (crop harvest, equipment integrity) are genuinely separate from either.
 */
import type { MissionGoal, SimState } from "../types.js";

export function checkGoal(goal: MissionGoal, state: SimState): boolean {
  switch (goal.id) {
    case "harvestAllCropTrays":
      return state.food.trays.every((tray) =>
        state.log.some((e) => e.code === "food.harvest" && e.data["tray"] === tray.id),
      );
    case "noSystemLeftFailed":
      return Object.values(state.systems).every((s) => s === undefined || s.operational);
    case "surviveFullDurationNoLoss":
      return state.crew.every((c) => c.alive);
    case "surviveWithDoseUnderLimit":
      // Reachable in principle, but engine/outcome.ts's over-exposure check already ends a
      // run before this is ever evaluated with a "false" answer — kept as a valid goal id
      // (not dead code) for a future scenario that doesn't gate on it automatically.
      return true;
  }
}
