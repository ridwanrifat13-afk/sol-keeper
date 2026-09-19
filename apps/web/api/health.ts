/**
 * GET /api/health
 *
 * More than a liveness probe. The risky part of this monorepo is whether the
 * `@sol-keeper/sim` workspace package resolves inside a deployed function — Vercel bundles
 * `api/` with its own Node builder, which resolves through node_modules rather than through
 * Vite's aliases. If that were to break, the symptom would otherwise not appear until M5
 * when the real endpoints start importing shared code.
 *
 * So this endpoint imports the sim and reports what it found. A deploy where the workspace
 * link is broken fails here, loudly, on the first request after the first deploy.
 */
import { CONSTANTS, SCENARIOS, walkConstants } from "@sol-keeper/sim";
import { NO_CACHE, json, nowIso } from "../server-lib/http";
import type { HealthResponse } from "../server-lib/types";

export async function GET(_request: Request): Promise<Response> {
  const body: HealthResponse = {
    status: "ok",
    service: "sol-keeper",
    source: "live",
    fetchedAt: nowIso(),
    sim: {
      resolved: true,
      constantCount: walkConstants(CONSTANTS).length,
      scenarioIds: Object.keys(SCENARIOS),
    },
  };
  return json(body, { cacheControl: NO_CACHE });
}
