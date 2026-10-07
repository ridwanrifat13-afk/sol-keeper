# Sol Keeper

**Junior Astronaut Mission Trainer** — a NASA Space Apps Challenge 2026 submission for
*"Build a Junior Astronaut Mission Trainer"*.

**Live app:** [build-a-junior-astronaut-mission-tr.vercel.app](https://build-a-junior-astronaut-mission-tr.vercel.app)

Sol Keeper is a browser game (ages 8–18) where students run a lunar or Martian outpost,
balancing life support, radiation shielding, power, and food production over a real
mission timeline. Every number the simulation uses — crew metabolic rate, battery
chemistry, radiation limits, dust-storm duration, and more — traces back to a published
NASA source or a disclosed, clearly-labelled gameplay estimate. Nothing is invented
silently.

Built by **Projonmo Apollo**, from CUET.

## The Reality Dial

The core idea: **one simulation, shown at three depths.**

| Depth | Audience | What changes |
|---|---|---|
| Cadet | Ages 8–11 | Pictures and bars — plain-word status, icons |
| Specialist | Ages 12–14 | Real numbers and units |
| Commander | Ages 15+ | Thresholds, rates, and the underlying equations |

The simulation itself never changes between levels — only how it's explained. Flip the
dial mid-mission and the numbers underneath stay identical.

## Three real missions

| Mission | Body | Site | Length | Defining hazard |
|---|---|---|---|---|
| Jezero Outpost | Mars | Jezero Crater | 30 sols | A 2018-scale global dust storm |
| First Light | Moon | Connecting Ridge | 31 days | One 354-hour polar night |
| The Long Night | Moon | Connecting Ridge | 89 days | Three lunar nights, reactor-powered |

Mission Setup also lets a player choose difficulty, crew size (2–6), landing site, power
architecture (solar/battery, fission, or hybrid), and shielding approach (hull only,
water wall, or a regolith berm) — each real trade-off computed live from the same sourced
constants, not a second set of numbers.

## Real incidents, not scripted drama

Every Decision Card a player faces is drawn from real spaceflight history, not invented
for the game:

- **Fire aboard Mir**, February 1997
- **Progress–Mir collision and depressurization**, June 1997
- **Apollo 13's CO₂ scrubber failure** and improvised fix
- **Soyuz MS-22's coolant leak**, December 2022
- **The August 1972 solar particle event**
- **The 2018 Mars global dust storm** that ended *Opportunity*'s mission
- **Recurring ISS CO₂ scrubber (CDRA) failures**

## Five stations, one crew

Power, Life Support, Comms, Incident Command, and Mission Command each get their own
console — reachable as a classic dashboard or, on desktop, a photographed "cockpit" view
with the real consoles mapped onto physical screens. A sixth tab, Habitat, renders a live
cutaway of the outpost itself.

## Built for the classroom, not just the browser

- **Offline after first load** — a service worker precaches the app shell, station art,
  and NASA snapshot data, so a spotty school network doesn't stop a mission mid-sol.
- **Accessible by construction** — state is never carried by colour alone: every gauge
  pairs an icon, a pattern, and a status word.
- **Two languages from day one** — English and বাংলা (Bangla), including every Decision
  Card and gauge explanation at all three Reality Dial depths.
- **No NASA insignia anywhere** — per the Challenge's own branding rule. Every dataset is
  credited in text, below.

## Data sources

Every physical or mission parameter in `packages/sim/src/data/constants.ts` carries a
`source`, a `confidence` (`measured` / `derived` / `tuned` / `placeholder`), and — for
anything short of a direct measurement — a disclosed note on how it was derived. The full
registry, including per-document page/table references and verification status, lives in
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md). The sections below group that same
registry by what it's used for.

#### Life support & crew physiology

