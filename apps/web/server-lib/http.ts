/**
 * Response helpers for the Vercel Functions.
 *
 * Lives in server-lib rather than api/ so it is never deployed as an endpoint of its own.
 */
import type { ApiError } from "./types";

/**
 * Cache policy from the brief: Vercel's CDN serves a response for six hours and may serve a
 * stale one for a day while it refreshes. That is what keeps the project far below NASA's
 * rate limits no matter how many people open the game.
 */
export const CDN_CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";

/** No caching, for health checks and anything that must reflect the current deploy. */
export const NO_CACHE = "no-store";

export function json<T>(body: T, init: { status?: number; cacheControl?: string } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": init.cacheControl ?? CDN_CACHE,
    },
  });
}

/** HTTP 400 — the caller sent something outside the whitelist. Never cached. */
export function badRequest(message: string): Response {
  const body: ApiError = { error: message };
  return json(body, { status: 400, cacheControl: NO_CACHE });
}

/**
 * HTTP 502 — a NASA service failed or timed out. The client already has the committed
 * snapshot on screen, so `fallback` tells it to keep showing that and label it accordingly.
 */
export function upstreamFailed(message: string): Response {
  const body: ApiError = { error: message, fallback: "snapshot" };
  return json(body, { status: 502, cacheControl: NO_CACHE });
}

/**
 * Fetch with a hard deadline (brief: 8 s upstream timeout).
 *
 * Without this a slow NASA endpoint holds the function open until Vercel kills it, which
 * costs the caller the whole maxDuration and returns nothing useful.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** ISO timestamp for the `fetchedAt` field. */
export const nowIso = (): string => new Date().toISOString();
