/**
 * Display metadata for every `SourceId` — title, link, what it backs.
 *
 * `@sol-keeper/sim`'s `SourceId` union only needs to exist for the typechecker (brief rule
 * 1: a constant cannot name a source that isn't real). It carries no title or URL, because
 * the simulation has no business rendering a citation. This manifest is that missing half,
 * kept in the client rather than the sim package, and mirrors docs/DATA_SOURCES.md by hand.
 *
 * Coverage is enforced by the type system, not a test: `Record<SourceId, SourceInfo>` makes
 * a missing entry a `tsc` error the moment `@sol-keeper/sim` adds a new `SourceId`, in the
 * same spirit as `validation/constants.test.ts` checking the sim against the markdown.
 */
import type { SourceId } from "@sol-keeper/sim";

export interface SourceInfo {
  readonly title: string;
  readonly url?: string;
  readonly usedFor: string;
}

export const SOURCE_REGISTRY: Record<SourceId, SourceInfo> = {
  "BVAD-2022": {
    title: "NASA Life Support Baseline Values and Assumptions Document (BVAD), 2022 revision",
    url: "https://ntrs.nasa.gov/citations/20210024855",
    usedFor: "crew O₂/CO₂/food/water, metabolic rate, ESM factors, crop cycles, workweek, ISS power loads",
  },
  "OCHMO-RAD": {
    title: "NASA OCHMO Radiation Protection Technical Brief (NASA-STD-3001)",
    url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf",
    usedFor: "600 mSv career limit, 250 mGy-Eq per 30-day SPE, 20 mSv/yr nuclear tech, 0.8/1.3 mSv/day design targets",
  },
  "OCHMO-TB047": {
    title: "NASA OCHMO Crew Survivability Technical Brief (TB-047)",
    url: "https://www.nasa.gov/wp-content/uploads/2024/07/ochmo-tb-047-crew-survivability.pdf",
    usedFor: "survival modes (kcal, water, temperature, CO₂), fever metabolic increase",
  },
  "OCHMO-TB003": {
    title: "NASA OCHMO Habitable Atmosphere Technical Brief (TB-003 Rev A)",
    url: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf",
    usedFor: "habitat oxygen set point (160 mmHg sea-level-equivalent ppO₂)",
  },
  "ICES-2017": {
    title: "Resupply mass for life support (ICES-2017-87)",
    url: "https://ntrs.nasa.gov/api/citations/20170010337/downloads/20170010337.pdf",
    usedFor: "~10 kg/crew-day open-loop resupply, including tanks",
  },
  "NASA-AMES-STD8070": {
    title: "NASA Ames Space Flight System Design and Environmental Test Standard (APR 8070.1)",
    url: "https://www.nasa.gov/wp-content/uploads/2017/03/std8070.1.pdf",
    usedFor: "mass margin by review milestone: 30% SRR, 20% PDR, 15% CDR, 5% SIR",
  },
  "GSFC-STD-1000H": {
    title:
      "Goddard Space Flight Center Rules for the Design, Development, Verification, and Operation of Flight Systems (Rev H)",
    url: "https://standards.nasa.gov/sites/default/files/standards/GSFC/H/0/GSFC-STD-1000RevH_Approved.pdf",
    usedFor: "phase-based mass margin rule: predicted mass = basic mass + growth allowance",
  },
  "THEMIS-MARGINS": {
    title: "THEMIS mission (UC Berkeley/NASA) resource margin and contingency policy",
    url: "https://themis.ssl.berkeley.edu/themisftp/1%20Management/1.1%20Management/1.1.4%20Reviews%20and%20Deliverables/RFAs%20(non%20CDR)/thm_SRR_RFA_Response_06_RevA.doc",
    usedFor: "contingency by design maturity (25/15/7.5/4/2%); the 20-48% historical mass growth range",
  },
  "NASA-WATER-2023": {
    title: "NASA achieves water recovery milestone on ISS",
    url: "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
    usedFor: "93.5% → 98% water recovery with the Brine Processor Assembly",
  },
  "FRONTIERS-2024": {
    title: "ISS air and water recovery review, Frontiers in Space Technologies (2024)",
    url: "https://www.frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/full",
    usedFor: "51% O₂ recovery from CO₂ today; 75% research goal",
  },
  "MIT-MOXIE-2023": {
    title: "MOXIE completes Mars mission (MIT AeroAstro)",
    url: "https://aeroastro.mit.edu/news-impact/oxygen-generating-experiment-moxie-completes-mars-mission",
    usedFor: "12 g/h peak, 6 g/h nominal, ≥98% purity, 122 g produced across the whole mission",
  },
  "MSL-RAD-SURFACE": {
    title: "Hassler et al. 2014, Mars' surface radiation environment measured with Curiosity, Science 343(6169)",
    url: "https://doi.org/10.1126/science.1244797",
    usedFor: "Mars surface dose, 0.64 ± 0.12 mSv/day",
  },
  "MSL-RAD-CRUISE": {
    title: "Zeitlin et al. 2013, Measurements of energetic particle radiation in transit to Mars, Science 340",
    url: "https://doi.org/10.1126/science.1235989",
    usedFor: "deep-space cruise dose, 1.84 ± 0.30 mSv/day",
  },
  "MSL-RAD-SUMMARY": {
    title: "Reitz et al., Radiation measurements of MSL-RAD (ICES 2016, DLR)",
    url: "https://elib.dlr.de/106090/1/ME-SBA-2016-Reitz_MSL-RAD_ICES_2016.pdf",
    usedFor: "open-access cross-check for the surface and cruise dose figures above",
  },
  "CE4-LND-2020": {
    title: "Zhang et al. 2020, First measurements of the radiation dose on the lunar surface, Science Advances 6(39)",
    url: "https://www.science.org/doi/10.1126/sciadv.aaz1334",
    usedFor: "Moon surface dose equivalent, 1,369 µSv/day (≈1.37 mSv/day)",
  },
  "NASA-FSP": {
    title: "NASA Fission Surface Power project page",
    url: "https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power",
    usedFor: "40 kW-class reactor; lunar operation targeted for the early 2030s",
  },
  "NASA-FSP-IAC2024": {
    title: "Fission Surface Power project status, IAC 2024 manuscript (NTRS)",
    url: "https://ntrs.nasa.gov/api/citations/20240011694/downloads/IAC%202024%20Manuscript_FSP%20FINAL.pdf",
    usedFor: "40 kWe, 10-year design life, under 6,000 kg, 4 m × 6 m stowed",
  },
  "NSSDC-FACTS": {
    title: "NASA planetary fact sheets",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    usedFor: "gravity, day length, solar irradiance, orbital distance — Mars and Moon",
  },
  "MIYAJIMA-LSS": {
    title: "Miyajima, \"Self-Sustainable Life Support System Trade Study for Lunar Farming\"",
    url: "https://doi.org/10.15011/ijmsa.37.3.370304",
    usedFor:
      "CO2 scrubber, thermal control and oxygen generator hardware mass, cooling load and crew-time (ISS 4BMS / internal TCS / SPE)",
  },
  "MIT-16851-WRS": {
    title: "Richards, MIT 16.851 Satellite Engineering Portfolio — ISS Water Recovery System",
    url: "https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/1b24b751674a5d7db79cad58eefe2ade_16_851_portfolio.pdf",
    usedFor: "water recovery hardware mass and crew-time",
  },
  "MOXIE-MASS-NASA": {
    title: "NASA Science — Perseverance Science Instruments",
    url: "https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/",
    usedFor: "MOXIE hardware mass",
  },
  "RUCKER-2015-SURFACE-POWER": {
    title: "Rucker, \"Integrated Surface Power Strategy for Mars\" (NASA JSC)",
    url: "https://ntrs.nasa.gov/api/citations/20150000526/downloads/20150000526.pdf",
    usedFor: "power distribution hardware mass (1 km of cable plus an inverter/junction box)",
  },
  "SPACECRAFT-SUBSYS-NTRS": {
    title: "NASA CR-189186 — TT&C RF Communications Mass and Power (Table 6-1)",
    url: "https://ntrs.nasa.gov/api/citations/19920019663/downloads/19920019663.pdf",
    usedFor: "communications hardware mass",
  },
  STOICHIOMETRY: {
    title: "Textbook physical chemistry and IAU/CODATA defined values",
    usedFor: "molar masses, the gas constant, mmHg, the astronomical unit, light-time per AU",
  },
  "GAME-DESIGN": {
    title: "Sol Keeper gameplay tuning — not a NASA source",
    usedFor: "shielding curves, thermal conductance, failure rates, crop photoperiod, cell efficiency",
  },
  "NASA-SPACEBIO-1975": {
    title: "Space Biology and Medicine — human survival limits without water (NTRS 19760019741)",
    url: "https://ntrs.nasa.gov/citations/19760019741",
    usedFor: "thirst clock: ~336 h ideal survival without water, 6 h floor under harsh conditions",
  },
  "NASA-NUTRITION-2015": {
    title: "Nutritional Biochemistry of Spaceflight (NTRS 20150000512)",
    url: "https://ntrs.nasa.gov/citations/20150000512",
    usedFor: "starvation clock: total-starvation deficit bound, metabolic adaptation to sustained restriction",
  },
  "NASA-HYPOTHERMIA-2008": {
    title: "Human survival time in cold water/air (NTRS 20080014194)",
    url: "https://ntrs.nasa.gov/citations/20080014194",
    usedFor: "hypothermia clock: 4.4°C immersion/raft survival anchors, the air-vs-water conversion factor",
  },
  "NASA-ORION-FS": {
    title: "Orion spacecraft overview fact sheet",
    url: "https://www.nasa.gov/wp-content/uploads/2015/06/orion_quick_facts.pdf",
    usedFor: "lunar return transit time (Artemis I actual, and the planned range)",
  },
  "NASA-SP-4030": {
    title: "NASA SP-4030, Wagner Award history documenting the Mir fire, February 1997",
    usedFor: "Mir fire incident: ~14-minute burn duration (a disputed 90-second figure also exists)",
  },
  "NASA-MIR-FIRE-25YR": {
    title: "NASA \"25 Years Ago: Fire Aboard Space Station Mir\"",
    url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
    usedFor: "fire-mir97's own residual cost: some of Kvant-1's solar panels were charred — permanent equipment damage regardless of response chosen",
  },
  "MIR-FIRE-LINENGER": {
    title: "Jerry Linenger (Mir EO-23 crew member) firsthand account of the fire, via BBC Science Focus",
    url: "https://www.sciencefocus.com/space/fire-in-space-jerry-linenger",
    usedFor: "measured-reported: respirators lasted 45 min–1 h, ~24 h of manual cleanup — fire-mir97's smoke-recovery residual cost",
  },
  "OCHMO-TB004": {
    title: "NASA OCHMO Carbon Dioxide (CO2) Technical Brief (TB-004)",
    usedFor: "CO2 immediately-dangerous-to-life-or-health threshold (30.4 mmHg / ~4%)",
  },
  "HRP-ARS": {
    title: "NASA Human Research Program evidence report — Acute Radiation Syndrome thresholds",
    usedFor: "onset/severe/lethal acute dose bands (0.1-0.2 / 2 / 3.25 Gy) used by the outcome state machine",
  },
  "NASA-SMA-MIR-COLLISION": {
    title: "NASA Shuttle-Mir history: the Progress-Mir collision and depressurization, June 1997",
    usedFor: "Sealing Spektr cost about half of Mir's power (arrays isolated with it) — the depress-mir97 incident's residual cost",
  },
  "NASA-SHUTTLE-MIR": {
    title: "NASA Shuttle-Mir spacecraft history — Spektr module page",
    url: "https://spaceflight.nasa.gov/history/shuttle-mir/spacecraft/s-mir-spektr-main.htm",
    usedFor: "Spektr's pressurised volume (62 m³) for the depress-mir97 incident's choked-flow leak model",
  },
  "A13-CO2": {
    title: "Apollo 13 CO2 partial pressure account (crew debrief + accident review board, via Universe Today)",
    url: "https://www.universetoday.com/articles/13-things-that-saved-apollo-13-part-10-duct-tape",
    usedFor: "measured-reported: 15 mmHg peak ppCO2, below 2 mmHg after the fix — the o2tank-apollo13 incident's CO2-rise model",
  },
  "MS22-THERMAL": {
    title: "Soyuz MS-22 coolant leak thermal reporting (Roscosmos statements via TASS), December 2022",
    url: "https://tass.com/science/1552657",
    usedFor: "measured-reported: cabin ~30°C, equipment bay ~40°C peak — the coolant-ms22 incident's heat-rise model",
  },
  "NSF-MS22": {
    title: "NASASpaceflight reporting on the post-MS-22 crewed thermal-abort criteria, March 2023",
    url: "https://www.nasaspaceflight.com/2023/03/soyuz-ms-22-return/",
    usedFor: "measured-reported: wet-bulb heat-stress threshold (31°C at ~95% RH) and equipment failure limits",
  },
  "AGU-KNIPP-2018": {
    title: "Knipp et al. (2018), \"On the Little-Known Consequences of the 4 August 1972 Ultra-Fast Coronal Mass Ejecta\", Space Weather 16(11)",
    url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2018SW002024",
    usedFor: "spe-1972's own residual cost: Intelsat IV F-2's real ~5% permanent solar-array power loss from the actual 1972 event — the incident's \"electronics take a degradation roll\" magnitude",
  },
  "ICES-2019-CDRA": {
    title: "Cmarik & Knox (2019), \"CO2 Removal Onboard the International Space Station\", ICES-2019-5",
    url: "https://ntrs.nasa.gov/api/citations/20190030370/downloads/20190030370.pdf",
    usedFor: "scrubber-iss's own residual cost: CDRA sorbent-bed degradation after many operating cycles — the qualitative basis for a repaired bed running at reduced capacity",
  },
  "JPL-DUSTSTORM2018-TAU": {
    title: "NASA JPL, \"Opportunity Hunkers Down During Dust Storm\" (Mars Climate Sounder optical-depth reporting)",
    url: "https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/",
    usedFor: "duststorm-2018's own severity: dust optical depth (tau) reached 10.8, the highest ever recorded on Mars",
  },
  "LORENZ-2020-INSIGHT-DUST": {
    title: "Lorenz et al. (2020), \"Scientific Observations With the InSight Solar Arrays\", Earth and Space Science 7(5)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7375148/",
    usedFor: "duststorm-2018's own residual cost: InSight's real ~0.28%/sol permanent dust decline, never fully recoverable — the model for dust accumulation being permanent and cumulative",
  },
  "NASA-M2020-LANDING": {
    title: "NASA Mars 2020 Perseverance landing site (Octavia E. Butler Landing, Jezero Crater)",
    usedFor: "MARS-JEZERO landing-site coordinates, 18.44°N, 77.45°E",
  },
  "NASA-MSL-LANDING": {
    title: "NASA Mars Science Laboratory Curiosity landing site (Bradbury Landing, Gale Crater)",
    usedFor: "MARS-GALE landing-site coordinates, 4.59°S, 137.44°E",
  },
  "SWIM-2021": {
    title: "Morgan et al. (2021), \"Availability of subsurface water-ice resources in the northern mid-latitudes of Mars\", Nature Astronomy 5",
    url: "https://www.nature.com/articles/s41550-020-01290-z",
    usedFor: "MARS-ARCADIA's accessible subsurface ice; also the absence-of-ice evidence for MARS-JEZERO",
  },
  "LUZZI-2025": {
    title: "Luzzi et al. (2025), JGR Planets",
    url: "https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024JE008724",
    usedFor: "MARS-ARCADIA: ice beneath thermal-contraction polygons at roughly tens of centimetres depth",
  },
  "NASA-ARTEMIS-CLR": {
    title: "NASA, \"NASA Identifies Candidate Regions for Landing Next Americans on the Moon\"",
    url: "https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/",
    usedFor: "MOON-CONNECTING-RIDGE and MOON-MALAPERT as official Artemis III candidate landing regions",
  },
  "WUELLER-2026": {
    title: "Wueller et al. (2026), JGR Planets",
    url: "https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JE009434",
    usedFor: "terrain suitability for MOON-CONNECTING-RIDGE and MOON-MALAPERT",
  },
  "AIP-2023-REGOLITH-SHIELD": {
    title: "Al Zaman & Kunja (2023), \"Effectiveness of radiation shields constructed from Martian regolith and different polymers\", AIP Advances 13",
    url: "https://pubs.aip.org/aip/adv/article/13/8/085108/2905736",
    usedFor: "the regolithBerm shielding approach's g/cm² delta (a 15 g/cm² regolith+polymer combination shield)",
  },
  "WHEELER-2024-CO2-SALAD": {
    title: "Wheeler et al. (2024), \"Effects of elevated and super-elevated carbon dioxide on salad crops for space\", Journal of Plant Interactions 19(1)",
    url: "https://www.tandfonline.com/doi/full/10.1080/17429145.2023.2292219",
    usedFor: "the cabin-CO2 crop-growth-rate bonus range (real beneficial/super-elevated ppm thresholds; the in-sim bonus magnitude itself is a disclosed game-scaled choice)",
  },
  "NTRS-LUNAR-MAINT-CREWTIME": {
    title: "Lynch, Stromgren, Cho, Cirillo, Owens (2022), \"Assessment of Crew Time for Maintenance and Repair Activities for Lunar Surface Missions\", IEEE Aerospace Conference 2022",
    url: "https://ntrs.nasa.gov/citations/20220002626",
    usedFor: "the Habitat page's scheduled-maintenance lever: the real expected corrective-maintenance crew-hours rate for a 2-crew lunar Surface Habitat mission (Table 3)",
  },
  "NASA-AMF-RATCHET": {
    title: "NASA, \"Space Station 3-D Printer Builds Ratchet Wrench To Complete First Phase Of Operations\"",
    url: "https://www.nasa.gov/missions/station/space-station-3-d-printer-builds-ratchet-wrench-to-complete-first-phase-of-operations/",
    usedFor: "Incident Command's print-a-spare lever: the real 4-hour print time for the ISS Additive Manufacturing Facility's first uplinked tool",
  },
};
