/**
 * Regenerates the offline fallback files under apps/web/public/snapshots/.
 *
 * Run locally by the lead developer, against `vercel dev` (which loads NASA_API_KEY from
 * .env.local) or a deployed URL — never by Claude, which has no key. This script calls this
 * project's own /api/* endpoints rather than re-implementing their parsing: that way a
 * snapshot can never drift from what the live endpoint actually returns, and this file
 * itself never touches NASA_API_KEY.
 *
 * Usage:
 *   vercel dev &                                  # in one terminal
 *   node scripts/fetch-snapshots.ts                # in another (defaults to localhost:3000)
 *   BASE_URL=https://<preview>.vercel.app node scripts/fetch-snapshots.ts
 *
 * Space weather is the one endpoint where "whatever's live right now" can be a bad
 * snapshot: DONKI is genuinely empty in quiet periods, and an empty snapshot defeats the
 * whole point of a fallback (the brief calls for showing a labeled "historical event"
 * instead). If a refresh comes back empty, this script leaves the existing
 * space-weather.json in place rather than overwriting a real historical event with nothing.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:3000";
const OUT_DIR = fileURLToPath(new URL("../apps/web/public/snapshots/", import.meta.url));

const IMAGE_QUERY_KEYS = ["moxie", "iss-water", "veggie", "artemis", "rad", "lunar-south-pole"];

interface SourcedBody {
  readonly source: string;
  readonly [key: string]: unknown;
}

async function fetchJson(path: string): Promise<SourcedBody> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} responded ${res.status}: ${text}`);
  }
  return (await res.json()) as SourcedBody;
}

async function writeSnapshot(outFile: string, body: SourcedBody): Promise<void> {
  const snapshot = { ...body, source: "snapshot" };
  await writeFile(`${OUT_DIR}${outFile}`, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
  console.log(`wrote ${outFile}`);
}

async function refreshSpaceWeather(): Promise<void> {
  const body = await fetchJson("/api/space-weather?days=30");
  const events = body["events"];
  if (!Array.isArray(events) || events.length === 0) {
    console.log("space-weather: live window is empty (a quiet period) — keeping the existing snapshot");
    return;
  }
  await writeSnapshot("space-weather.json", body);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  await refreshSpaceWeather();

  const today = new Date().toISOString().slice(0, 10);
  await writeSnapshot("light-time-mars.json", await fetchJson(`/api/light-time?body=mars&date=${today}`));
  await writeSnapshot("light-time-moon.json", await fetchJson(`/api/light-time?body=moon&date=${today}`));

  for (const key of IMAGE_QUERY_KEYS) {
    await writeSnapshot(`nasa-images-${key}.json`, await fetchJson(`/api/nasa-images?q=${key}`));
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
