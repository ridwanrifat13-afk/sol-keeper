# PROJECT BRIEF — SOL KEEPER: Junior Astronaut Mission Trainer

NASA Space Apps Challenge 2026 — "Build a Junior Astronaut Mission Trainer"
MVP deadline: 2026-09-27. Hosting: Vercel.
Ridwan Rifat is the lead developer; Claude acts as senior engineer.

## Product

A browser game (ages 8–18) where students run a lunar or Martian outpost, balancing
life support, radiation shielding, power, and food production. Every number in the
simulation comes from a sourced constants file (real NASA data). Core innovation: the
**Reality Dial** — ONE simulation shown at three depths: Cadet (8–11: emoji/bars),
Specialist (12–14: real units), Commander (15+: equations and flow rates). The
simulation never changes between levels; only the presentation does.

## Non-negotiable rules

1. NEVER invent a physical or mission parameter. All parameters live in
   `packages/sim/src/data/constants.ts` as
   `{ value, unit, min?, max?, source, url?, confidence: "measured"|"derived"|"tuned"|"placeholder", note? }`.
   If a needed value is missing, add it with confidence `"placeholder"` + TODO and list it
   in the milestone summary. Never guess silently.
2. `packages/sim` is pure TypeScript: no DOM, no React, no fetch, no `Date.now()`, no
   `Math.random()`. Inject a seeded RNG and the clock. Same seed + inputs = identical run.
3. Units in every name (`o2Kg`, `powerKw`, `energyKwh`, `doseMSv`). Hourly tick.
   1 Mars sol = 24.6597 h, converted explicitly.
4. Append-only event log with causal links (`causedBy: eventId`) so the "Black Box"
   debrief can rebuild the chain of events behind a failure.
5. No NASA logo, insignia, or "meatball" anywhere (Space Apps branding rule). Credit
   all data in text on a Data Sources screen.
6. Accessibility: never convey state by color alone (icon + pattern + text). Must run
   on a low-end Android phone and work offline after first load.
7. Work milestone by milestone. At each milestone end: run tests, typecheck, lint, and
   `vercel build` (once Vercel is configured); commit; then STOP with a short summary:
   what was built, what is placeholder, what the lead developer must verify or do manually.
   Ask before adding any dependency not listed below.

## Secrets and security (Vercel)

- The only secret is `NASA_API_KEY`. It is set in the Vercel dashboard (Project Settings →
  Environment Variables, for Production, Preview, and Development) and pulled locally
  with `vercel env pull .env.local`. The lead developer does this manually; Claude never
  asks for the key.
- NEVER prefix it with `VITE_` (Vite would bundle it into client code). Read it ONLY via
  `process.env.NASA_API_KEY` inside `/api` functions. Never log, echo, or return it.
- `.env*` files are gitignored; `.env.example` is committed with an empty `NASA_API_KEY=`.
- `/api` functions are NOT open proxies: whitelist every query parameter, validate types
  and ranges, and reject everything else with HTTP 400.
- `curl` may be run in the terminal to inspect NASA endpoints. Reference the key only as
  `$NASA_API_KEY`; never print it, echo it, `cat` `.env` files, or write it into any file.
- Claude works in the VS Code extension and does NOT have `NASA_API_KEY` in its
  environment. It must never ask for it. For DONKI, build and test only from
  `docs/api-samples/*.json`. Keyless endpoints (ssd.jpl.nasa.gov, images-api.nasa.gov) may
  be curled to inspect responses. From M5 on, test key-based calls only through
  `vercel dev` and `/api` routes. Never `cat`, print, or write `.env` files.

## Tech stack

- pnpm workspaces monorepo. TypeScript strict. Vitest. ESLint + Prettier. Playwright
  (`@playwright/test`, root devDependency, added M2) for real-browser checks the Vitest
  render tests structurally cannot do — layout, paint, and phone-viewport rendering — and
  for the M6 Lighthouse pass. Specs live in `/e2e`, run against the production build via
  `pnpm e2e`, not the dev server.
