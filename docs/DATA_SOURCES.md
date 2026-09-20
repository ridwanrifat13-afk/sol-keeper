# Data Sources Registry
Every constant in packages/sim/src/data/constants.ts references a Source ID below.
Status: ☐ unverified · ☑ verified (page/table recorded by a team member)
Local PDFs live in docs/sources/ (gitignored). Links are the permanent reference.
 
## Documents
 
| ID | Title | URL | Local file | Used for | Page/Table | Verified by | Status |
|---|---|---|---|---|---|---|---|
| BVAD-2022 | NASA Life Support Baseline Values and Assumptions Document (BVAD), 2022 revision | https://ntrs.nasa.gov/citations/20210024855 (PDF: https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf) | BVAD-2022.pdf | crew O2/CO2/food/water, metabolic rate, ESM factors, crop cycles, workweek, ISS power loads | | | ☐ |
| OCHMO-RAD | NASA OCHMO Radiation Protection Technical Brief (NASA-STD-3001) | https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf | OCHMO-radiation-brief.pdf | 600 mSv career limit, 250 mSv per SPE, 20 mSv/yr nuclear tech, 0.8 / 1.3 mSv/day design targets | | | ☐ |
| OCHMO-TB047 | NASA OCHMO Crew Survivability Technical Brief (TB-047) | https://www.nasa.gov/wp-content/uploads/2024/07/ochmo-tb-047-crew-survivability.pdf | OCHMO-TB047-survivability.pdf | survival modes (kcal, water, temperature, CO2), fever metabolic increase | | | ☐ |
| ICES-2017 | Resupply mass for life support (ICES-2017-87) | https://ntrs.nasa.gov/api/citations/20170010337/downloads/20170010337.pdf | ICES-2017-resupply.pdf | ~10 kg/crew-day open-loop resupply incl. tanks | | | ☐ |
| NASA-AMES-STD8070 | NASA Ames Space Flight System Design and Environmental Test Standard (APR 8070.1) | https://www.nasa.gov/wp-content/uploads/2017/03/std8070.1.pdf | — | mass margin by phase: 30 % SRR, 20 % PDR, 15 % CDR, 5 % SIR | Table 3.1.1.1-1 | | ☐ |
| GSFC-STD-1000H | Goddard Space Flight Center Rules for the Design, Development, Verification, and Operation of Flight Systems (Rev H) | https://standards.nasa.gov/sites/default/files/standards/GSFC/H/0/GSFC-STD-1000RevH_Approved.pdf | — | phase-based mass margin rules; predicted mass = basic + growth allowance | Mass margin rule | | ☐ |
| THEMIS-MARGINS | THEMIS mission (UC Berkeley/NASA) resource margin and contingency policy | https://themis.ssl.berkeley.edu/themisftp/1%20Management/1.1%20Management/1.1.4%20Reviews%20and%20Deliverables/RFAs%20(non%20CDR)/thm_SRR_RFA_Response_06_RevA.doc | — | contingency by maturity 25/15/7.5/4/2 %; margin schedule; JPL 20–48 % growth | whole document (short) | | ☐ |
| NASA-WATER-2023 | NASA achieves water recovery milestone on ISS | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station | — | 93–94 % → 98 % water recovery (Brine Processor Assembly) | web page | | ☐ |
| FRONTIERS-2024 | ISS air and water recovery review, Frontiers in Space Technologies (2024) | https://www.frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/full | — | 51 % O2 recovery from CO2; 75 % / 98 % goals | | | ☐ |
| MIT-MOXIE-2023 | MOXIE completes Mars mission (MIT AeroAstro) | https://aeroastro.mit.edu/news-impact/oxygen-generating-experiment-moxie-completes-mars-mission | — | 12 g/h peak, 6 g/h nominal, ≥98 % purity, 122 g total | web page | | ☐ |
| MSL-RAD-SURFACE | Hassler et al. 2014, Mars' surface radiation environment measured with Curiosity, Science 343(6169) | https://doi.org/10.1126/science.1244797 | — | Mars surface dose 0.64 ± 0.12 mSv/day | Abstract | | ☐ |
| MSL-RAD-CRUISE | Zeitlin et al. 2013, Measurements of energetic particle radiation in transit to Mars, Science 340 | https://doi.org/10.1126/science.1235989 | — | cruise dose 1.84 ± 0.30 mSv/day | Abstract | | ☐ |
| MSL-RAD-SUMMARY | Reitz et al., Radiation measurements of MSL-RAD (ICES 2016, DLR) — open-access summary of both values above | https://elib.dlr.de/106090/1/ME-SBA-2016-Reitz_MSL-RAD_ICES_2016.pdf | MSL-RAD-summary.pdf (optional) | cross-check for surface and cruise dose | | | ☐ |
| CE4-LND-2020 | Zhang et al. 2020, First measurements of the radiation dose on the lunar surface, Science Advances 6(39) eaaz1334 (open access) | https://www.science.org/doi/10.1126/sciadv.aaz1334 | CE4-LND-2020.pdf | Moon surface dose equivalent 1,369 µSv/day (≈1.37 mSv/day) | Discussion section | | ☐ |
| NASA-FSP | NASA Fission Surface Power project page | https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power | — | 40 kW-class reactor; lunar operation targeted for the early 2030s | web page | | ☐ |
| NASA-FSP-IAC2024 | Fission Surface Power project status, IAC 2024 manuscript (NTRS) | https://ntrs.nasa.gov/api/citations/20240011694/downloads/IAC%202024%20Manuscript_FSP%20FINAL.pdf | NASA-FSP-IAC2024.pdf (optional) | 40 kWe, 10-year life, < 6,000 kg, 4 m × 6 m stowed | Section 1 | | ☐ |
| NSSDC-FACTS | NASA planetary fact sheets | https://nssdc.gsfc.nasa.gov/planetary/factsheet/ | — | gravity, day length, solar irradiance, orbital distance | Mars & Moon sheets | | ☐ |
| MIYAJIMA-LSS | Miyajima 2020, "Self-Sustainable Life Support System Trade Study for Lunar Farming" (J-STAGE, article 370304, 8 pp.) — ISS/LSS subsystem mass/power/cooling/crew-time table | add link (team named "J-STAGE PDF" as the host but pasted no URL — need the direct link) | — | CO2 scrubber (ISS 4BMS), thermal control (ISS-derived internal TCS), and oxygen generator (ISS SPE) hardware mass, cooling load, crew-time | | | ☐ |
| MIT-16851-WRS | MIT 16.851 Satellite Engineering portfolio, `16_851_portfolio.pdf` (MIT OpenCourseWare; MIT's own listing notes it as a sample student portfolio) — ISS Water Recovery System (WRS) subsystem figures | add link (team named "MIT OpenCourseWare" as the host but pasted no URL) | — | water recovery hardware mass 638 kg, power 0.99 kW, crew time 8.0 CM-h/yr; corroborated against NASA NTRS documentation of the same hardware (exact NTRS accession still pending) | | | ☐ |
| MOXIE-MASS-NASA | NASA Science — Perseverance Science Instruments / MOXIE specifications page | add link (team named "NASA MOXIE specifications" but pasted no URL) | — | MOXIE hardware mass 17.1 kg, power 300 W, up to 10 g/h O2, ~1 h operation per experiment; distinct from MIT-MOXIE-2023's production-rate figures. Independently corroborated by the NASA/JPL Mars 2020 Press Kit's MOXIE entry (~17 kg, designed for 10 g O2/h) — team named it but pasted no URL either | | | ☐ |
| MARS-POWER-ASTRA | NASA ASTRA Technology Roadmaps (NASA NTRS) — Mars surface power-distribution architecture | add link (team named "NASA NTRS — ASTRA Technology Roadmaps PDF" but pasted no URL) | — | power distribution hardware mass 800 kg | | | ☐ |
| SPACECRAFT-SUBSYS-NTRS | NASA NTRS — spacecraft subsystem mass report | add link (team named "NASA NTRS spacecraft subsystem report" but pasted no URL) | — | communications hardware mass 61.0 kg | Table 2-2 | | ☐ |
 
## APIs and map services
 
| ID | Service | Endpoint | Key | Used for | Credit |
|---|---|---|---|---|---|
| API-DONKI | NASA DONKI space weather | https://api.nasa.gov/DONKI/{FLR,SEP,CME,GST} | yes | Live Sky radiation storms | NASA CCMC / Space Weather Research Center |
| API-HORIZONS | JPL Horizons | https://ssd.jpl.nasa.gov/api/horizons.api | no | Earth–Mars / Earth–Moon light-time | NASA/JPL Solar System Dynamics |
| API-IMAGES | NASA Image and Video Library | https://images-api.nasa.gov/search | no | fact-card photos | per-image credit from API |
| TREK-MOON | Moon Trek WMTS — LRO WAC Mosaic Global 303ppd v02 | https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02 | no | Moon landing-site map | NASA/GSFC/Arizona State University, via NASA Moon Trek |
| TREK-MARS | Mars Trek WMTS — Viking MDIM2.1 Colorized Global Mosaic 232m | https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m | no | Mars landing-site map | NASA Ames / USGS Astrogeology, via NASA Mars Trek |
 
Full tile details: docs/trek_layers.md
 
## Derived values (computed by us from the sources above)
 
| Value | How it is derived | From |
|---|---|---|
| Electrolysis 1.125 kg H2O per kg O2 | stoichiometry of 2H2O → 2H2 + O2 | chemistry |
| Electrolysis energy ~4.9 kWh/kg O2 (theoretical), 7.5 kWh/kg (practical, tunable) | enthalpy of water splitting; efficiency assumed | chemistry |
| Grow-light load 100–200 W/m² | crop light targets ÷ LED efficacy (~2.5–3 µmol/J) | engineering estimate |
| Solar irradiance at distance r | 1361 W/m² × (1 AU / r)² | NSSDC-FACTS |
| Lunar night battery mass | load × hours ÷ (pack Wh/kg × depth of discharge × efficiency) | engineering formula |
| Light-time | Horizons distance (AU) × 499.004784 s | API-HORIZONS |
 
## Internal source IDs

Not every constant comes from a document. These two IDs cover the rest, and exist as rows so
that `packages/sim/src/data/sources.ts` and this file can be checked against each other
automatically (`validation/constants.test.ts` fails if either side gains an entry the other
lacks).

| ID | Stands for | Used for | Verified by | Status |
|---|---|---|---|---|
| STOICHIOMETRY | Textbook physical chemistry and IAU/CODATA defined values — see "Derived values" above | molar masses, gas constant, mmHg, AU, light-time per AU, electrolysis ratio | n/a | ☑ |
| GAME-DESIGN | Sol Keeper gameplay tuning — **not a NASA source** — see "Game simplifications" below | shielding curves, thermal conductance, failure rates, crop photoperiod, cell efficiency | n/a | ☑ |

## Game simplifications (disclosed to players)
- Shielding curves, crop yields, thermal conductance, and failure rates are tuned for gameplay.
- The solar-particle-event limit is stated by NASA-STD-3001 as 250 mGy-Eq over 30 days.
  Gray-equivalent weights by relative biological effectiveness where the sievert weights by
  radiation type, so the two are not interchangeable. The game accumulates dose in mSv and
  compares it against 250 directly, which is close enough for the lesson (shelter during a
  storm) but is not a dosimetry calculation.
- Habitat oxygen set point (160 mmHg) and fire-risk threshold (200 mmHg) are still
  unverified placeholders. They decide how much power and water making oxygen costs.
- DONKI events are observed near Earth. Moon storms are realistic; Mars storms are
  "based on real solar activity on [date]", not claimed to hit Mars.
- Equirectangular maps stretch near the poles (visible in the lunar south pole view).
 