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

A teammate verification pass in 2026-09 checked 50 parameters against the NASA fact sheets
and literature. Where its result conflicts with the project brief, **the verification wins**;
the constant keeps a note recording what changed. That pass corrected Mars gravity, surface
pressure, mean temperature and the lunar equatorial range, resolved four of the six
placeholders, restated the solar-particle-event limit in its own unit (250 mGy-Eq over 30
days, not 250 mSv per event), and cut the margin schedule down to the four Ames review
milestones. `validation/environment.test.ts` pins all of it, because the tempting "fix" for
each corrected value is to restore the familiar textbook figure.

Remaining `"placeholder"` entries, both habitat oxygen set points the pass did not cover:
`habitat.targetO2PartialPressureMmHg` (160) and `habitat.fireRiskO2PartialPressureMmHg`
(200). They decide how much power and water making oxygen costs, so they are not cosmetic.

Separately `"tuned"`, and disclosed as game simplifications rather than NASA data: the two
shielding attenuation curves, thermal conductance and mass, failure rates, cell efficiency
and the crop photoperiod. All are sourced to `GAME-DESIGN`, which a test enforces — a tuned
value may never be attributed to NASA.

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
### Settled at M2

`vercel build` and `vercel dev` were both run against the linked project. Results worth
keeping, because each cost time to establish:

- **The workspace package resolves inside a deployed function.** The built `.func` directory
  contains no `node_modules`, which looks like a failure; Vercel instead records the package
  in `.vc-config.json`'s `filePathMap` and resolves it when the prebuilt output is uploaded.
  `vercel dev` confirms the handler really loads it: `/api/health` returns
  `{"sim":{"resolved":true,"constantCount":112,...}}`. Do not "fix" the missing directory.
- **Imports under `api/` and `server-lib/` must carry explicit `.js` extensions.** The
  emitted function is ESM and `tsc` preserves specifiers verbatim, so an extensionless
  import throws `ERR_MODULE_NOT_FOUND` at the first request. This is not a place to follow
  bundler conventions.
- **Tests must not live in `api/`.** Vercel deploys every file there as an endpoint, so
  `apps/web/tests/` holds them instead.
- **`rootDirectory` is unset on the project** because the link was made from inside
  `apps/web`. That is fine for CLI builds run from that directory and wrong for a
  Git-connected deploy, which clones the repo root. It must be set to `apps/web` in the
  dashboard before the first push-to-deploy.
- Routing from `vercel.json` verified live: `/debrief` serves `index.html`, `/api/missing`
  returns 404 rather than being swallowed by the SPA rewrite, and `/sw.js` is sent
  `cache-control: no-cache`.
- The linked Vercel project was later swapped: the lead developer had already created
  `build-a-junior-astronaut-mission-trainer` in the dashboard with `NASA_API_KEY` set (for
  Production and Preview — **not Development**, which the brief also calls for), so
  `apps/web/.vercel` was relinked there rather than to the project this milestone created
  in error. That stray project (`sol-keeper`) and a second stray
  (`build-a-junior-astronaut-mission-trainer-naae`, already deployed once under "Other"
  framework preset) are both still on the account, unresolved — see the milestone summary.
- **A Playwright screenshot caught a bug no Vitest render test saw**: the power priority
  list read "Shed" for every system on the very first paint, before any tick had run,
  because `poweredThisHour` defaults to `false` and the component read that default as a
  real result. Fixed with a fourth, neutral status — `Standby` — shown whenever
  `state.hour === 0`, distinct from the three real outcomes rather than borrowing one of
  their colours. This is the argument for keeping `/e2e` around after M2: a server-rendered
  string assertion cannot notice an *absence* of the word "Standby" if it never occurred to
  the author to look for one, but a person looking at a screenshot immediately can.

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

## 9. The Reality Dial, the Black Box, and Data Sources (M3)

`apps/web/src/dial/` is the whole Reality Dial: `types.ts` defines the three levels,
`present.ts` turns a resource's already-decided status into a headline and detail string per
level, `labels.ts` turns a machine id (`SystemId`, `CrewLocation`, `SurvivalMode`,
`CropTray["crop"]`) into a word per level, `statusWords.ts` does the same for
Nominal/Caution/Critical, and `resourceSummary.ts` computes the six gauges' status, bar
fraction and text once so OperateView and DebriefView can never disagree about what state a
resource is in. **Status and bar fraction are computed once, level-independently, and only
the text differs per level** — `dial/resourceSummary.ts` is the one place that split lives,
proved by a test that runs a real 30-sol simulation and asserts every resource's status is
identical across all three levels. The level itself lives in `store/dial.ts`, a separate
zustand store from the run (so restarting a mission does not reset how the player likes
their numbers shown), persisted to `localStorage` through a try/catch wrapper that falls
back to `"specialist"` silently if storage throws or is unavailable.

