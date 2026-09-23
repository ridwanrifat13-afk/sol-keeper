/**
 * Mission goal checks (Phase 2 brief), matched by `MissionGoal.id` — the same "plain data +
 * a switch elsewhere" split `HazardKind`/`applyHazard` (engine/events.ts) already use, so a
 * `Scenario` stays plain, serialisable config with no function fields.
 *
 * `"missionGoalsMet"` (M7.7 §4, restated M7.8 Part C.7) replaces the old
 * `"surviveWithDoseUnderLimit"`, which was a hardcoded `return true` — docs/DECISION_AUDIT.md's
 * own flagged finding. Three conjuncts, matching the brief's own M7.5 step 4 wording exactly
 * ("science returned, career dose within limits... alongside survival"):
 *
 * 1. `science.points >= scenario.scienceTargetPoints` — objectives actually returned.
 * 2. Every living crew member's `cumulativeDoseMSv` under `radiation.careerLimitMSv` — stated
 *    explicitly here even though `engine/outcome.ts`'s earlier over-exposure branch already
 *    guarantees it structurally by the time any goal check runs (an over-limit crew member
 *    ends the run at PARTIAL/`end.doseLimitExceeded` first) — kept as a real, explicit
 *    conjunct rather than an implicit assumption, both because the brief asks for it by name
 *    and so a future refactor of `outcome.ts`'s branch ordering can't silently break it here.
 * 3. `state.crew.every(alive)` — survival.
 *
 * Deliberately does NOT also require every `SystemState.operational` — that bar already
 * exists, one tier harder, as `"noSystemLeftFailed"` below (First Light's own stretch goal).
 * Folding it into the *primary* goal too was tried and found empirically wrong: greenhouse
 * and moxie both carry `spares: 0` by design (a non-essential system a scenario can genuinely
 * run without), so a single ordinary TRL failure on either, at any point in a 700+ hour
 * mission, would have permanently capped mission success regardless of skill — the outpost
 * surviving crew alive to full duration already demonstrates it stayed genuinely operable
 * (a life-support- or power-critical failure left unaddressed would have ended the run via
 * `outcome.ts`'s own crew-loss branch well before this check ever runs).
 */
import { radiation as radConstants } from "../data/constants.js";
import type { MissionGoal, Scenario, SimState } from "../types.js";

export function checkGoal(goal: MissionGoal, state: SimState, scenario: Scenario): boolean {
  switch (goal.id) {
    case "harvestAllCropTrays":
      return state.food.trays.every((tray) =>
        state.log.some((e) => e.code === "food.harvest" && e.data["tray"] === tray.id),
      );
    case "noSystemLeftFailed":
      return Object.values(state.systems).every((s) => s === undefined || s.operational);
    case "surviveFullDurationNoLoss":
      return state.crew.every((c) => c.alive);
    case "missionGoalsMet":
      return (
        state.science.points >= scenario.scienceTargetPoints &&
        state.crew.every((c) => !c.alive || c.cumulativeDoseMSv < radConstants.careerLimitMSv.value) &&
        state.crew.every((c) => c.alive)
      );
  }
}
