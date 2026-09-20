/**
 * Query-parameter whitelisting and range checks (brief: "/api functions are not open
 * proxies — whitelist every query parameter, validate type and range, reject anything
 * else with HTTP 400").
 *
 * Each parser returns a discriminated result rather than throwing, so a handler can
 * build one `badRequest` message that names exactly what was wrong.
 */

export type ParseResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const ok = <T>(value: T): ParseResult<T> => ({ ok: true, value });
const fail = (error: string): ParseResult<never> => ({ ok: false, error });

/** `days` for /api/space-weather: an integer from 1 to 60 inclusive. */
export function parseDaysParam(raw: string | null): ParseResult<number> {
  if (raw === null) return ok(7);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 60) {
    return fail(`days must be an integer from 1 to 60, got ${JSON.stringify(raw)}`);
  }
  return ok(n);
}

export type ApiBody = "mars" | "moon";

/** `body` for /api/light-time: one of exactly two known targets. */
export function parseBodyParam(raw: string | null): ParseResult<ApiBody> {
  if (raw === "mars" || raw === "moon") return ok(raw);
  return fail(`body must be "mars" or "moon", got ${JSON.stringify(raw)}`);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `date` for /api/light-time: a plain YYYY-MM-DD calendar date, not free text. */
export function parseDateParam(raw: string | null): ParseResult<string> {
  if (raw === null || !DATE_PATTERN.test(raw)) {
    return fail(`date must be YYYY-MM-DD, got ${JSON.stringify(raw)}`);
  }
  // Reject a string that matches the pattern but isn't a real calendar date, e.g. 2026-02-30.
  const [y, m, d] = raw.split("-").map(Number);
  const asDate = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
  const roundTrips =
    asDate.getUTCFullYear() === y && asDate.getUTCMonth() === (m as number) - 1 && asDate.getUTCDate() === d;
  if (!roundTrips) return fail(`date must be a real calendar date, got ${JSON.stringify(raw)}`);
  return ok(raw);
}

/**
 * `q` for /api/nasa-images: a fixed topic whitelist, never a free-text search string —
 * an open `q` would make this endpoint an unrestricted proxy onto images-api.nasa.gov.
 */
export const IMAGE_QUERY_WHITELIST = {
  moxie: "MOXIE",
  "iss-water": "ISS water recovery",
  veggie: "Veggie plant growth",
  artemis: "Artemis",
  rad: "Mars radiation",
  "lunar-south-pole": "lunar south pole",
} as const;

export type ImageQueryKey = keyof typeof IMAGE_QUERY_WHITELIST;

export function parseImageQueryParam(raw: string | null): ParseResult<ImageQueryKey> {
  if (raw !== null && Object.hasOwn(IMAGE_QUERY_WHITELIST, raw)) {
    return ok(raw as ImageQueryKey);
  }
  const allowed = Object.keys(IMAGE_QUERY_WHITELIST).join(", ");
  return fail(`q must be one of: ${allowed}; got ${JSON.stringify(raw)}`);
}
