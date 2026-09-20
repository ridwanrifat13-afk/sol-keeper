/**
 * GET /api/light-time?body=mars|moon&date=YYYY-MM-DD
 *
 * How far away Earth is right now, and how long a radio signal takes to get there —
 * both keyless (JPL Horizons), routed through this endpoint only because Horizons has no
 * CORS headers for a browser to call it directly.
 */
import { badRequest, CDN_CACHE, fetchWithTimeout, json, nowIso, upstreamFailed } from "../server-lib/http.js";
import { buildHorizonsUrl, nextDay, parseHorizonsResult } from "../server-lib/horizons.js";
import { parseBodyParam, parseDateParam } from "../server-lib/validate.js";
import type { LightTimeResponse } from "../server-lib/types.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = parseBodyParam(url.searchParams.get("body"));
  if (!body.ok) return badRequest(body.error);
  const date = parseDateParam(url.searchParams.get("date"));
  if (!date.ok) return badRequest(date.error);

  try {
    const horizonsUrl = buildHorizonsUrl(body.value, date.value, nextDay(date.value));
    const res = await fetchWithTimeout(horizonsUrl);
    if (!res.ok) throw new Error(`Horizons responded ${res.status}`);
    const raw = (await res.json()) as { result?: unknown };
    if (typeof raw.result !== "string") throw new Error("Horizons response missing a text result field");

    const distance = parseHorizonsResult(raw.result);
    const responseBody: LightTimeResponse = {
      source: "live",
      fetchedAt: nowIso(),
      body: body.value,
      ...distance,
    };
    return json(responseBody, { cacheControl: CDN_CACHE });
  } catch (err) {
    return upstreamFailed(err instanceof Error ? err.message : "Horizons request failed");
  }
}
