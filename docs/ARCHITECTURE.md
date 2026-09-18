# Sol Keeper — architecture (M0)

The design agreed at M0, before any simulation code exists. Rules referenced by number are
the seven in `CLAUDE.md` / `docs/PROJECT_BRIEF.md`.

## 1. File tree

```
/                                  git root + pnpm workspace root
  package.json                     private, workspace scripts only
  pnpm-workspace.yaml              packages: [packages/*, apps/*]
  tsconfig.base.json               strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
  eslint.config.js                 flat config, including the sim purity rules (§4)
  .prettierrc, .gitignore, .env.example, CLAUDE.md, vitest.workspace.ts

  packages/sim/                    @sol-keeper/sim — pure TS
    package.json                   exports ./dist/index.js, types ./dist/index.d.ts
    tsconfig.json, tsconfig.build.json
    src/
      index.ts                     public surface: createRun, tick, types
      types.ts                     Params, SimState, Scenario, LogEntry, ids
      units.ts                     SOL_HOURS, solsToHours, hoursToSols, kwToKwh, dose helpers
      data/
        constants.ts               every physical and mission parameter (§5)
        sources.ts                 SourceId union mirroring docs/DATA_SOURCES.md
        scenarios/jezero.ts        P0 scenario
        scenarios/index.ts
      models/                      power, atmosphere, water, food, thermal,
                                   radiation, crew, comms, isru — one file each
      engine/
        rng.ts                     sfc32, serialisable state, named sub-streams
        state.ts                   initial state from Scenario + Params
        events.ts                  hazard and fault definitions, triggers
        log.ts                     append-only log + cause stack
        tick.ts                    the ten-stage pipeline
        esm.ts                     Equivalent System Mass
        risk.ts                    TRL-scaled reliability, 5x5 matrix
      validation/*.test.ts         the brief's must-pass tests (§7)

  apps/web/
    package.json                   depends on @sol-keeper/sim: workspace:*
    vercel.json, vite.config.ts
    api/health.ts                                    M2
    api/{space-weather,light-time,nasa-images}.ts    M5
    server-lib/
      types.ts                     API contract types (type-only, shared with the client)
      http.ts                      json(), error(), 8 s AbortController fetch, cache headers
      validate.ts                  parameter whitelists and range checks
      donki.ts, horizons.ts, images.ts
      *.test.ts                    parser tests against docs/api-samples/
    public/snapshots/*.json        committed offline fallbacks
    src/
      main.tsx, App.tsx
      store/                       Zustand: run state, dial level, settings
      views/{Prepare,Operate,Debrief,DataSources}/
      components/                  gauges, habitat SVG cutaway, event cards
      dial/                        present(quantity, level) — presentation only
      ripple/                      d3-force dependency graph (P1)
      map/                         Leaflet + L.CRS.EPSG4326 Trek layers (P2)
      i18n/{index.ts,en.json,bn.json}
      data/                        snapshot loaders, Live/Snapshot badge logic

  scripts/fetch-snapshots.ts       run locally by the lead developer
  scripts/save-api-samples.sh      saves real API responses into docs/api-samples/
  docs/                            PROJECT_BRIEF.md, DATA_SOURCES.md, ARCHITECTURE.md,
                                   api-samples/, sources/ (gitignored PDFs)
```

## 2. Core types

### Sourced constants

```ts
export type Confidence = "measured" | "derived" | "tuned" | "placeholder";

export interface Constant<T = number> {
  readonly value: T;
  readonly unit: string;        // "kg/CM-day", "mSv/day", "W/m^2", "h"
  readonly min?: T;
  readonly max?: T;
  readonly source: SourceId;    // union from data/sources.ts — a typo fails typecheck
  readonly url?: string;
  readonly confidence: Confidence;
  readonly note?: string;
}
```

`SourceId` is a string-literal union taken from the ID column of `docs/DATA_SOURCES.md`
(`"BVAD-2022" | "OCHMO-RAD" | "OCHMO-TB047" | "ICES-2017" | ...`). This makes rule 1
mechanically enforceable: a constant cannot compile without naming a real source.
`validation/constants.test.ts` asserts every source resolves and enumerates every
`"placeholder"` so the milestone summary can list them.

### Run inputs and state

`Params` is immutable for a run. `SimState` is mutable and fully serialisable, so a saved
state replays identically.

```ts
export interface Params {
  readonly scenarioId: ScenarioId;
  readonly seed: number;
  readonly crewSize: number;
  readonly missionStartIso: string;  // a plain string; the sim never calls Date
  readonly difficulty: Difficulty;
}

export interface SimState {
  hour: number;                      // hours since mission start — the only clock
  power: PowerState; thermal: ThermalState; atmosphere: AtmosphereState;
  water: WaterState; food: FoodState; radiation: RadiationState;
  comms: CommsState; isru: IsruState;
  crew: CrewMember[];
  systems: Record<SystemId, SystemState>;
  rng: RngState;                     // serialisable, part of the state
  log: LogEntry[];                   // append-only
  status: "running" | "won" | "lost";
}
```

