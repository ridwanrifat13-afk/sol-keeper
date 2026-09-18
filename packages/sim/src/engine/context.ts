/**
 * What every pipeline stage is handed. Lives in its own module so the models and tick.ts
 * do not import each other in a cycle.
 */
import type { Params, Scenario, SimState } from "../types.js";
import type { EventLogger } from "./log.js";
import type { Rng } from "./rng.js";

export interface TickContext {
  /** The draft state for this hour. Stages mutate it in pipeline order. */
  readonly state: SimState;
  readonly params: Params;
  readonly scenario: Scenario;
  readonly rng: Rng;
  readonly log: EventLogger;
  /** Length of one tick, in hours. Always 1, but never written as a bare literal. */
  readonly dtHours: number;
}

export type Stage = (ctx: TickContext) => void;
