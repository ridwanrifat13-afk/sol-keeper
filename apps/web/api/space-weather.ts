/**
 * GET /api/space-weather?days=1..60
 *
 * "Live Sky": real recent solar activity from DONKI, normalized across its four event
 * types. Empty arrays from DONKI are normal in a quiet period — that is the client's cue
 * to fall back to a labeled "historical event" from the committed snapshot, not a bug here.
 */
import { badRequest, CDN_CACHE, fetchWithTimeout, json, nowIso, upstreamFailed } from "../server-lib/http.js";
import { mergeSpaceWeatherEvents, normalizeDonkiEvents } from "../server-lib/donki.js";
import { parseDaysParam } from "../server-lib/validate.js";
import type { SpaceWeatherResponse, SpaceWeatherType } from "../server-lib/types.js";

const DONKI_TYPES: readonly SpaceWeatherType[] = ["FLR", "SEP", "CME", "GST"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const days = parseDaysParam(url.searchParams.get("days"));
  if (!days.ok) return badRequest(days.error);

  const apiKey = process.env["NASA_API_KEY"];
  if (!apiKey) {
    // Server misconfiguration, not a caller error — never surface this as a 400.
    return upstreamFailed("NASA_API_KEY is not configured");
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - days.value);

  try {
    const results = await Promise.all(
      DONKI_TYPES.map(async (type) => {
        const params = new URLSearchParams({
          startDate: isoDate(startDate),
          endDate: isoDate(endDate),
          api_key: apiKey,
        });
        const res = await fetchWithTimeout(`https://api.nasa.gov/DONKI/${type}?${params.toString()}`);
        if (!res.ok) throw new Error(`DONKI ${type} responded ${res.status}`);
        const raw: unknown = await res.json();
        return [type, normalizeDonkiEvents(type, raw)] as const;
      }),
    );

    const byType = Object.fromEntries(results) as Record<SpaceWeatherType, ReturnType<typeof normalizeDonkiEvents>>;
    const body: SpaceWeatherResponse = {
      source: "live",
      fetchedAt: nowIso(),
      events: mergeSpaceWeatherEvents(byType),
    };
    return json(body, { cacheControl: CDN_CACHE });
  } catch (err) {
    return upstreamFailed(err instanceof Error ? err.message : "DONKI request failed");
  }
}