`i18n/logText.ts` holds three complete template tables (cadet/specialist/commander) over the
same ~35 log codes, matched by a test that fails if any table's key set diverges from the
other two. Interpolation resolves `{system}`, `{location}`, `{crop}` and `{mode}` through
`dial/labels.ts` rather than printing the sim's raw machine id — before this milestone,
`power.systemShed` rendered literally as `"co2Scrubber lost power"`; the label-aware
interpolation was necessary just to make the specialist level correct, not only to add the
other two.

**The Black Box (`views/Debrief/`) is built on two definitions kept in `dial/blackBox.ts`,
away from the view, specifically so they can be tested against a real simulation run rather
than a hand-built fixture:**
- `majorIncidents(log)` is *any entry the engine recorded as the cause of at least one other
  entry* (`directEffects(log, id).length > 0`) — never a hardcoded list of hazard codes, so
  it can't claim a causal link the engine didn't actually build, and it never needs updating
  when a new hazard type is added. A test runs a full 30-sol mission and asserts
  `system.failure` — critical, but never wrapped in a `because()` scope — never appears here.
- `crewLossConditions(entry, log, windowHours)` gathers severe/warning entries in the 72
  hours before a `crew.lost` entry, naming the same crew member or a mission-wide hazard.
  This is explicitly framed as *conditions*, not a cause: `crew.lost` carries no `causedBy`
  today, because health decline is the cumulative result of several models applying
  penalties hour by hour, not one traceable event. Presenting it as proven causation would
  overclaim what rule 4's implementation actually establishes.
- `groupIncidents` exists only for display: a sustained hazard re-triggers `power.brownout`
  every time the shed set changes, which produced **85** separate incidents in one real run
  — technically each one is a genuine root cause, but 85 rows is the raw log again, not a
  debrief. Consecutive same-code incidents collapse into one row with a count and hour
  range; `majorIncidents` itself is untouched, so what counts as an incident never changes.

`views/DataSources/` and `data/sourceRegistry.ts` are built the same way: the constants tree
is walked live (`walkConstants(CONSTANTS)`), so the source list, per-source constant counts,
and the placeholder disclosure can never say something the sim no longer agrees with.
`sourceRegistry.ts` is a hand-kept manifest of titles and URLs (the sim has no reason to know
what a citation looks like), typed as `Record<SourceId, SourceInfo>` — a missing or
misspelled entry is a `tsc` error the moment `@sol-keeper/sim` adds a `SourceId`, so no
runtime coverage test is needed for it, unlike the sim-side markdown check in
`validation/constants.test.ts`.

`App.tsx` became a three-tab router (Operate / Debrief / Data Sources) over local `useState`
rather than a routing library — three views did not justify a new dependency. **Prepare
(mission setup) is P0 in the feature list but not named in M3's scope and stays deferred**;
the player still starts directly in Operate.

### Two things learned about testing this milestone

- **zustand v5 supplies every store's `getInitialState()` as `useSyncExternalStore`'s server
  snapshot**, not just `useRun`'s. A `renderToString` test is frozen to whatever every
  zustand store held at module import, for the life of that test file — no `set()` call
  after that point is ever visible to it, including from `store/dial.ts`'s `setLevel`. Two
  tests that assumed otherwise were removed rather than left to give false confidence; the
  level's real effect on rendered text is proven directly against `dial/present.ts` instead,
  and against a live DOM in `e2e/dial.spec.ts`, where a real browser's hydration does not
  have this limitation.
- **A finished 30-sol mission generates 700-800 log entries.** Rendering all of them at full
  card height with no bound made the Debrief page 58,443 px tall — found by actually opening
  a full-page Playwright screenshot, not by any unit test, because nothing about the DOM
  structure was wrong. `.event-list-full` is now bounded and scrollable at 640px, matching
  the pattern the live Operate feed already used at 420px.

## 10. Two Moon scenarios, the ESM readout, and the Ripple Web (M4)

