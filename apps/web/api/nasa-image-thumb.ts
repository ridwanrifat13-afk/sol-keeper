/**
 * GET /api/nasa-image-thumb?url=<images-assets.nasa.gov thumbnail URL>
 *
 * A thin same-origin re-serve of exactly one thing: images-assets.nasa.gov sends no
 * Access-Control-Allow-Origin header, so a photo from there displays fine in a plain <img>
 * (FactCardGallery.tsx already does this across the station consoles) but cannot be loaded
 * as a WebGL texture — the browser refuses the cross-origin fetch outright before the pixels
 * ever reach the GPU. Re-fetching the same bytes through this project's own origin makes the
 * request same-origin, which is what StationImageGallery.tsx's three.js gallery needs.
 *
 * `url` is never a free-text path (brief: "/api functions are not open proxies") —
 * parseNasaImageUrlParam only accepts the exact shape every thumbUrl /api/nasa-images (and
 * its snapshots) actually returns, rejecting any other host, scheme, or path with HTTP 400.
 */
import { badRequest, CDN_CACHE, fetchWithTimeout, upstreamFailed } from "../server-lib/http.js";
import { parseNasaImageUrlParam } from "../server-lib/validate.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseNasaImageUrlParam(url.searchParams.get("url"));
  if (!parsed.ok) return badRequest(parsed.error);

  try {
    const upstream = await fetchWithTimeout(parsed.value);
    if (!upstream.ok) throw new Error(`Image CDN responded ${upstream.status}`);
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": CDN_CACHE,
      },
    });
  } catch (err) {
    return upstreamFailed(err instanceof Error ? err.message : "Image CDN request failed");
  }
}
