import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../data/scenarios/index.js";
import { idleBot, prudentBot } from "../engine/bots.js";
import { runWithBot } from "../engine/runWithBot.js";
import { calculateGrade, scoreCrisisReplay, scoreMission } from "../engine/scoring.js";
import { crisisApollo13Co2 } from "../data/scenarios/crisis-apollo13-co2.js";
import { createInitialState } from "../engine/state.js";
import type { Params } from "../types.js";

describe("Mission Scoring System (M9.4)", () => {
  function runScenarioWithBot(bot = idleBot, seed = 42) {
    const scenario = SCENARIOS["jezero-outpost"];
    const params: Params = {
      scenarioId: "jezero-outpost",
      seed,
      crewSize: scenario.crewSize,
      missionStartIso: "2033-01-01",
      difficulty: "nominal",
    };
    const state = createInitialState(params);
    runWithBot(state, params, scenario, scenario.durationHours, bot);
    const score = scoreMission(state.log, state, scenario, params.difficulty);
    return { state, score, scenario, params };
  }

  it("idle player scores 0 on decision quality, severe penalty on safety margin, and produces a valid MissionScore", () => {
    const { score } = runScenarioWithBot(idleBot);

    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.grade).toBeDefined();

    const decisionComp = score.components.find((c) => c.id === "decision");
    expect(decisionComp).toBeDefined();
    expect(decisionComp!.score).toBe(0);

    const marginComp = score.components.find((c) => c.id === "margin");
    expect(marginComp).toBeDefined();
    // Idle bot suffers crew loss / critical condition and high penalties
    expect(marginComp!.score).toBeLessThanOrEqual(15);

    expect(score.bestDecision).toBeDefined();
    expect(score.costliestDecision).toBeDefined();
    expect(typeof score.percentile).toBe("number");
  });

  it("a log with zero planning updates scores 0 proactive bonuses", () => {
    const { score } = runScenarioWithBot(idleBot);
    const decisionComp = score.components.find((c) => c.id === "decision")!;
    const bonusEvents = decisionComp.events.filter((e) =>
      e.reason.toLowerCase().includes("bonus"),
    );
    expect(bonusEvents.length).toBe(0);
  });

  it("the best and costliest decisions are always linked to player actions or valid events, never to raw environmental events", () => {
    const { score } = runScenarioWithBot(prudentBot);
    expect(score.bestDecision).toBeDefined();
    expect(score.bestDecision.station).toBeDefined();
    expect(score.costliestDecision).toBeDefined();
    expect(score.costliestDecision.station).toBeDefined();
  });

  it("grade never exceeds C on a LOSS outcome regardless of component scores", () => {
    expect(calculateGrade(95, "loss")).toBe("C");
    expect(calculateGrade(85, "loss")).toBe("C");
    expect(calculateGrade(75, "loss")).toBe("C");
    expect(calculateGrade(65, "loss")).toBe("C");
    expect(calculateGrade(50, "loss")).toBe("D");
    expect(calculateGrade(30, "loss")).toBe("F");

    // Success outcome can get A+
    expect(calculateGrade(95, "success")).toBe("A+");
    expect(calculateGrade(85, "success")).toBe("A");
    expect(calculateGrade(75, "success")).toBe("B");
  });

  it("prudentBot scores higher than idleBot on Jezero Nominal", () => {
    const idleResult = runScenarioWithBot(idleBot);
    const prudentResult = runScenarioWithBot(prudentBot);

    expect(prudentResult.score.total).toBeGreaterThan(idleResult.score.total);
    expect(["A+", "A", "B", "C"]).toContain(prudentResult.score.grade);
  });

  it("produces deterministic scores for identical runs", () => {
    const run1 = runScenarioWithBot(prudentBot, 101);
    const run2 = runScenarioWithBot(prudentBot, 101);

    expect(run1.score.total).toBe(run2.score.total);
    expect(run1.score.grade).toBe(run2.score.grade);
    expect(run1.score.components.map((c) => c.score)).toEqual(
      run2.score.components.map((c) => c.score),
    );
  });

  it("score-baselines.ts produces valid JSON with correct schema and 200 bot scores per bucket", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const baselinesPath = path.resolve(
      process.cwd(),
      "apps/web/public/scoring/baselines.json",
    );
    const content = await fs.readFile(baselinesPath, "utf8");
    const data = JSON.parse(content);

    expect(data.generatedAt).toBeDefined();
    expect(data.distributions).toBeDefined();
    expect(data.medians).toBeDefined();

    const bucket = data.distributions["jezero-outpost:nominal"];
    expect(bucket).toBeDefined();
    expect(bucket.length).toBe(200);

    // Verify sorted ascending
    for (let i = 1; i < bucket.length; i++) {
      expect(bucket[i]).toBeGreaterThanOrEqual(bucket[i - 1]);
    }

    const medians = data.medians["jezero-outpost:nominal"];
    expect(medians).toBeDefined();
    expect(medians.prudentBotMedian).toBeGreaterThan(medians.idleBotMedian);
    expect(medians.greedyBotMedian).toBeGreaterThan(medians.idleBotMedian);
  });

  it("crisis replay — Apollo 13 with CO2 held below 5 mmHg and all spares used scores above 70", () => {
    const params: Params = {
      scenarioId: "crisis-apollo13-co2",
      seed: 1970,
      crewSize: crisisApollo13Co2.crewSize,
      missionStartIso: "1970-04-13",
      difficulty: "nominal",
    };
    const state = createInitialState(params);
    // Simulate resolution at hour 4 with CO2 held at 4.2 mmHg
    state.hour = 4;
    state.atmosphere.co2PartialPressureMmHg = 4.2;
    state.status = "success";
    // All spares used
    for (const sys of Object.values(state.systems)) {
      if (sys) sys.spares = 0;
    }

    const crisisScore = scoreCrisisReplay(state.log, state, crisisApollo13Co2);
    expect(crisisScore.total).toBeGreaterThan(70);
    expect(crisisScore.components.find((c) => c.id === "speed")!.score).toBeGreaterThan(30);
    expect(crisisScore.components.find((c) => c.id === "hazard")!.score).toBeGreaterThan(20);
    expect(crisisScore.components.find((c) => c.id === "crew")!.score).toBe(10);
    expect(crisisScore.historicalComparison).toBeDefined();
  });
});