**Two new scenarios, `data/scenarios/firstLight.ts` and `data/scenarios/theLongNight.ts`,**
put the sim on the Moon for the first time, which surfaced a real architectural bug that the
single-scenario (Jezero) test suite had no way to catch: `SimState.systems` was typed as
`Record<SystemId, SystemState>`, a claim that every system id always has a state, when
`buildSystems()` only ever populated whatever the active scenario actually lists (Moon
scenarios carry no MOXIE — there is no CO2 atmosphere to consume). The type was a lie that
happened to go unnoticed because Jezero lists every system there is. Fixed by retyping it
`Partial<Record<SystemId, SystemState>>` and hardening the eight call sites across
`isru.ts`, `atmosphere.ts`, `water.ts`, `thermal.ts`, `food.ts`, `power.ts`, and
`engine/events.ts` that had been indexing into it as if the value could never be `undefined`.

**A second bug, also Moon-specific: `Scenario.durationSols` assumed every scenario runs on
Mars.** `runScenario()` and every UI date label converted sols to hours via the Mars sol
length (24.66h) regardless of `scenario.body`, so a Moon mission's stated duration was wrong
by construction. Renamed the field to `durationHours` — the pipeline's only real clock unit —
and pushed "how a duration reads to a person" out to `apps/web/src/dial/missionTime.ts`
(`timeUnitWord`, `durationLabel`, `timestampLabel`), which picks "sol" vs "day" from
`scenario.body` and is now the only place that wording lives, replacing five components that
had each hardcoded "Sol {n}".

**Balancing both Moon scenarios surfaced two real physics bugs, not tuning nitpicks — both
scenarios died at the identical hour regardless of RNG seed**, which is the signature of a
sizing bug, not bad luck:
- Lunar-night heater draw had been copied from the Mars-tuned Jezero scenario (1.5kW), wholly
  inadequate against a real lunar night ambient temperature. Resized both scenarios' thermal
  control from the actual heat-loss physics (`thermalConductanceKwPerK × ΔT`) — First Light
  to 7.0kW, The Long Night (colder, longer) to 8.0kW.
- First Light's battery was sized only to the *critical-path* load, but the power-priority
  shedding stage is reactive — it only sheds once the current hour's demand exceeds available
  supply — so a battery sized for less than the *full nominal* load still drains against
  low-priority systems every hour before they are ever shed. Resized to the real minimum
  (full demand × night length ÷ depth-of-discharge ≈ 4646kWh) and bumped the solar array from
  40m² to 100m² so it can recharge that capacity in daylight. The Long Night's initial food
  stock had the same category of bug (180kg, under the bare 219.5kg four-crew/88.5-day
  minimum before counting crop harvest) and was raised to 450kg. All three scenarios (Jezero
  included, as the consistency bar) are pinned at 20/20 seed wins in
  `validation/moonScenarios.test.ts`, verified by an actual repeated-seed sweep, not trusted
  arithmetic alone.

**The ESM (Equivalent System Mass) panel was deliberately redesigned mid-build, not seeded
with placeholders.** The BVAD ESM formula is `M + V·Veq + P·Peq + C·Ceq + CT·D·CTeq` — mass,
volume, power, cooling, and crew-time, each turned into kg. Nine research passes over BVAD-
2022, NASA ECLSS documentation, and the MOXIE literature came back without a citable, source-
backed hardware mass, cooling factor, or crew-time factor for any of the nine per-system
components (life support, scrubber, thermal control, etc.) — only the volume and power terms
are fully sourced today. Rather than invent nine placeholder mass guesses (a direct violation
of rule 1), `engine/esm.ts`'s `scenarioEsmBreakdown()` computes a partial ESM using only the
sourced V and P terms plus habitat volume, battery mass, and reactor mass, and
`DataSourcesView` explicitly discloses the omitted M/C/CT terms as not yet modeled rather
than silently underreporting. This is a real scope cut, not a bug — if BVAD's own equipment
tables or the ECLSS specs become available, the formula can be completed later without
changing its shape.

