import { describe, expect, it } from "vitest";
import { POST } from "../api/mission-debrief.js";
import { NO_CACHE } from "../server-lib/http.js";
import type { MissionScore, Scenario } from "@sol-keeper/sim";
import type { MissionDebriefResponse } from "../server-lib/types.js";

const mockScore: MissionScore = {
  total: 82.5,
  grade: "B",
  components: [
    { id: "outcome", label: "scoring.component.outcome", score: 30, maxScore: 30, events: [] },
    { id: "margin", label: "scoring.component.margin", score: 20, maxScore: 25, events: [] },
    { id: "decision", label: "scoring.component.decision", score: 18, maxScore: 25, events: [] },
    { id: "efficiency", label: "scoring.component.efficiency", score: 7.5, maxScore: 10, events: [] },
    { id: "welfare", label: "scoring.component.welfare", score: 7, maxScore: 10, events: [] },
  ],
  bestDecision: {
    sol: 1,
    station: "lifeSupport",
    chosenOption: "scrubber",
    alternativeOption: "none",
    netEffect: 10,
    explanation: "Priority diverted to scrubber maintaining nominal atmosphere",
  },
  costliestDecision: {
    sol: 2,
    station: "power",
    chosenOption: "auxHeater",
    alternativeOption: "none",
    netEffect: -8,
    explanation: "Unnecessary auxiliary heater left active during solar eclipse",
  },
  baselineComparison: {
    prudentBotMedian: 75.4,
    greedyBotMedian: 67.1,
    idleBotMedian: 28.8,
  },
  percentile: 74,
  isCrisisReplay: false,
};

describe("POST /api/mission-debrief", () => {
  it("returns 200 with synthesized AI prompt for valid mission score", async () => {
    const request = new Request("https://example.test/api/mission-debrief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: mockScore }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(NO_CACHE);

    const body = (await response.json()) as MissionDebriefResponse;
    expect(body.scoreSummary).toEqual({
      total: 82.5,
      grade: "B",
      percentile: 74,
    });
    expect(body.systemPrompt).toContain("The player scored 82.5/100");
    expect(body.systemPrompt).toContain("outcome: 30/30, margin: 20/25, decision: 18/25");
    expect(body.systemPrompt).toContain("Their best decision was Priority diverted to scrubber");
    expect(body.systemPrompt).toContain("Their costliest was Unnecessary auxiliary heater");
    expect(body.systemPrompt).toContain("Their percentile is 74%");
    expect(body.systemPrompt).not.toContain("replayed the");
  });

  it("includes crisis replay instructions when a crisis scenario is provided", async () => {
    const crisisScenario = {
      id: "crisis-apollo13-co2",
      body: "moon",
    } as unknown as Scenario;

    const request = new Request("https://example.test/api/mission-debrief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: mockScore, scenario: crisisScenario }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = (await response.json()) as MissionDebriefResponse;
    expect(body.systemPrompt).toContain("The player just replayed the Apollo 13 CO2 crisis with real historical parameters.");
    expect(body.systemPrompt).toContain("Compare their decisions explicitly to what the real crew did.");
  });

  it("rejects invalid or missing score payload with 400 badRequest", async () => {
    const request = new Request("https://example.test/api/mission-debrief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: { total: 50 } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid or missing MissionScore payload" });
  });

  it("rejects malformed JSON body with 400 badRequest", async () => {
    const request = new Request("https://example.test/api/mission-debrief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not a valid json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Malformed JSON body" });
  });
});
