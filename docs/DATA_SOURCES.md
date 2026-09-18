# Data Sources Registry
Every constant in packages/sim/src/data/constants.ts references a Source ID below.
Status: ☐ unverified · ☑ verified (page/table recorded)

## Documents
| ID | Title | URL | Local file | Used for | Page/Table | Verified by | Status |
|---|---|---|---|---|---|---|---|
| BVAD-2022 | NASA Life Support Baseline Values and Assumptions Document | https://ntrs.nasa.gov/citations/20210024855 | BVAD-2022.pdf | crew O2/CO2/food/water, ESM factors, crop cycles | | | ☐ |
| OCHMO-RAD | NASA OCHMO Radiation Protection Technical Brief | (link from Task 8) | OCHMO-radiation-brief.pdf | 600 mSv career, 250 mSv SPE, 0.8 mSv/day target | | | ☐ |
| OCHMO-TB047 | NASA OCHMO Crew Survivability Brief | (link from Task 8) | OCHMO-TB047-survivability.pdf | survival modes, fever effect | | | ☐ |
| ICES-2017 | Resupply mass (ICES-2017-87) | (link from Task 8) | ICES-2017-resupply.pdf | 10 kg/crew-day open loop | | | ☐ |
| NTRS-MARGINS | Mass/power margins and contingency | (link from Task 8) | NTRS-margins.pdf | margins by phase, contingency | | | ☐ |
| NASA-WATER-2023 | ISS 98% water recovery milestone | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station | — | 93.5% → 98% recovery | — | | ☐ |
| MIT-MOXIE-2023 | MOXIE completes Mars mission | https://aeroastro.mit.edu/news-impact/oxygen-generating-experiment-moxie-completes-mars-mission | — | 12 g/h, 122 g total | — | | ☐ |
| FRONTIERS-2024 | ISS air/water recovery review | https://www.frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/full | — | 51% O2 recovery, goals | — | | ☐ |
| MSL-RAD | Curiosity RAD surface and cruise dose | (add paper link) | — | 0.64 / 1.84 mSv/day | | | ☐ |
| CE4-LND-2020 | Chang'e-4 lunar surface dose, Science Advances | (add link) | CE4-LND-2020.pdf | 1.37 mSv/day | | | ☐ |
| NASA-FSP | Fission Surface Power project | (add NASA page link) | — | 40 kWe, 10 yr, ≤6000 kg | — | | ☐ |
| NSSDC-FACTS | NASA planetary fact sheets | https://nssdc.gsfc.nasa.gov/planetary/factsheet/ | — | gravity, day length, irradiance | — | | ☐ |

## APIs
| ID | Service | Endpoint | Key | Used for |
|---|---|---|---|---|
| API-DONKI | NASA DONKI | https://api.nasa.gov/DONKI/{FLR,SEP,CME,GST} | yes | Live Sky radiation storms |
| API-HORIZONS | JPL Horizons | https://ssd.jpl.nasa.gov/api/horizons.api | no | comms light-time |
| API-IMAGES | NASA Image and Video Library | https://images-api.nasa.gov/search | no | fact-card photos |
| API-TREK | Moon/Mars Trek WMTS | see docs/api-samples/trek_layers.md | no | landing-site maps |

## Game simplifications (disclosed to players)
- Shielding curves, crop yields, thermal conductance, and failure rates are tuned for gameplay.
- DONKI events are observed near Earth; Mars storms are "based on real solar activity", not claimed to hit Mars.