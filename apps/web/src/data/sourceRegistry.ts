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
  STOICHIOMETRY: {
    title: "Textbook physical chemistry and IAU/CODATA defined values",
    usedFor: "molar masses, the gas constant, mmHg, the astronomical unit, light-time per AU",
  },
  "GAME-DESIGN": {
    title: "Sol Keeper gameplay tuning — not a NASA source",
    usedFor: "shielding curves, thermal conductance, failure rates, crop photoperiod, cell efficiency",
  },
};
