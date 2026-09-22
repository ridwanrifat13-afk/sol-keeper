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
| OCHMO-TB003 | NASA OCHMO Habitable Atmosphere Technical Brief (TB-003 Rev A, 30 Nov 2023) | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf (confirmed 2026-09 by downloading and extracting the text: "Sea Level Total Air Pressure 1 ATM=760 mmHg=14.7psia=101.3 kPa", sea-level composition "20.95% Oxygen", and "ISS cabin pressure is typically maintained at 14.7 psia with 21% O2, which is equivalent to sea level") | — | habitat oxygen set point, 160 mmHg sea-level-equivalent ppO2 (760 x 0.2095 = 159.2; 760 x 0.21 = 159.6) | "Sea Level Air Composition" and "Standard Sea-Level Atmosphere" panels | | ☐ |
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
| MIYAJIMA-LSS | Miyajima 2020, "Self-Sustainable Life Support System Trade Study for Lunar Farming", Int. J. Microgravity Sci. Appl. 37(3), article 370304 | https://doi.org/10.15011/ijmsa.37.3.370304 (resolves to the J-STAGE article page; free "Download PDF (1016K)" link confirmed present 2026-09) | — | CO2 scrubber (ISS 4BMS), thermal control (ISS-derived internal TCS), and oxygen generator (ISS SPE) hardware mass, cooling load, crew-time | | | ☐ |
| MIT-16851-WRS | Richards, MIT 16.851 Satellite Engineering Portfolio (Fall 2003, advisors D. Miller & J. Keesee) — "Water Recovery System-ISS" table | https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/1b24b751674a5d7db79cad58eefe2ade_16_851_portfolio.pdf (confirmed 2026-09 by downloading and extracting text: table titled "ESM for ISS Water Recovery System" states Mass 638 kg, Volume 0.5 m³, Power 0.99 kW, Crew Time 8.0 ch/y, ESM* 811.8 kg — exact match to the team's figures) | — | water recovery hardware mass 638 kg, volume 0.5 m³, power 0.99 kW, crew time 8.0 CM-h/yr | Ch. 13 "Human Factors" (not Ch. 4 "Power Systems" as first suggested — verified 2026-09 against the document's own table of contents) | | ☐ |
| MOXIE-MASS-NASA | NASA Science — Perseverance Science Instruments page | https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/ (confirmed 2026-09: states MOXIE mass as "about 37.7 pounds (17.1 kilograms) on Earth", matching the team's figure exactly) | — | MOXIE hardware mass 17.1 kg, power 300 W, up to 10 g/h O2, ~1 h operation per experiment; distinct from MIT-MOXIE-2023's production-rate figures. The team also named the NASA/JPL Mars 2020 Press Kit as independent confirmation (~17 kg, 10 g O2/h), but pasted no URL and a 2026-09 check of the press kit's "quick facts" and "experimental technologies" pages did not turn up that figure on either — not included as a separate citation | | | ☐ |
| RUCKER-2015-SURFACE-POWER | Rucker, "Integrated Surface Power Strategy for Mars" (NASA JSC, NTRS 20150000526) | https://ntrs.nasa.gov/api/citations/20150000526/downloads/20150000526.pdf (confirmed 2026-09 by downloading and extracting the text: "High voltage transmission cable is assumed at 60 kg per km, while low voltage DC cable ranges from 1,028 kg … to 1,349 kg for 1 km of armored cable; this study assumed 1,100 kg", "an Inverter/Junction box would be about 150 kg for all options", and "located at least one kilometer (km) from the crew habitat") | — | power distribution hardware mass, derived as 1 km x 1,100 kg/km low-voltage cable + 150 kg junction box = 1,250 kg. Replaces the unlocatable MARS-POWER-ASTRA row and its uncited 800 kg | pp. 2, 5 (assumptions list, items c-d) | | ☐ |
| SPACECRAFT-SUBSYS-NTRS | NASA CR-189186 (1992), "Technical Support for Defining Advanced Satellite Systems Concepts", Final Report for Task Order 7: Mass and Power (LORAL/Space Systems Loral, NTRS 19920019663) | https://ntrs.nasa.gov/api/citations/19920019663/downloads/19920019663.pdf | — | communications hardware mass — Table 6-1 gives 18 kg (S-Band/SGLS, used here), 17 kg (C-Band), or 16 kg (Ku-Band) for TT&C RF hardware; none of these is the 61.0 kg the team first cited from this report by title alone — read directly by a team member 2026-09, no 61.0 kg figure appears anywhere in the document | Table 6-1 | | ☐ |
| NASA-SPACEBIO-1975 | Space Biology and Medicine, human survival limits without water (NTRS 19760019741) — cited by docs/INCIDENTS_AND_THRESHOLDS.md, not yet independently downloaded and read by this project | https://ntrs.nasa.gov/citations/19760019741 | — | thirst clock: ~336 h ideal survival without water, 6 h floor under harsh conditions | | | ☐ |
| NASA-NUTRITION-2015 | Nutritional Biochemistry of Spaceflight (NTRS 20150000512) — cited by docs/INCIDENTS_AND_THRESHOLDS.md, not yet independently downloaded and read by this project | https://ntrs.nasa.gov/citations/20150000512 | — | starvation clock: total-starvation lethal deficit bound, metabolic adaptation to sustained caloric restriction | | | ☐ |
| NASA-HYPOTHERMIA-2008 | Human survival time in cold water/air (NTRS 20080014194) — cited by docs/INCIDENTS_AND_THRESHOLDS.md, not yet independently downloaded and read by this project | https://ntrs.nasa.gov/citations/20080014194 | — | hypothermia clock: 4.4 degC immersion/raft survival anchors, the air-vs-water conversion factor (kAir) | | | ☐ |
| NASA-ORION-FS | Orion spacecraft overview fact sheet — cited by docs/INCIDENTS_AND_THRESHOLDS.md, not yet independently downloaded and read by this project | https://www.nasa.gov/wp-content/uploads/2015/06/orion_quick_facts.pdf | — | lunar return transit time: Artemis I actual (6 d) and the planned range (9-19 d) | | | ☐ |
| NASA-SP-4030 | NASA SP-4030 history documenting the Mir fire, February 1997 — cited by docs/INCIDENTS_AND_THRESHOLDS.md, not yet independently downloaded and read by this project | | — | fire-mir97 incident: ~14-minute burn duration (a disputed 90-second figure also exists in other accounts) | | | ☐ |
| OCHMO-TB004 | NASA OCHMO Carbon Dioxide (CO2) Technical Brief (TB-004) — named by docs/INCIDENTS_AND_THRESHOLDS.md, unlike TB-003/TB-047 this project has not independently located and opened it | | — | TODO: CO2 immediately-dangerous-to-life-or-health threshold (~30.4 mmHg / ~4%) | | | ☐ |
| HRP-ARS | NASA Human Research Program document on Acute Radiation Syndrome thresholds — named by docs/INCIDENTS_AND_THRESHOLDS.md, exact document not yet identified by this project | | — | TODO: onset/severe/lethal acute radiation dose bands used by the outcome state machine | | | ☐ |
| INC-DEPRESS-MIR97-PENDING | Progress-Mir collision and depressurization, June 1997 — source not yet supplied by the team | | — | TODO: cabin pressure loss rate for the depress-mir97 incident | | | ☐ |
| INC-O2TANK-APOLLO13-PENDING | Apollo 13 oxygen tank failure, 1970 — source not yet supplied by the team | | — | TODO: fraction of O2 supply lost for the o2tank-apollo13 incident | | | ☐ |
| INC-COOLANT-MS22-PENDING | Soyuz MS-22 coolant leak, December 2022 — source not yet supplied by the team | | — | TODO: thermal-control capacity loss rate for the coolant-ms22 incident | | | ☐ |
| INC-SPE-1972-PENDING | August 1972 solar particle event — source not yet supplied by the team | | — | TODO: dose magnitude relative to the design-reference SPE for the spe-1972 incident | | | ☐ |
| INC-SCRUBBER-ISS-PENDING | ISS CO2 scrubber (CDRA) recurring failures — source not yet supplied by the team | | — | TODO: post-incident failure-rate multiplier for the scrubber-iss incident | | | ☐ |
| INC-DUSTSTORM2018-PENDING | 2018 Mars global dust storm (the one that ended Opportunity) — source not yet supplied by the team | | — | TODO: severity of the 2018 storm relative to the modelled ordinary dust-storm hazard | | | ☐ |
 
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
- Fire risk from an oxygen-rich cabin is **not modelled at all**, deliberately. NASA's own
  guidance is that flammability tracks oxygen *concentration* (percent by volume) and total
  pressure, not oxygen partial pressure on its own — OCHMO-TB-003 notes diluent gas is used
  specifically "to reduce the atmosphere ignition/flammability threshold". This simulation
  tracks only O2 and CO2 partial pressures, with no nitrogen or total-pressure model, so it
  has no honest way to compute a concentration. An earlier fixed 200 mmHg "fire-risk"
  constant was removed rather than left in: it was never read by any model, and it was the
  wrong quantity to threshold on in the first place.
- DONKI events are observed near Earth. Moon storms are realistic; Mars storms are
  "based on real solar activity on [date]", not claimed to hit Mars.
- Equirectangular maps stretch near the poles (visible in the lunar south pole view).
 