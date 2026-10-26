/**
 * POST /api/mission-debrief
 *
 * M9.4: Integrates the player's MissionScore into the AI Mission Director debrief pipeline.
 * Accepts a JSON body containing { score, scenario?, log? }, validates the score payload,
 * generates the system prompt using buildMissionDirectorSystemPrompt, and returns the response.
 */
import type { MissionScore } from "@sol-keeper/sim";
import { badRequest, json, NO_CACHE } from "../server-lib/http.js";
import { buildMissionDirectorSystemPrompt } from "../server-lib/missionDirector.js";
import type { MissionDebriefRequest, MissionDebriefResponse } from "../server-lib/types.js";

interface ScorePayload {
  readonly total?: unknown;
  readonly grade?: unknown;
  readonly components?: unknown;
  readonly bestDecision?: { readonly explanation?: unknown };
  readonly costliestDecision?: { readonly explanation?: unknown };
  readonly percentile?: unknown;
}

function isValidScore(score: unknown): score is MissionScore {
  if (!score || typeof score !== "object") return false;
  const s = score as ScorePayload;
  return (
    typeof s.total === "number" &&
    typeof s.grade === "string" &&
    Array.isArray(s.components) &&
    s.bestDecision != null &&
    typeof s.bestDecision.explanation === "string" &&
    s.costliestDecision != null &&
    typeof s.costliestDecision.explanation === "string" &&
    typeof s.percentile === "number"
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: MissionDebriefRequest;
  try {
    body = (await request.json()) as MissionDebriefRequest;
  } catch {
    return badRequest("Malformed JSON body");
  }

  if (!isValidScore(body?.score)) {
    return badRequest("Invalid or missing MissionScore payload");
  }

  const systemPrompt = buildMissionDirectorSystemPrompt(body.score, body.scenario);

  const responseBody: MissionDebriefResponse = {
    systemPrompt,
    scoreSummary: {
      total: body.score.total,
      grade: body.score.grade,
      percentile: body.score.percentile,
    },
  };

  return json(responseBody, { cacheControl: NO_CACHE });
}
