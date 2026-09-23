# Landing Sites
Data for the M9 landing-site picker. Each value carries a confidence flag, matching
constants.ts rules: measured = from a NASA/peer-reviewed source; derived = computed by us;
tuned = gameplay balance; placeholder = NEEDS A SOURCE, do not present as fact.
Source IDs refer to docs/DATA_SOURCES.md. New IDs introduced here are marked NEW and must
be added to the registry as unverified.
 
Design intent: no site is best at everything. Sunlight, water ice, radiation shelter,
comms and terrain pull against each other, which is the lesson.
 
---
 
# MARS
 
## MARS-JEZERO — Jezero Crater (default Mars scenario)
- Coordinates: 18.44° N, 77.45° E — measured (Perseverance landing site, Octavia E. Butler
  Landing) [NEW: NASA-M2020-LANDING]
- Elevation: about −2,600 m relative to the Mars datum — placeholder (verify against MOLA
  in Mars Trek before presenting a number)
- Why it matters: the real Perseverance site and the site NASA used in its own
  four-crew, 500-day solar-vs-fission power study [RUCKER-2016]
- Sunlight: good. Low-latitude site; use the standard solar model with the site's latitude
- Water ice: poor. Equatorial; no shallow ice mapped here — measured by absence
  in the SWIM mid-latitude maps [NEW: SWIM-2021]
- Radiation: baseline 0.64 mSv/day [MSL-RAD-SURFACE] (note: that value was measured at
  Gale, not Jezero — treat cross-site differences as derived, see "Radiation by elevation")
- Comms: Earth light-time from Horizons; conjunction blackout applies [API-HORIZONS]
- Hazards: regional and global dust storms; dust accumulation on arrays
- Game role: the balanced default. Good sun, no local water, so the water loop and
  resupply margin carry the mission.
## MARS-GALE — Gale Crater
- Coordinates: 4.59° S, 137.44° E — measured (Curiosity landing site, Bradbury Landing)
  [NEW: NASA-MSL-LANDING]
- Elevation: about −4,500 m — placeholder (verify in Mars Trek)
- Sunlight: best of the Mars sites (nearly equatorial)
- Water ice: poor
- Radiation: this is where 0.64 ± 0.12 mSv/day was actually measured [MSL-RAD-SURFACE],
  so it is the anchor point for the elevation model below
- Hazards: dust storms; deep crater floor means a slightly thicker atmosphere overhead
- Game role: maximum sunlight, minimum water. Rewards solar + heavy recycling.
## MARS-ARCADIA — Arcadia Planitia (site AP-8 / AP-9 area)
- Coordinates: approximately 40° N, 200° E (northern mid-latitudes) — placeholder for the
  exact site; the region is measured [NEW: SWIM-2021], [NEW: LUZZI-2025]
- Elevation: low northern plains, roughly −3,800 m — placeholder
- Why it matters: SWIM found that the broad plains of Arcadia match the greatest number of
  remote-sensing criteria for accessible ice-rich subsurface material outside the polar
  ice-stability zone [SWIM-2021]. Follow-up mapping estimates ice beneath thermal
  contraction polygons lies on the order of tens of centimetres down — shallow enough for
  in-situ resource use [LUZZI-2025]
- Water ice: excellent (the only Mars site in this list with usable local water)
- Sunlight: poorer. Higher latitude means lower sun angle and stronger seasonal swing;
  NASA's human-landing-site guidance prefers latitudes below 40° partly for solar power
  and thermal management — placeholder for the exact penalty; compute from latitude
- Thermal: colder, so higher heater load — derived from the latitude and season model
- Game role: water is nearly free, power and heat are expensive. The mirror image of Gale.
## Radiation by elevation (Mars) — DERIVED, label it in-game
Atmospheric column mass shields the surface, and lower sites have more atmosphere
overhead. Model: p(h) = p0 · exp(−h / H), with p0 = 610 Pa at datum [NSSDC-FACTS] and
scale height H ≈ 11.1 km; convert pressure to column mass (p / g, with g = 3.71 m/s²) and
scale the dose between sites. Anchor the model so Gale returns the measured
0.64 mSv/day [MSL-RAD-SURFACE]. Mark every non-Gale site value as derived, and keep the
spread small (a few percent) unless the team finds a source for more.
 
---
 
# MOON
 
