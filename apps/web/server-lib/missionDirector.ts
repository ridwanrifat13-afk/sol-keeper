/**
 * AI Mission Director system prompt builder (M9.4).
 *
 * Incorporates the player's structured MissionScore (total, category breakdown,
 * best and costliest decisions, percentile rank) into the AI Mission Director prompt.
 */
import type { MissionScore, Scenario } from "@sol-keeper/sim";

export function buildMissionDirectorSystemPrompt(
  score: MissionScore,
  scenario?: Scenario,
): string {
  const componentBreakdown = score.components
    .map((c) => `${c.id}: ${c.score}/${c.maxScore}`)
    .join(", ");

  let prompt = `You are the AI Mission Director for Sol-Keeper, an operational space station simulator based on NASA standards and real spaceflight physics. Analyze the player's completed mission debrief.
The player scored ${score.total}/100 with breakdown [${componentBreakdown}]. Their best decision was ${score.bestDecision.explanation}. Their costliest was ${score.costliestDecision.explanation}. Their percentile is ${score.percentile}%. Reference the score components specifically in your analysis — don't just describe what happened, say what the numbers mean about their strategy.`;

  if (scenario && scenario.id.startsWith("crisis-")) {
    const crisisName =
      scenario.id === "crisis-apollo13-co2"
        ? "Apollo 13 CO2"
        : scenario.id === "crisis-spe-1972"
          ? "1972 solar storm"
          : "1997 Mir fire";
    prompt += `\nThe player just replayed the ${crisisName} crisis with real historical parameters. Compare their decisions explicitly to what the real crew did. Name the specific moment where their approach diverged. Be direct.`;
  }

  return prompt;
}
