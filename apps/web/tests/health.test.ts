/**
 * Contract test for GET /api/health.
 *
 * Deliberately *not* in apps/web/api/, because Vercel turns every file under api/ into a
 * deployed endpoint — a test file there would ship as a public function.
 *
 * What this actually guards is the monorepo seam: the handler imports @sol-keeper/sim, and
 * Vercel's Node builder resolves that through node_modules rather than through Vite's
 * config. If the workspace link ever breaks, this fails here rather than silently at M5.
 */
import { describe, expect, it } from "vitest";
import { GET } from "../api/health.js";
import { CDN_CACHE, NO_CACHE, badRequest, json, upstreamFailed } from "../server-lib/http.js";
import type { HealthResponse } from "../server-lib/types.js";

describe("GET /api/health", () => {
  it("returns 200 with the sim resolved", async () => {
    const response = await GET(new Request("https://example.test/api/health"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as HealthResponse;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("sol-keeper");
    expect(body.sim.resolved).toBe(true);
  });

  it("proves the @sol-keeper/sim workspace package resolved inside the function", async () => {
    const response = await GET(new Request("https://example.test/api/health"));
    const body = (await response.json()) as HealthResponse;

    // A broken workspace link would throw on import; a stubbed one would report nothing.
    expect(body.sim.constantCount).toBeGreaterThan(80);
    expect(body.sim.scenarioIds).toContain("jezero-outpost");
  });

  it("is never cached, so it reflects the deploy actually serving it", async () => {
    const response = await GET(new Request("https://example.test/api/health"));
    expect(response.headers.get("cache-control")).toBe(NO_CACHE);
  });

  it("returns a parseable ISO timestamp", async () => {
    const response = await GET(new Request("https://example.test/api/health"));
    const body = (await response.json()) as HealthResponse;
    expect(Number.isNaN(Date.parse(body.fetchedAt))).toBe(false);
  });
});

describe("server-lib/http helpers", () => {
  it("json() sets the CDN cache policy the brief specifies by default", async () => {
    const response = json({ ok: true });
    expect(response.headers.get("cache-control")).toBe(CDN_CACHE);
    expect(CDN_CACHE).toContain("s-maxage=21600");
    expect(CDN_CACHE).toContain("stale-while-revalidate=86400");
  });

  it("badRequest() is a 400 that is never cached", async () => {
    const response = badRequest("days must be between 1 and 60");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe(NO_CACHE);
    expect(await response.json()).toEqual({ error: "days must be between 1 and 60" });
  });

  it("upstreamFailed() is a 502 that tells the client to keep its snapshot", async () => {
    const response = upstreamFailed("DONKI timed out");
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "DONKI timed out", fallback: "snapshot" });
  });
});