Units live in field names (rule 3). We use the naming convention plus `Constant.unit`
strings and explicit converters in `units.ts` rather than branded number types: branding
every quantity adds cast friction throughout a game simulation without catching much that
the naming convention and the validation tests miss.

### Event log

The log is the Black Box. It stores codes and numbers, never prose, so one event can be
rendered at three Reality Dial depths in two languages.

```ts
export type EventId = string;                     // `${hour}:${seq}`

export interface LogEntry {
  readonly id: EventId;
  readonly hour: number;
  readonly kind: "resource" | "fault" | "hazard" | "decision" | "crew" | "milestone";
  readonly severity: "info" | "caution" | "warning" | "critical";
  readonly code: string;                          // i18n key root, e.g. "power.brownout"
  readonly data: Readonly<Record<string, number | string>>;
  readonly causedBy?: readonly EventId[];         // rule 4
  readonly system?: SystemId;
}
```

Causal links come from a **cause stack** on the tick context rather than manual threading:
a stage calls `ctx.because(parentId, () => { ... })` and every entry logged inside that
closure inherits `causedBy: [parentId]`. Black Box replay is then a walk of that graph.

i18n keys are `log.<code>.<level>` — `log.power.brownout.cadet` / `.specialist` /
`.commander` — so the Reality Dial is three lookups over one event, not three simulations.

### Scenario

```ts
export interface Scenario {
  readonly id: ScenarioId;
  readonly body: "mars" | "moon";
  readonly site: { readonly name: string; readonly latDeg: number; readonly lonDeg: number };
  readonly durationSols: number;
  readonly crewSize: number;
  readonly initial: InitialResources;
  readonly systems: readonly SystemSpec[];        // each with trl, massKg, powerKw, spares
  readonly scripted: readonly ScriptedEvent[];    // { atHour, hazard, params }
  readonly win: readonly Condition[];
  readonly lose: readonly Condition[];
  readonly briefingKey: string;                   // i18n key, not prose
}
```

### API contract

Type-only, in `apps/web/server-lib/types.ts`, imported by both `api/*` and `src/*` with
`import type` so no server code can reach the browser bundle. An ESLint
`no-restricted-imports` rule forbids value imports from `server-lib` inside `src/`.

```ts
export type Provenance = "live" | "snapshot";
export interface SpaceWeatherEvent {
  type: "FLR" | "SEP" | "CME" | "GST"; startTime: string; classType?: string; link?: string;
}
export interface LightTime {
  body: "mars" | "moon"; distanceAu: number; distanceKm: number; oneWayLightSeconds: number;
}
export interface NasaImage { nasaId: string; title: string; thumbUrl: string; credit: string }
export interface ApiError { error: string; fallback: "snapshot" }
```

## 3. Tick pipeline

One hour per tick, ten stages, in the brief's order. A stage is
`(ctx: TickContext) => void`; it mutates the draft state and logs through `ctx`.

```ts
const PIPELINE: readonly Stage[] = [
  environment,   // 1  insolation S(r), sun elevation, lunar night, ambient temp, dust opacity
  power,         // 2  generation -> storage -> priority allocation; brownouts logged with cause
  thermal,       // 3  136.8 W per crew member, heat balance, freeze faults
  atmosphere,    // 4  O2/CO2 against survival-mode thresholds
  water,         // 5  recovery loop, electrolysis draw, water-wall shielding mass
  food,          // 6  rations by survival mode, crop trays by accumulated light-hours
  radiation,     // 7  per-crew dose by location and shielding areal density
  crew,          // 8  health, morale, crew-hours available
  failures,      // 9  seeded RNG, TRL-scaled reliability, spares consumption
  endConditions, // 10 win/lose evaluation and milestone log
];
```

`TickContext` carries `{ state, params, constants, rng, log, because }`. The stage order is
a single exported array, so the "same seed = same run" guarantee has exactly one place to
break.

Stage 2's load-shed order is a scenario-level priority list (life support > thermal > ISRU >
crops > comms > science). Every shed emits `power.brownout` naming the shed system in
`data`. That single convention is what later makes the Ripple Web (P1) and the Black Box
(M3) possible without extra instrumentation.

## 4. Determinism and purity, enforced by tooling

Rule 2 is easy to break by accident, so it is machine-enforced:

- **ESLint scoped to `packages/sim/**`** — `no-restricted-globals` for `window`, `document`,
  `fetch`, `localStorage`; `no-restricted-properties` for `Date.now`, `Math.random`;
  `no-restricted-imports` for `react`, `react-dom`, `node:*`.
- **`validation/purity.test.ts`** reads the sim sources and fails on `Math.random`,
  `Date.now`, `new Date`, or `fetch(` — catching anything ESLint's scoping misses.
