/**
 * The headless balance harness (Phase 2 brief, M7 plan §6) — shared between
 * validation/balance.test.ts (which asserts the brief's exact pass/fail targets and runs in
 * `pnpm verify`, so a regression fails CI) and scripts/generate-balance-doc.ts (which turns
 * the same numbers into docs/BALANCE.md). One computation, two consumers, so the committed
 * doc can never drift from what the test actually asserts.
 *
 * Lives in engine/, not validation/, and is exported from index.ts even though its only
 * in-package consumer is a test: scripts/generate-balance-doc.ts runs against the *built*
 * `@sol-keeper/sim` package (CLAUDE.md's own layout note — scripts consume the workspace
 * package through node_modules, not a source import), and validation/ is excluded from the
 * build (tsconfig.build.json) on purpose, so this couldn't be reached from there.
 */
import { SCENARIOS } from "../data/scenarios/index.js";
import type { Bot } from "../engine/bots.js";
import { createInitialState } from "../engine/state.js";
import { runWithBot } from "../engine/runWithBot.js";
import type { MissionDifficulty, RunStatus, ScenarioId } from "../types.js";

export interface SeedOutcome {
  readonly status: RunStatus;
  /** The distinct crew-loss/end-reason cause codes this seed's run produced. */
  readonly causes: readonly string[];
}

export interface CombinationResult {
  readonly scenarioId: ScenarioId;
  readonly difficulty: MissionDifficulty;
  readonly botId: string;
  readonly seeds: number;
  readonly successRate: number;
  readonly statusCounts: Readonly<Record<RunStatus, number>>;
  readonly causesSeen: ReadonlySet<string>;
}

function playSeed(scenarioId: ScenarioId, difficulty: MissionDifficulty, seed: number, bot: Bot): SeedOutcome {
  const scenario = SCENARIOS[scenarioId];
  const params = {
    scenarioId,
    seed,
    crewSize: scenario.crewSize,
    missionStartIso: "2033-01-01",
    difficulty,
  };
  const state = createInitialState(params);
  runWithBot(state, params, scenario, scenario.durationHours, bot);

  const causes = new Set<string>();
  if (state.endReasonCode !== undefined) causes.add(state.endReasonCode);
  for (const entry of state.log) {
    if (entry.code === "crew.lost" || entry.code.startsWith("crew.lost.")) causes.add(entry.code);
  }
  return { status: state.status, causes: [...causes] };
}

/** Plays `seeds` (1..seeds) of one scenario/difficulty/bot combination and tallies outcomes. */
export function runCombination(
  scenarioId: ScenarioId,
  difficulty: MissionDifficulty,
  bot: Bot,
  seeds: number,
): CombinationResult {
  const statusCounts: Record<RunStatus, number> = { running: 0, success: 0, partial: 0, abort: 0, loss: 0 };
  const causesSeen = new Set<string>();

  for (let seed = 1; seed <= seeds; seed++) {
    const outcome = playSeed(scenarioId, difficulty, seed, bot);
    statusCounts[outcome.status] += 1;
    for (const cause of outcome.causes) causesSeen.add(cause);
  }

  return {
    scenarioId,
    difficulty,
    botId: bot.id,
    seeds,
    successRate: statusCounts.success / seeds,
    statusCounts,
    causesSeen,
  };
}
