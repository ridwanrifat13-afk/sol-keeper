# Sol Keeper — working rules

Junior Astronaut Mission Trainer for NASA Space Apps Challenge 2026.
Full context: `docs/PROJECT_BRIEF.md`. Architecture: `docs/ARCHITECTURE.md`.
Data provenance: `docs/DATA_SOURCES.md`.

This repo root is both the git root and the pnpm workspace root.

## The seven non-negotiable rules

1. **Never invent a physical or mission parameter.** Every one lives in
   `packages/sim/src/data/constants.ts` as
   `{ value, unit, min?, max?, source, url?, confidence, note? }` where `confidence` is
   `"measured" | "derived" | "tuned" | "placeholder"`. If a needed value is missing, add it
   as `"placeholder"` with a TODO and list it in the milestone summary. Never guess silently.
   `source` must be a `SourceId` that exists in `packages/sim/src/data/sources.ts` and in
   the table in `docs/DATA_SOURCES.md`.
2. **`packages/sim` is pure TypeScript.** No DOM, no React, no `fetch`, no `Date.now()`,
   no `Math.random()`, no `node:*` imports. The seeded RNG and the clock are injected.
   Same seed + same inputs = byte-identical run. ESLint and `validation/purity.test.ts`
   enforce this; do not disable either.
3. **Units in every name** — `o2Kg`, `powerKw`, `energyKwh`, `doseMSv`,
   `co2PartialPressureMmHg`. The tick is one hour. 1 Mars sol = 24.6597 h, converted
   explicitly through `units.ts`, never inlined as a magic number.
4. **The event log is append-only and causal.** Entries carry `causedBy: EventId[]` so the
   Black Box debrief can rebuild the chain behind a failure. The log stores stable `code`
   strings and numeric `data`, **never rendered prose** — wording is a presentation concern
   (Reality Dial level × locale).
5. **No NASA logo, insignia, or "meatball" anywhere** (Space Apps branding rule). All data
   is credited in text on the Data Sources screen.
6. **Accessibility.** Never convey state by color alone: icon + pattern + text. Must run on
   a low-end Android phone and work offline after first load.
7. **Milestone by milestone.** At each milestone end: run tests, typecheck, lint, and
   `vercel build` (once Vercel is configured); commit; then STOP with a short summary of
   what was built, what is placeholder, and what the lead developer must verify or do
   manually. **Ask before adding any dependency** not already listed in the brief.

## SIM_VERSION (M10)

`packages/sim/src/version.ts`'s `SIM_VERSION` is a compatibility token a shared run link
carries, not a modelled quantity — rule 1 has nothing to say about it. **Bump it** whenever a
change to `packages/sim` could change the numbers a run produces: `engine/tick.ts`'s
`PIPELINE` or its order, anything in `models/`, any value in `data/constants.ts` or
`data/scenarios/`, the incident catalog or its responses, the RNG or the number/order of
draws it makes, `engine/state.ts`'s initial state, or `engine/setup.ts`'s sizing. **Never**
bump it for `apps/web`, i18n, styling, or docs — none of those can move a single number this
package computes. `validation/simVersion.test.ts` pins golden fingerprints against it; a
failure there means bump-and-update, not "fix the test by accepting whatever changed."

## Secrets

- The only secret is `NASA_API_KEY`. It lives in the Vercel dashboard and in a local
  `.env.local` that the lead developer pulls with `vercel env pull .env.local`.
- **Never ask for the key. Never `cat`, print, echo, or write any `.env` file.**
  Reference it in shell only as `$NASA_API_KEY`.
- Read it **only** as `process.env.NASA_API_KEY` inside `apps/web/api/`. **Never** prefix it
  with `VITE_` — that would bundle it into client code.
- Claude's environment does not have the key. For DONKI, build and test against
  `docs/api-samples/*.json` only. Keyless endpoints (`ssd.jpl.nasa.gov`,
  `images-api.nasa.gov`, `trek.nasa.gov`) may be curled directly. From M5 on, key-based
  calls are tested only through `vercel dev`.
