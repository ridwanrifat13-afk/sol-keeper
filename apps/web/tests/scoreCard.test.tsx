import { describe, expect, it } from "vitest";
import "../src/i18n/config.js";
import { renderToString } from "react-dom/server";
import { ScoreCard } from "../src/components/debrief/ScoreCard.js";
import { SCENARIOS, createInitialState, prudentBot, runWithBot, scoreMission } from "@sol-keeper/sim";

describe("ScoreCard Component (M9.4)", () => {
  function getSampleScore() {
    const scenario = SCENARIOS["jezero-outpost"];
    const params = {
      scenarioId: "jezero-outpost" as const,
      seed: 42,
      crewSize: scenario.crewSize,
      missionStartIso: "2033-01-01",
      difficulty: "nominal" as const,
    };
    const state = createInitialState(params);
    runWithBot(state, params, scenario, scenario.durationHours, prudentBot);
    return scoreMission(state.log, state, scenario, params.difficulty);
  }

  function render(el: React.ReactElement): string {
    return renderToString(el).replace(/<!--.*?-->/g, "");
  }

  it("renders total score, evaluation grade, and category breakdown", () => {
    const score = getSampleScore();
    const html = render(<ScoreCard score={score} />);

    // Total score and grade
    expect(html).toContain(String(score.total));
    expect(html).toContain(score.grade);
    expect(html).toContain("Mission Performance Score");

    // Category progress bars
    expect(html).toContain("Category Evaluation");
    expect(html).toContain("Mission Outcome");
    expect(html).toContain("Safety Margin");
    expect(html).toContain("Decision Quality");
    expect(html).toContain("Resource Efficiency");
    expect(html).toContain("Crew Welfare");

    // Highlighted decisions
    expect(html).toContain("Best Decision");
    expect(html).toContain("Critical Friction Point");
  });
});