- `apps/web`: Vite + React 18 + Zustand. Habitat cutaway in SVG (PixiJS only if needed;
  ask first). d3-force for the "Ripple Web" dependency graph. Leaflet for Moon/Mars
  Trek map tiles (landing-site picker). i18next with `en` and `bn` (Bangla) locales from
  day one. vite-plugin-pwa for offline.
- Server: Vercel Functions (Node.js runtime, TypeScript) in `apps/web/api/`, using the
  Web-standard signature: `export async function GET(request: Request): Promise<Response>`.
  Shared server code lives in `apps/web/server-lib/`, not in `/api`, so that helpers are
  never deployed as endpoints.
- Vercel project Root Directory = `apps/web`, Framework preset = Vite. The workspace
  package `packages/sim` must resolve during the Vercel build. Configure this and prove it
  with `vercel build`.

## Repository layout

```
/packages/sim/src
  data/constants.ts, data/scenarios/*.ts
  models/{power,atmosphere,water,food,thermal,radiation,crew,comms,isru}.ts
  engine/{state,tick,events,rng,log,esm,risk}.ts
  validation/*.test.ts
/apps/web
  api/space-weather.ts      → DONKI (key required)
  api/light-time.ts         → JPL Horizons (no key)
  api/nasa-images.ts        → NASA Image and Video Library (no key)
  server-lib/{http.ts,validate.ts,donki.ts,horizons.ts,images.ts}
  src/{components,views/{Prepare,Operate,Debrief,DataSources},dial,ripple,map,i18n,data}
  public/snapshots/*.json   → offline fallbacks (committed)
  vercel.json
/scripts/fetch-snapshots.ts → run locally by the lead developer; writes apps/web/public/snapshots/
/docs  PROJECT_BRIEF.md, DATA_SOURCES.md, ARCHITECTURE.md, api-samples/ (real saved responses)
```

`CLAUDE.md` lives at the workspace root (not in `docs/`) so that Claude Code loads the
rules automatically in every session.

## NASA APIs (only these)

1. **DONKI** via api.nasa.gov (key):
   `https://api.nasa.gov/DONKI/{FLR|SEP|CME|GST}?startDate&endDate&api_key`
   Use: "Live Sky" — real recent solar flares / particle events trigger in-game radiation
   storms. Empty arrays are normal in quiet periods → fall back to a historical event from
   the snapshot and label it "historical event".
2. **JPL Horizons** (no key, no CORS → must go through `/api`):
   `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='499'|'301'&OBJ_DATA='NO'`
   `&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME&STOP_TIME`
   `&STEP_SIZE='1 d'&QUANTITIES='20'`
   The JSON `result` field is a TEXT table: parse the rows between `$$SOE` and `$$EOE`;
   `delta` is in AU; one-way light time (s) = delta × 499.004784. Unit-test the parser
   against `docs/api-samples/horizons_*.json`.
3. **NASA Image and Video Library** (no key):
   `https://images-api.nasa.gov/search?q&media_type=image`
   Use: photos for "What NASA did" fact cards. Return a normalized, trimmed list only.