- `/api` functions are not open proxies: whitelist every query parameter, validate type and
  range, reject anything else with HTTP 400.

## Layout

```
packages/sim/     @sol-keeper/sim — pure simulation, built to dist/
apps/web/         Vite + React 18 + Zustand; api/ = Vercel Functions; server-lib/ = shared
                  server code (never deployed as endpoints)
scripts/          local-only tooling run by the lead developer
docs/             brief, data sources, architecture, saved API samples, gitignored PDFs
```

`apps/web/src` may import from `server-lib` **only** with `import type`. Vercel Root
Directory is `apps/web`; `packages/sim` is consumed as a built workspace package
(`workspace:*`), not a Vite source alias, because the `api/` functions resolve it through
`node_modules`.

## Data and API notes

- Tile URLs come **only** from `docs/trek_layers.md`, and only from layers whose
  Status is "tested". Never guess a tile URL. Trek global layers are equirectangular:
  Leaflet needs `L.CRS.EPSG4326` (max native zoom 7 Mars / 8 Moon, 256 px tiles).
- DONKI field names differ per event type (FLR `flrID`/`beginTime`, SEP `sepID`/`eventTime`,
  CME `activityID`/`startTime`, GST `gstID`/`startTime`). Empty arrays are normal in quiet
  periods — fall back to the snapshot and label it "historical event".
- Horizons returns a text table inside `result`; parse rows between `$$SOE` and `$$EOE`.
  `delta` is AU; one-way light seconds = `delta × 499.004784`. Fail loudly if the markers
  are absent rather than returning 0.
- Allowed APIs: DONKI, JPL Horizons, NASA Image and Video Library, Moon/Mars Trek WMTS.
  Do **not** use Mars Rover Photos, APOD, NeoWs, or EPIC.

## Reality Dial Depth vs. Mission Difficulty vs. Station (Phase 2)

Three separate concepts that must never be conflated — a Phase 1 field (`Difficulty`, values
`"cadet"|"standard"|"commander"`) collided in *name* with the Reality Dial's own values
(`"cadet"|"commander"`) while meaning something unrelated, and that collision is exactly why
the field went unread for six milestones before M7 renamed and rewired it.

- **Reality Dial Depth** (`apps/web/src/dial/types.ts`'s `DialLevel`:
  `"cadet"|"specialist"|"commander"`) is presentation only — which of three log-text tables
  (`apps/web/src/i18n/logText.ts`) and vocabulary level a player sees. It never changes a
  single number the simulation computes.
- **Mission Difficulty** (`packages/sim/src/types.ts`'s `MissionDifficulty`:
  `"training"|"nominal"|"flightRated"`) is scenario parameters only —
  `packages/sim/src/data/constants.ts`'s `missionDifficulty` group scales the incident
  trigger rate, the TRL-based system-failure rate, and incident warning time. It never
  touches a physics constant (crew, radiation, food, water, thermal groups stay untouched) —
  mechanically checkable by which constants group a difficulty multiplier is allowed to read
  from. `legacyDifficultyToMissionDifficulty()` maps a stale Phase 1 value
  (`cadet→training`, `standard→nominal`, `commander→flightRated`) for save/URL
  compatibility.
- **Station** (`packages/sim/src/types.ts`'s `StationId`: `"power"|"lifeSupport"|"comms"
  |"incidentCommand"|"missionCommand"`) is a crew role, brand new in M7 — which crew member
  covers which operational responsibility (`engine/stations.ts`), degrading with that
  member's `CrewCondition` and driving incident-response effectiveness. Unrelated to either
  of the above.

## Conventions

- TypeScript strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Tests are Vitest. Simulation validation tests live in `packages/sim/src/validation/`.
- Never mark a row in `docs/DATA_SOURCES.md` as ☑ verified — only the lead developer does
  that, after checking the page or table in the source document.