## MOON-CONNECTING-RIDGE — Connecting Ridge / Peak near Shackleton (default Moon scenario)
- Coordinates: approximately 89.5° S, near the Shackleton rim — placeholder for the exact
  point; the region is an official NASA Artemis III candidate region [NEW: NASA-ARTEMIS-CLR]
- Illumination: very high, with sunlight for roughly 90% of the lunar year at the ridge —
  placeholder (a secondary source; find a NASA or peer-reviewed figure before showing it)
- Darkness pattern: not a 14-day night. Short, frequent shadow periods instead, so size
  batteries for hours, not weeks — derived from the above; this contrast is a core lesson
- Water ice: good. Adjacent permanently shadowed regions hold temperatures low enough to
  trap volatiles, with ice inferred from neutron-spectrometer data — placeholder for the
  amount; ice is a traverse away, costing crew-hours and power
- Radiation: 1.37 mSv/day baseline [CE4-LND-2020] (measured at Von Kármán crater, not at
  the pole; treat as a Moon-wide value and say so)
- Comms: near-continuous Earth visibility from high ground — placeholder for the exact
  fraction
- Terrain: only a small portion of the region is flat enough to land on; the suitable area
  within Connecting Ridge is about 11.8 km², roughly 4.6% of the region [NEW: WUELLER-2026]
- Game role: sun almost always available, water nearby but costly to reach. The site that
  makes the reactor-versus-solar choice genuinely close.
## MOON-MALAPERT — Malapert Massif
- Coordinates: approximately 86° S — placeholder for the exact point; an Artemis III
  candidate region [NASA-ARTEMIS-CLR]
- Illumination: high (secondary sources say up to about 89% of the lunar cycle) —
  placeholder
- Comms: excellent. High ground with a strong line of sight to Earth — placeholder
- Water ice: moderate; further from the largest permanently shadowed regions
- Terrain: only about 7.1 km², roughly 1.6% of the region, is suitable for landing
  [WUELLER-2026]
- Game role: the communications site. Shorter Mission Control delays and fewer blackouts,
  but less ice.
## MOON-EQUATORIAL — Equatorial site (Mare Tranquillitatis, Apollo 11 area)
- Coordinates: 0.67° N, 23.47° E — measured (Apollo 11 landing site) — placeholder for the
  citation; use a NASA Apollo 11 mission page
- Illumination: about 14.75 Earth days of daylight followed by about 14.75 days of night
  [NSSDC-FACTS]
- Water ice: none
- Comms: Earth always visible, near-fixed in the sky
- Game role: THE TEACHING SITE. A 354-hour night makes solar power almost unusable and
  forces either a reactor or an enormous battery mass. Pair it with the Connecting Ridge
  in Twin Worlds to show that the site decides the architecture.
---
 
# Site model (what the engine needs per site)
```ts
interface LandingSite {
  id: string; body: 'mars' | 'moon';
  latDeg: number; lonDeg: number; elevationM: number;
  illuminationModel: 'latitudeSolar' | 'polarRidge' | 'equatorialLunar';
  illuminationFraction?: number;      // polarRidge only
  maxDarkHours: number;               // battery sizing driver
  iceAccess: 'none' | 'low' | 'moderate' | 'high';
  iceTraverseHours?: number;          // crew-hours per water run
  doseMSvPerDay: number;              // measured or derived; carries its own confidence
  commsVisibilityFraction: number;    // fraction of time Earth is in view
  terrainDifficulty: number;          // affects EVA time and construction
  dustExposure: number;               // Mars only
  sourceIds: string[];
}
```
Every numeric field renders with its confidence flag in the Commander dial depth, and the
Data Sources screen lists each site's sources.
 
# For the team
- Replace every "placeholder" above with a sourced value, or leave the flag visible in-game.
- Add the NEW source IDs to docs/DATA_SOURCES.md before M9 ships:
  NASA-M2020-LANDING, NASA-MSL-LANDING, SWIM-2021 (Morgan et al., Nature Astronomy 2021,
  https://www.nature.com/articles/s41550-020-01290-z), LUZZI-2025 (JGR Planets,
  https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024JE008724), NASA-ARTEMIS-CLR
  (https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/),
  WUELLER-2026 (JGR Planets, https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JE009434),
  SWIM project site (https://swim.psi.edu/).
- Elevations and exact coordinates for Arcadia and the two polar sites are the weakest
  numbers here; read them off Mars Trek and Moon Trek and record the layer used.
 