/**
 * Generates precomputed bot baseline score distributions and medians (M9.4).
 *
 * Runs 200 bot simulations across the three balance bots (50 idleBot, 75 greedyBot,
 * 75 prudentBot) for each [scenarioId, difficulty] combination, evaluates each run
 * through the deterministic scoring engine (scoreMission), and commits the result as
 * apps/web/public/scoring/baselines.json.
 *
 * Usage:
 *   pnpm --filter @sol-keeper/sim run build
 *   node scripts/score-baselines.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCENARIOS,
  createInitialState,
  greedyBot,
  idleBot,
  prudentBot,
  runWithBot,
  scoreMission,
  type Bot,
  type MissionDifficulty,
  type Scenario,
  type ScenarioId,
} from "../packages/sim/dist/index.js";

const OUT_PATH = fileURLToPath(
  new URL("../apps/web/public/scoring/baselines.json", import.meta.url),
);

const SCENARIO_IDS: readonly ScenarioId[] = [
  "jezero-outpost",
  "first-light",
  "the-long-night",
];

const DIFFICULTIES: readonly MissionDifficulty[] = [
  "training",
  "nominal",
  "flightRated",
];

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
}

function runAndScore(
  scenario: Scenario,
  difficulty: MissionDifficulty,
  seed: number,
  bot: Bot,
): number {
  const params = {
    scenarioId: scenario.id,
    seed,
    crewSize: scenario.crewSize,
    missionStartIso: "2033-01-01",
    difficulty,
  };
  const state = createInitialState(params);
  runWithBot(state, params, scenario, scenario.durationHours, bot);
  const score = scoreMission(state.log, state, scenario, difficulty);
  return score.total;
}

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log("Generating bot scoring baselines for M9.4...");

  const distributions: Record<string, number[]> = {};
  const medians: Record<
    string,
    { prudentBotMedian: number; greedyBotMedian: number; idleBotMedian: number }
  > = {};

  for (const scenarioId of SCENARIO_IDS) {
    const scenario = SCENARIOS[scenarioId];
    if (scenario === undefined) continue;

    for (const difficulty of DIFFICULTIES) {
      const bucketKey = `${scenarioId}:${difficulty}`;
      console.log(`Simulating bucket: ${bucketKey}...`);

      const idleScores: number[] = [];
      const greedyScores: number[] = [];
      const prudentScores: number[] = [];

      // 50 runs of idleBot (seeds 1..50)
      for (let seed = 1; seed <= 50; seed++) {
        idleScores.push(runAndScore(scenario, difficulty, seed, idleBot));
      }

      // 75 runs of greedyBot (seeds 1..75)
      for (let seed = 1; seed <= 75; seed++) {
        greedyScores.push(runAndScore(scenario, difficulty, seed, greedyBot));
      }

      // 75 runs of prudentBot (seeds 1..75)
      for (let seed = 1; seed <= 75; seed++) {
        prudentScores.push(runAndScore(scenario, difficulty, seed, prudentBot));
      }

      idleScores.sort((a, b) => a - b);
      greedyScores.sort((a, b) => a - b);
      prudentScores.sort((a, b) => a - b);

      // Total 200 bot scores in the baseline distribution
      const combinedDistribution = [...idleScores, ...greedyScores, ...prudentScores].sort(
        (a, b) => a - b,
      );

      distributions[bucketKey] = combinedDistribution;
      medians[bucketKey] = {
        prudentBotMedian: median(prudentScores),
        greedyBotMedian: median(greedyScores),
        idleBotMedian: median(idleScores),
      };

      console.log(
        `  -> ${bucketKey}: idle median=${medians[bucketKey]!.idleBotMedian}, greedy median=${medians[bucketKey]!.greedyBotMedian}, prudent median=${medians[bucketKey]!.prudentBotMedian}`,
      );
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    distributions,
    medians,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Wrote ${OUT_PATH} in ${elapsedSec}s.`);
}

main().catch((err) => {
  console.error("Failed to generate baselines:", err);
  process.exit(1);
});
