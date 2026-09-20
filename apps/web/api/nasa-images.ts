/**
 * GET /api/nasa-images?q=<whitelisted topic key>
 *
 * Real mission photos for a fixed set of topics — `q` is never a free-text search string
 * (see server-lib/validate.ts's IMAGE_QUERY_WHITELIST), so this can never become an open
 * proxy onto images-api.nasa.gov.
 */
import { badRequest, CDN_CACHE, fetchWithTimeout, json, nowIso, upstreamFailed } from "../server-lib/http.js";
import { normalizeImagesResponse } from "../server-lib/images.js";
import { IMAGE_QUERY_WHITELIST, parseImageQueryParam } from "../server-lib/validate.js";
import type { NasaImagesResponse } from "../server-lib/types.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = parseImageQueryParam(url.searchParams.get("q"));
  if (!q.ok) return badRequest(q.error);

  try {
    const params = new URLSearchParams({ q: IMAGE_QUERY_WHITELIST[q.value], media_type: "image" });
    const res = await fetchWithTimeout(`https://images-api.nasa.gov/search?${params.toString()}`);
    if (!res.ok) throw new Error(`Images API responded ${res.status}`);
    const raw = await res.json();

    const body: NasaImagesResponse = {
      source: "live",
      fetchedAt: nowIso(),
      items: normalizeImagesResponse(raw).slice(0, 12),
    };
    return json(body, { cacheControl: CDN_CACHE });
  } catch (err) {
    return upstreamFailed(err instanceof Error ? err.message : "Images API request failed");
  }
}