**That gap closed shortly after M4 shipped**, when the research team supplied real M/C/CT
figures — ISS subsystem trade-study data for CO2 scrubber, thermal control and oxygen
generator; ISS Water Recovery System data; and named-architecture hardware masses for MOXIE,
power distribution, and comms — recorded as `hardwareEsm` in `data/constants.ts` under five
new `SourceId`s. `scenarioEsmBreakdown()` was rewritten so each system's line sums whichever
terms the source actually states, through a `hardwareTermsFor()` lookup that returns
`undefined` for a term with no source rather than a silent 0 — the two are not the same
claim, and the function must never conflate them. Two systems stay genuinely incomplete on
the research team's own recommendation, not by oversight:
- **`lifeSupport` has no entry at all.** BVAD baselines individual life-support *functions*,
  not one merged "life support system" mass, and the five subsystems already modelled here
  (CO2 scrubber, thermal control, oxygen generator, water recovery, greenhouse) already
  account for that hardware — giving "life support" its own mass on top would double-count
  the same equipment under two names.
- **`waterRecovery` has mass and crew-time but no cooling figure** — the source material
  simply doesn't state one.

Each `ScenarioEsmLine` now carries a `fullySourced` flag and optional `massKg`/`coolingKg`/
`crewTimeKg` fields, and `EsmPanel.tsx` renders "not sourced" in the relevant cell — text, not
a colour or a bare symbol (rule 6) — for whichever term a system's line is missing. Greenhouse
is the one system priced per square metre rather than per unit: BVAD's plant-growth ESM
factor is stated per m² of crop-tray area, so its hardware terms scale by
`scenario.initial.cropTrays` total area rather than being a fixed figure.

**The Ripple Web (`apps/web/src/ripple/`, `views/Ripple/RippleView.tsx`) is a live
dependency graph, built to answer "what does shedding this take down with it" *before* a
player decides, not after** (the Black Box already answers "what did that take down" after
the fact). `ripple/graph.ts` builds the graph from the same facts the tick pipeline already
encodes — `SYSTEM_TO_DOMAINS` only draws an edge from a system to a resource domain when a
model file actually reads that system by name to gate that resource (e.g.
`oxygenGenerator → [oxygen, water]`, verified by grep against `packages/sim/src/models/`);
`lifeSupport` and `comms` are leaves because no model reads either by name today. Layout runs
through `ripple/useForceLayout.ts`, a d3-force simulation run to convergence synchronously
(`sim.tick(300)`) inside a `useEffect` keyed on a `shapeKey` string (the node/edge id list),
not on the `nodes`/`edges` arrays themselves — those are new literals every render, which
would restart the layout every simulated hour instead of only when a scenario switch changes
the graph's actual shape. `RippleView` reuses `dial/systemStatus.ts` (see below) and
`dial/resourceSummary.ts` for node status, so the graph and the Operate gauges can never
disagree about what "shed" or "caution" means for the same system.

Node status logic (`Standby` before a mission starts / `Powered` / `Shed` / `Failed`) had
been implemented once, inline, inside `PowerPriorities.tsx`; the Ripple Web needed the exact
same four-state logic for its system nodes, so it was pulled out to a shared
`dial/systemStatus.ts` (`systemStatusInfo(system, missionStarted)`) rather than reimplemented
a second time — the alternative risks the two views quietly drifting on what "Shed" means.

### Two more things found by actually looking at the screenshot, not the code

- **Two of the Ripple Web's own Playwright assertions were ambiguous, not the app being
  wrong**: `getByText("Moon")` matched three elements (the mission subtitle plus two scenario
  button subtitles containing the substring "Moon"), and `getByRole("cell", { name: "Crew" })`
  matched both the `"Crew"` label cell and a `"crew"` kind cell in the next column (Playwright
  role-name matching is case-insensitive by default). Fixed by scoping to `.mission-site` and
  adding `exact: true`, not by changing the app.
- **`forceCollide(34)` was barely larger than the largest node's own radius (32), so it kept
  circles from overlapping but did nothing to protect the text label drawn above each one.**
  With nodes spaced that tightly, a neighbouring node's later-drawn, opaque circle could paint
  directly over the tail of an adjacent label — "Power distribution" rendered as "Power
  distributi" behind the MOXIE node in the first screenshot. Measuring the label's actual
  SVG `getBBox()` confirmed it never left the viewBox, ruling out edge clipping as the cause
  before settling on the real one. Fixed by widening the collision radius to 52 (plus a
  belt-and-suspenders canvas-edge clamp for nodes that settle near x=0 or x=width) and
  re-verified against a fresh production build — the very first re-run reused a stale
  `vite preview` server left over from the earlier `pnpm verify`, per Playwright's
  `reuseExistingServer` default, and silently showed the unfixed layout until that server was
  killed and rebuilt.