- **RNG**: `sfc32` with a serialisable four-word state, exposed as named sub-streams
  (`rng.stream("failures")`, `rng.stream("weather")`), so adding a random call in one model
  does not shift the sequence another model sees. Saved runs stay reproducible across code
  changes, not just within one build.
- **`validation/determinism.test.ts`** runs 30 sols twice from one seed and deep-equals both
  the final state and the full log.

## 5. Constants seeding

Values come from the brief, each as a `Constant`, grouped: `crew`, `lifeSupport`, `food`,
`radiation`, `power`, `environment`, `management`. Ranges become `min`/`max` (battery is
`value: 200, min: 150, max: 250` Wh/kg).

Known `"placeholder"` entries to declare in the M1 summary: `cropAreaPerPersonFullDiet`
(40–50 m²), `dustLossPerSol`, the ESM crew-time and cooling factors, and the two shielding
attenuation curves (`"tuned"`, noting that solar-particle-event dose falls steeply with
areal density while galactic-cosmic-ray dose falls weakly and saturates).

## 6. Vercel and monorepo configuration

- **Root Directory = `apps/web`**, Framework preset = Vite.
- `packages/sim` is consumed as a **built workspace package**, not a Vite source alias.
  `apps/web` depends on `"@sol-keeper/sim": "workspace:*"` and builds with
  `pnpm --filter @sol-keeper/sim build && vite build`. A source alias would serve the
  browser bundle but not the `api/` functions, which Vercel's Node builder resolves through
  `node_modules` — so the package needs real `dist` output plus `exports`/`types` entries.
  One mechanism covers both targets.
- `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
    "headers": [{ "source": "/sw.js", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
    ]}],
    "functions": { "api/*.ts": { "memory": 128, "maxDuration": 10 } }
  }
  ```
- Proof obligation at M2: `vercel build` succeeds locally with `@sol-keeper/sim` resolving,
  and `/api/health` responds from the build output. Only then are the dashboard connect
  steps handed over.

## 7. Validation tests

| Test file | Assertion |
|---|---|
| `validation/food.test.ts` | 6 crew x 730 d x 0.62 kg ~= 2716 kg, within 2% of the 2.7 t BVAD figure |
| `validation/radiation.test.ts` | 360 d x 1.84 mSv/d ~= 662 mSv, exceeding the 600 mSv career limit |
| `validation/power.test.ts` | 10 kW x 354 h = 3540 kWh ~= 17.7 t at 200 Wh/kg, before depth of discharge |
| `validation/water.test.ts` | 4 crew, 500 d, 4.35 kg/d: ~565 kg lost at 93.5% vs ~174 kg at 98% |
| `validation/isru.test.ts` | 0.84 kg/d O2 ~= 35 g/h ~= 2.9 MOXIEs at 12 g/h |
| `validation/determinism.test.ts` | same seed and inputs produce an identical final state and log |
| `validation/constants.test.ts` | every `source` resolves; placeholders enumerated |
| `server-lib/horizons.test.ts` | the parser returns the correct light time for the saved sample |

## 8. What the saved API samples already settle

Checked against the real files in `docs/api-samples/`, so the M5 parsers are written against
observed shapes rather than guesses.

- **Horizons** (`horizons_mars.json`): `{ result, signature }`. `result` is text with the
  column header `Date__(UT)__HR:MN  delta  deldot` and rows between `$$SOE` and `$$EOE`,
  e.g. `2026-Sep-18 00:00     1.75056628760467 -10.8266447`. `delta` is AU and the header
  confirms `1 au = 149597870.700 km`. Light seconds = `delta * 499.004784`. The parser must
  throw if the markers are missing rather than returning 0.
- **DONKI field names differ per event type**, so the normaliser needs a per-type map, not
  one shared shape: FLR `flrID`/`beginTime`/`peakTime`/`classType`; SEP `sepID`/`eventTime`;
  CME `activityID`/`startTime`; GST `gstID`/`startTime`/`allKpIndex`. `linkedEvents` is
  either `null` or an array of `{ activityID }`.
- **Empty arrays are real**: `donki_GST_recent.json` is `[]`. That is the snapshot-fallback
  path, labelled "historical event"; exercise it with the May 2024 samples.
- **Images**: `collection.items[].data[0]` gives `nasa_id`, `title`, `secondary_creator`
  (the credit), `center`, `date_created`; the thumbnail is the `links[]` entry with
  `rel: "preview"`. Trim server-side to the four contract fields.
- **Trek**: the capabilities XML confirms `TileWidth` 256 and a maximum TileMatrix of **7
  for Mars, 8 for the Moon**, matching `trek_layers.md`. Both global layers are
  equirectangular, so Leaflet must use `L.CRS.EPSG4326` with `maxNativeZoom` 7 / 8.