| Source | Used for |
|---|---|
| [NASA BVAD (2022)](https://ntrs.nasa.gov/citations/20210024855) | Crew O₂/CO₂/food/water rates, metabolic rate, ESM factors, crop cycles |
| [NASA OCHMO Radiation Protection Brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | Career/per-event radiation dose limits |
| [NASA OCHMO Crew Survivability Brief (TB-047)](https://www.nasa.gov/wp-content/uploads/2024/07/ochmo-tb-047-crew-survivability.pdf) | Survival-mode kcal/water/temperature/CO₂ thresholds |
| [NASA OCHMO Habitable Atmosphere Brief (TB-003)](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf) | Habitat oxygen set point and sea-level-equivalent ppO₂ |
| [NASA OCHMO CO₂ Technical Brief (TB-004)](docs/DATA_SOURCES.md) | CO₂ immediately-dangerous-to-life-or-health threshold |
| [NASA HRP Acute Radiation Syndrome evidence report](docs/DATA_SOURCES.md) | Onset/severe/lethal acute radiation dose bands |
| [Resupply mass for life support (ICES-2017-87)](https://ntrs.nasa.gov/api/citations/20170010337/downloads/20170010337.pdf) | Open-loop resupply mass per crew-day |
| [NASA water recovery milestone](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station) | ISS water recovery rate (93→98%) |
| [ISS air/water recovery review, Frontiers (2024)](https://www.frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/full) | O₂ recovery from CO₂, recovery goals |
| [MOXIE completes its Mars mission, MIT AeroAstro](https://aeroastro.mit.edu/news-impact/oxygen-generating-experiment-moxie-completes-mars-mission) | MOXIE production rate and total yield |
| [Elevated-CO₂ salad crop study (2024)](https://www.tandfonline.com/doi/full/10.1080/17429145.2023.2292219) | Crop CO₂-enrichment growth-rate shape |
| Space Biology and Medicine (NTRS), Nutritional Biochemistry of Spaceflight (NTRS), cold-survival study (NTRS) | Thirst/starvation/hypothermia survival clocks |

#### Radiation

| Source | Used for |
|---|---|
| [Hassler et al. 2014, *Science*](https://doi.org/10.1126/science.1244797) | Mars surface radiation dose |
| [Zeitlin et al. 2013, *Science*](https://doi.org/10.1126/science.1235989) | Earth–Mars cruise radiation dose |
| [Zhang et al. 2020, *Science Advances*](https://www.science.org/doi/10.1126/sciadv.aaz1334) | Moon surface radiation dose |
| [Knipp et al. 2018, *Space Weather*](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2018SW002024) | 1972 solar-storm electronics/solar-array degradation |
| [Al Zaman & Kunja 2023, *AIP Advances*](https://pubs.aip.org/aip/adv/article/13/8/085108/2905736) | Regolith + polymer shielding effectiveness |

#### Power & engineering mass

| Source | Used for |
|---|---|
| [NASA Fission Surface Power](https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power) · [IAC 2024 status](https://ntrs.nasa.gov/api/citations/20240011694/downloads/IAC%202024%20Manuscript_FSP%20FINAL.pdf) | Reactor power, mass, and lifetime |
| [Rucker, "Integrated Surface Power Strategy for Mars"](https://ntrs.nasa.gov/api/citations/20150000526/downloads/20150000526.pdf) | Power distribution hardware mass |
| [NASA CR-189186 subsystem mass/power](https://ntrs.nasa.gov/api/citations/19920019663/downloads/19920019663.pdf) | Communications hardware mass |
| [MIT 16.851 Water Recovery System portfolio](https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/1b24b751674a5d7db79cad58eefe2ade_16_851_portfolio.pdf) | Water recovery hardware mass/volume/power/crew-time |
| [NASA Science — Perseverance instruments](https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/) | MOXIE hardware mass and power |
| [Miyajima 2020, lunar life-support trade study](https://doi.org/10.15011/ijmsa.37.3.370304) | CO₂ scrubber / thermal control / O₂ generator mass and cooling load |
| NASA Ames APR 8070.1 · GSFC-STD-1000H · THEMIS margin policy | Mass-margin schedules by mission review phase |

#### Planetary & orbital data

| Source | Used for |
|---|---|
| [NASA planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | Gravity, day length, solar irradiance, orbital distance/period |
| [JPL Horizons](https://ssd.jpl.nasa.gov/api/horizons.api) (live API) | Real-time Earth–Mars / Earth–Moon light-time |

#### Historical incidents

| Source | Used for |
|---|---|
| NASA SP-4030 · [NASA "25 Years Ago: Fire Aboard Mir"](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/) · [Linenger crew account](https://www.sciencefocus.com/space/fire-in-space-jerry-linenger) | The Mir fire incident |
| NASA Shuttle-Mir history · [Spektr module page](https://spaceflight.nasa.gov/history/shuttle-mir/spacecraft/s-mir-spektr-main.htm) | The Progress–Mir collision/depressurization incident |
| [Apollo 13 CO₂ account](https://www.universetoday.com/articles/13-things-that-saved-apollo-13-part-10-duct-tape) | The O₂ tank / CO₂ rationing incident |
| [Soyuz MS-22 coolant leak reporting](https://tass.com/science/1552657) · [post-MS-22 thermal criteria](https://www.nasaspaceflight.com/2023/03/soyuz-ms-22-return/) | The coolant leak incident |
| [JPL, "Opportunity Hunkers Down During Dust Storm"](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) · [Lorenz et al. 2020, InSight dust](https://pmc.ncbi.nlm.nih.gov/articles/PMC7375148/) | The dust storm incident |
| [Cmarik & Knox 2019, ICES](https://ntrs.nasa.gov/api/citations/20190030370/downloads/20190030370.pdf) | The CO₂ scrubber (CDRA) failure incident |
| NASA Orion quick facts | Lunar-return transit time |

#### Landing sites

| Source | Used for |
|---|---|
| NASA Mars 2020 Perseverance landing site | Jezero Crater coordinates |
| NASA Mars Science Laboratory landing site | Gale Crater coordinates |
| [Morgan et al. 2021, *Nature Astronomy*](https://www.nature.com/articles/s41550-020-01290-z) (SWIM project) | Subsurface water-ice availability, Arcadia Planitia |
| [Luzzi et al. 2025, *JGR Planets*](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024JE008724) | Shallow ice-depth mapping follow-up |
| [NASA Artemis III candidate regions](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/) | Lunar landing-site candidates |
| [Wueller et al. 2026, *JGR Planets*](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JE009434) | Lunar site terrain suitability |

#### Operations & maintenance

| Source | Used for |
|---|---|
| [Lynch et al. 2022, lunar crew-time assessment, IEEE Aerospace](https://ntrs.nasa.gov/citations/20220002626) | Scheduled-maintenance crew-hour budget |
| [NASA, ISS 3-D-printed ratchet wrench](https://www.nasa.gov/missions/station/space-station-3-d-printer-builds-ratchet-wrench-to-complete-first-phase-of-operations/) | "Print a spare" lever's wall-clock time |

#### Live APIs and map services

| Service | Used for | Credit |
|---|---|---|
| [NASA DONKI](https://api.nasa.gov/DONKI/) | Live Sky — real recent solar flares/particle events drive in-game radiation storms | NASA CCMC / Space Weather Research Center |
| [JPL Horizons](https://ssd.jpl.nasa.gov/api/horizons.api) | Real Earth–Mars / Earth–Moon light-time | NASA/JPL Solar System Dynamics |
| [NASA Image and Video Library](https://images-api.nasa.gov/search) | Fact-card photography | Per-image credit from the API |
| [NASA Moon Trek](https://trek.nasa.gov/) (LRO WAC Mosaic) | Lunar landing-site map tiles | NASA/GSFC/Arizona State University |
| [NASA Mars Trek](https://trek.nasa.gov/) (Viking MDIM2.1) | Martian landing-site map tiles | NASA Ames / USGS Astrogeology |

Game-balance constants with no NASA source (failure-rate tuning, shielding curves, crop
photoperiod, etc.) are explicitly labelled `GAME-DESIGN` with `confidence: "tuned"` or
`"placeholder"` wherever they appear — never presented as measured fact. The in-app
**Data Sources** screen shows this same registry to players directly.

## Tech stack

- **pnpm workspaces** monorepo, TypeScript strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), Vitest, ESLint + Prettier, Playwright for real-browser
  checks.
- **`packages/sim`** — the simulation itself: pure TypeScript, no DOM/fetch/`Date.now`/
  `Math.random`. A seeded RNG and injected clock make the same seed + inputs byte-identical
  every run.
- **`apps/web`** — Vite + React 18 + Zustand, Leaflet for the Moon/Mars Trek landing-site
  maps, d3-force for the Incident Command dependency graph, i18next (English + Bangla),
  vite-plugin-pwa for offline support.
- **`apps/web/api`** — Vercel Functions proxying DONKI, JPL Horizons, and the NASA Image
  and Video Library, each with an explicit query-parameter whitelist.

## Running locally

```bash
pnpm install
pnpm --filter @sol-keeper/web dev    # dev server
pnpm verify                          # typecheck + lint + test
pnpm e2e                             # Playwright, against a production build
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design and
[`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) for the complete project brief.