4. **Moon/Mars Trek WMTS tiles** (no key), loaded directly by Leaflet in the browser.
   Tile URLs come ONLY from `docs/trek_layers.md` (provided by the lead
   developer, parsed from each layer's GetCapabilities XML). Never guess tile URLs.

Do NOT use: Mars Rover Photos API (backend reported down), APOD, NeoWs, EPIC.
Optional later (ask first): NASA OSDR; archived InSight weather as a static dataset.

## /api function contract

- `GET /api/space-weather?days=1..60`
  → `{ source: "live", fetchedAt, events: [{ type: "FLR"|"SEP"|"CME"|"GST", startTime, classType?, link? }] }`
- `GET /api/light-time?body=mars|moon&date=YYYY-MM-DD`
  → `{ source: "live", fetchedAt, body, distanceAu, distanceKm, oneWayLightSeconds }`
- `GET /api/nasa-images?q=<whitelisted topic key>`
  → `{ source: "live", fetchedAt, items: [{ nasaId, title, thumbUrl, credit }] }`
  (`q` must be one of a server-side whitelist, e.g. `moxie`, `iss-water`, `veggie`,
  `artemis`, `rad`, `lunar-south-pole`)
- Every function: 8 s upstream timeout (`AbortController`); on upstream failure return
  HTTP 502 `{ error, fallback: "snapshot" }`. On success set
  `Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400` so Vercel's CDN
  caches responses and the project stays far below NASA rate limits.
- Client strategy: load the snapshot first (instant, offline-safe), then upgrade to `/api`
  data if it responds within 3 s. Show a "Live" / "Snapshot (date)" badge wherever
  external data appears.
- PWA: service worker uses NetworkFirst for `/api/*` with a snapshot fallback, and never
  caches `/api` responses longer than 24 h.

## vercel.json requirements

- SPA rewrite for client routes that must NOT capture `/api`:
  `{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }`
- Headers: a no-cache header for the service worker file.
- Keep function config minimal (small memory, low `maxDuration`).

## Constants (seed exactly, with sources)

**Crew** (NASA BVAD NASA/TP-2015-218570 revs; NASA OCHMO technical briefs):
- metabolicRate 11.82 MJ/CM-day = 136.8 W/CM (BVAD)
- o2Consumption 0.84 kg/CM-day; co2Production 1.00 kg/CM-day (BVAD)
- foodDryMass 0.62 kg/CM-day (BVAD summary); waterUseTotal 4.35 kg/CM-day (BVAD 2018)
- feverMetabolicIncrease +10–12% per °C above 37 °C (OCHMO TB-047)
- survivalModes (OCHMO TB-047): nominal 3600 kcal / 4.0 L / 22 °C / CO2 ≤3 mmHg;
  mode1 1800 kcal / 1.25 L / 18 °C / 7.6 mmHg; mode2 600 kcal / 0.75 L / 15 °C / 10–15 mmHg
- workweek 5+2 days; 8 vacation days/CM-year (BVAD)

**Life support:**
- waterRecovery 0.935 (no brine processor) / 0.98 (with Brine Processor Assembly) (NASA ISS, 2023)
- o2RecoveryFromCO2 0.51 current ISS / 0.75 research goal (Frontiers in Space Tech 2024)
- openLoopResupply ~10 kg/CM-day incl. tanks (NASA ICES-2017-87)
- electrolysis 1.125 kg H2O per kg O2 (stoichiometry); ~4.9 kWh/kg theoretical,
  7.5 kWh/kg practical (derived, tunable)
- moxie peak 12 g O2/h, nominal 6 g/h, ≥98% purity, 122 g total (NASA/MIT 2023)

**Food:**
- cropCycleDays lettuce 28–30, wheat 64–86, soybean 90–97, potato 90–105 (BVAD)
- growLightElectrical 100–200 W/m² (derived); cropAreaPerPersonFullDiet 40–50 m² (placeholder)

**Radiation:**
- marsSurface 0.64 ± 0.12 mSv/day; deepSpaceCruise 1.84 ± 0.30 mSv/day (MSL RAD)
- moonSurface 1.37 mSv/day (Chang'e-4 LND, Zhang et al. 2020); earthBackground ~3.6 mSv/yr
- limits (NASA-STD-3001): career 600 mSv; per solar particle event 250 mSv;
  nuclear tech 20 mSv/mission-year; cosmic-ray design target <0.8 mSv/day on surfaces,
  <1.3 mSv/day in free space (~10 g/cm² Al)
- shielding: solar-particle-event dose attenuates strongly with areal density; cosmic-ray
  dose attenuates weakly and saturates. Two tunable curves, confidence `"tuned"`.

**Power:**
- solarConstant1AU 1361 W/m²; S(r) = 1361·(1 AU/r)²; Mars mean ~586–590 W/m² (~43%)
- cellEfficiency 0.30 (tunable); dustLossPerSol placeholder
- fissionSurfacePower 40 kWe, 10 yr, ≤6000 kg (NASA/DOE Fission Surface Power)
- battery 150–250 Wh/kg (default 200), depth of discharge 0.8, round-trip efficiency 0.9
- issReferenceLoads ECLSS 5.31 kW, thermal control 8.72 kW (BVAD)

**Environment:**
- marsSol 24.6597 h; lunar night ~354 h; gravity Mars 3.71 / Moon 1.62 m/s²
- Mars ~610 Pa, 95% CO2, mean −63 °C; lunar equator −173..+127 °C
- Mars conjunction every ~780 d with ~14 d comms blackout

**Management (systems engineering):**
- Equivalent System Mass: ESM = M + V·Veq + P·Peq + C·Ceq + CT·D·CTeq (BVAD);
  transit shielded volume 80.8 kg/m³, power 136 kg/kWe; surface power options
  54 / 87 / 338 kg/kW; crew-time and cooling factors placeholder until verified
- contingencyByMaturity: concept 25%, design 15%, prior build 7.5%, fabrication 4%, flight 2%
- requiredMarginByPhase: Phase A >30%, PDR >20%, CDR >15%, PER >10%, pre-ship 2–5%
- historicalGrowth: mass/power +20–48% from Phase B to launch (JPL)
- TRL 1–9 (lower TRL = better performance but higher failure rate + contingency); 5×5 risk matrix

## Simulation tick order (hourly)

1. environment
2. power generation, storage, priority allocation (log brownouts with cause)
3. thermal (crew adds 136.8 W each; freeze faults)
4. atmosphere (O2/CO2 vs survival-mode thresholds)
5. water loop (electrolysis draws water; stored water may serve as a shielding "water wall")
6. food (rations, crop trays by light-hours)
7. radiation dose per crew location
8. crew health, morale, crew-hours
9. failures (seeded RNG, TRL-scaled reliability, spares)
10. end conditions + log

## Validation tests (must pass)

- 6 crew × 730 d × 0.62 kg ≈ 2716 kg dry food (BVAD cites 2.7 t), within 2%
- 360 d cruise × 1.84 mSv/d ≈ 662 mSv (> 600 mSv career limit)
- 10 kW × 354 h = 3540 kWh ≈ 17.7 t batteries at 200 Wh/kg (before depth-of-discharge factor)
- 4 crew, 500 d, 4.35 kg/d: water loss ≈ 565 kg at 93.5% vs ≈ 174 kg at 98%
- 0.84 kg/d O2 ≈ 35 g/h ≈ 2.9 MOXIEs at 12 g/h
- Horizons parser returns the correct light time for the saved sample
- Determinism: same seed + inputs → identical final state and log

## Features by priority

- **P0:** Jezero Outpost scenario end-to-end (Prepare → Operate → Debrief); resource panel;
  power priorities; events (dust storm, solar particle event, pump failure, crop blight);
  Reality Dial; Black Box causal replay; Data Sources screen.
- **P1:** Ripple Web; ESM budget as currency; survival-mode ration control; Moon scenarios
  ("First Light", "The Long Night"); Live Sky; Bangla.
- **P2:** Launch Packing with margins/TRL; "What NASA did" fact cards with NASA images;
  Trek landing-site map; pass-and-play Crew Console.

## Milestones

- **M0:** Plan only. Propose the file tree, core types (State, Params, Event, LogEntry,
  Scenario, ApiResponse types), the tick pipeline, and the Vercel monorepo config.
  Create `CLAUDE.md` with these rules. Wait for approval.
- **M1:** Monorepo scaffold + tooling; `constants.ts` seeded; all models, tick, and
  validation tests passing; headless CLI that prints a 30-sol run summary.
- **M2:** Web shell (Operate view, gauges, power priorities, time controls, Jezero, event
  cards) + `vercel.json` + a `/api/health` function. Verify `vercel build` passes locally,
  then hand over exact steps to connect the repo to Vercel. FIRST PRODUCTION DEPLOY HERE.
- **M3:** Reality Dial, Black Box debrief, Data Sources screen.
- **M4:** Ripple Web, ESM budget, survival modes, Moon scenarios.
- **M5:** `/api/space-weather`, `/api/light-time`, `/api/nasa-images` with validation,
  timeouts, and CDN caching; `scripts/fetch-snapshots.ts`; Live/Snapshot badges; PWA
  offline; i18n (en/bn).
- **M6:** Launch Packing, fact cards, Trek map, polish, low-end mobile performance pass,
  Lighthouse check on the production URL.
