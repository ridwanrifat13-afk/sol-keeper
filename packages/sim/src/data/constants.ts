/**
 * Every physical and mission parameter in Sol Keeper (brief rule 1).
 *
 * House style, so that a teammate checking a value against the source PDF can change one
 * number in one place:
 *   - the literal is written exactly as the source document states it, in the source's own
 *     unit. No pre-multiplied conversions, no folded-in fudge factors.
 *   - unit conversions and derived quantities are computed in code (see units.ts) at the
 *     point of use, never baked into the literal.
 *   - where the brief quotes a convenient secondary form (e.g. "11.82 MJ/CM-day = 136.8 W"),
 *     the secondary form goes in `note` as a cross-check, not into a second constant that
 *     could drift.
 */
import { c } from "./sources.js";

/** Crew metabolic and consumption rates. NASA BVAD, NASA OCHMO technical briefs. */
export const crew = {
  metabolicRateMjPerCrewDay: c({
    value: 11.82,
    unit: "MJ/CM-day",
    source: "BVAD-2022",
    confidence: "measured",
    note: "= 136.8 W per crew member (11.82e6 J / 86400 s). Used as sensible heat load in the thermal model.",
  }),
  o2ConsumptionKgPerCrewDay: c({
    value: 0.84,
    unit: "kg/CM-day",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  co2ProductionKgPerCrewDay: c({
    value: 1.0,
    unit: "kg/CM-day",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  foodDryMassKgPerCrewDay: c({
    value: 0.62,
    unit: "kg/CM-day",
    source: "BVAD-2022",
    confidence: "measured",
    note: "BVAD summary value. Validation: 6 crew x 730 d = 2716 kg against the 2.7 t BVAD figure.",
  }),
  waterUseTotalKgPerCrewDay: c({
    value: 4.35,
    unit: "kg/CM-day",
    source: "BVAD-2022",
    confidence: "measured",
    note: "BVAD 2018 total water use: drink, food prep, hygiene, flush.",
  }),
  feverMetabolicIncreasePerDegC: c({
    value: 0.11,
    unit: "fraction/degC above 37 degC",
    min: 0.1,
    max: 0.12,
    source: "OCHMO-TB047",
    confidence: "measured",
    note: "Brief states +10-12% per degC above 37 degC; midpoint stored.",
  }),
  workweekOnDays: c({ value: 5, unit: "days", source: "BVAD-2022", confidence: "measured" }),
  workweekOffDays: c({ value: 2, unit: "days", source: "BVAD-2022", confidence: "measured" }),
  vacationDaysPerCrewYear: c({
    value: 8,
    unit: "days/CM-year",
    source: "BVAD-2022",
    confidence: "measured",
  }),
} as const;

/**
 * Crew survivability modes. OCHMO TB-047.
 * These are thresholds the crew model compares against, and the rationing levels the
 * player can select (P1 "survival-mode ration control").
 */
export const survivalModes = {
  nominal: {
    kcalPerCrewDay: c({
      value: 3600,
      unit: "kcal/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    waterLitersPerCrewDay: c({
      value: 4.0,
      unit: "L/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    habitatTempC: c({ value: 22, unit: "degC", source: "OCHMO-TB047", confidence: "measured" }),
    co2LimitMmHg: c({ value: 3.0, unit: "mmHg", source: "OCHMO-TB047", confidence: "measured" }),
  },
  mode1: {
    kcalPerCrewDay: c({
      value: 1800,
      unit: "kcal/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    waterLitersPerCrewDay: c({
      value: 1.25,
      unit: "L/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    habitatTempC: c({ value: 18, unit: "degC", source: "OCHMO-TB047", confidence: "measured" }),
    co2LimitMmHg: c({ value: 7.6, unit: "mmHg", source: "OCHMO-TB047", confidence: "measured" }),
  },
  mode2: {
    kcalPerCrewDay: c({
      value: 600,
      unit: "kcal/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    waterLitersPerCrewDay: c({
      value: 0.75,
      unit: "L/CM-day",
      source: "OCHMO-TB047",
      confidence: "measured",
    }),
    habitatTempC: c({ value: 15, unit: "degC", source: "OCHMO-TB047", confidence: "measured" }),
    co2LimitMmHg: c({
      value: 12.5,
      unit: "mmHg",
      min: 10,
      max: 15,
      source: "OCHMO-TB047",
      confidence: "measured",
      note: "Brief states a 10-15 mmHg band for mode 2; midpoint stored.",
    }),
  },
} as const;

/** Closed-loop life support performance. */
export const lifeSupport = {
  waterRecoveryFractionBaseline: c({
    value: 0.935,
    unit: "fraction",
    source: "NASA-WATER-2023",
    confidence: "measured",
    note: "ISS without the Brine Processor Assembly.",
  }),
  waterRecoveryFractionWithBrineProcessor: c({
    value: 0.98,
    unit: "fraction",
    source: "NASA-WATER-2023",
    confidence: "measured",
    note: "ISS 2023 milestone, with the Brine Processor Assembly.",
  }),
  o2RecoveryFromCo2FractionCurrent: c({
    value: 0.51,
    unit: "fraction",
    source: "FRONTIERS-2024",
    confidence: "measured",
    note: "Current ISS Sabatier-based recovery.",
  }),
  o2RecoveryFromCo2FractionGoal: c({
    value: 0.75,
    unit: "fraction",
    source: "FRONTIERS-2024",
    confidence: "measured",
    note: "Stated research goal, not flown.",
  }),
  openLoopResupplyKgPerCrewDay: c({
    value: 10,
    unit: "kg/CM-day",
    source: "ICES-2017",
    confidence: "measured",
    note: "Includes tankage. The mass penalty the closed loop is measured against.",
  }),
  electrolysisWaterPerO2KgPerKg: c({
    value: 1.125,
    unit: "kg H2O per kg O2",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "2 H2O -> 2 H2 + O2; 36.03 g water per 32.00 g oxygen.",
  }),
  electrolysisEnergyKwhPerKgO2Theoretical: c({
    value: 4.9,
    unit: "kWh/kg O2",
    source: "STOICHIOMETRY",
    confidence: "derived",
    note: "Thermodynamic minimum; the sim uses the practical figure below.",
  }),
  electrolysisEnergyKwhPerKgO2Practical: c({
    value: 7.5,
    unit: "kWh/kg O2",
    source: "STOICHIOMETRY",
    confidence: "derived",
    note: "Practical cell efficiency. Tunable; drives the power cost of making oxygen.",
  }),
  moxieO2GramsPerHourPeak: c({
    value: 12,
    unit: "g O2/h",
    source: "MIT-MOXIE-2023",
    confidence: "measured",
  }),
  moxieO2GramsPerHourNominal: c({
    value: 6,
    unit: "g O2/h",
    source: "MIT-MOXIE-2023",
    confidence: "measured",
  }),
  moxieO2PurityFraction: c({
    value: 0.98,
    unit: "fraction",
    source: "MIT-MOXIE-2023",
    confidence: "measured",
    note: "At least 98% purity.",
  }),
  moxieTotalProducedGrams: c({
    value: 122,
    unit: "g",
    source: "MIT-MOXIE-2023",
    confidence: "measured",
    note: "Total produced across the whole Perseverance mission — a scale reference for players.",
  }),
} as const;

/** Crop production. */
export const food = {
  cropCycleDaysLettuce: c({
    value: 29,
    unit: "days",
    min: 28,
    max: 30,
    source: "BVAD-2022",
    confidence: "measured",
  }),
  cropCycleDaysWheat: c({
    value: 75,
    unit: "days",
    min: 64,
    max: 86,
    source: "BVAD-2022",
    confidence: "measured",
  }),
  cropCycleDaysSoybean: c({
    value: 93,
    unit: "days",
    min: 90,
    max: 97,
    source: "BVAD-2022",
    confidence: "measured",
  }),
  cropCycleDaysPotato: c({
    value: 97,
    unit: "days",
    min: 90,
    max: 105,
    source: "BVAD-2022",
    confidence: "measured",
  }),
  growLightElectricalWPerM2: c({
    value: 150,
    unit: "W/m^2",
    min: 100,
    max: 200,
    source: "BVAD-2022",
    confidence: "derived",
  }),
  cropAreaPerPersonFullDietM2: c({
    value: 45,
    unit: "m^2/CM",
    min: 40,
    max: 50,
    source: "BVAD-2022",
    confidence: "measured",
    note: "40-50 m^2 growing area per person for a full diet. Confirmed against BVAD in the 2026-09 verification pass; midpoint stored.",
  }),
  cropLightHoursPerDay: c({
    value: 16,
    unit: "h/day",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Photoperiod the grow lights run. Tuned; drives crop power draw.",
  }),
} as const;

/** Ionising radiation environment and exposure limits. */
export const radiation = {
  marsSurfaceMSvPerDay: c({
    value: 0.64,
    unit: "mSv/day",
    min: 0.52,
    max: 0.76,
    source: "MSL-RAD-SURFACE",
    confidence: "measured",
    note: "0.64 +/- 0.12 mSv/day, Curiosity RAD, unshielded surface.",
  }),
  deepSpaceCruiseMSvPerDay: c({
    value: 1.84,
    unit: "mSv/day",
    min: 1.54,
    max: 2.14,
    source: "MSL-RAD-CRUISE",
    confidence: "measured",
    note: "1.84 +/- 0.30 mSv/day during MSL cruise.",
  }),
  moonSurfaceMSvPerDay: c({
    value: 1.37,
    unit: "mSv/day",
    source: "CE4-LND-2020",
    confidence: "measured",
    note: "Chang'e-4 Lunar Lander Neutrons and Dosimetry, Zhang et al. 2020.",
  }),
  earthBackgroundMSvPerYear: c({
    value: 3.6,
    unit: "mSv/year",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "Reference figure shown to players for comparison.",
  }),
  careerLimitMSv: c({
    value: 600,
    unit: "mSv",
    source: "OCHMO-RAD",
    confidence: "measured",
  }),
  solarParticleEvent30DayLimitMGyEq: c({
    value: 250,
    unit: "mGy-Eq",
    source: "OCHMO-RAD",
    confidence: "measured",
    note: "NASA-STD-3001 states 250 mGy-Eq as a 30-day limit, not 250 mSv per event as the brief paraphrased it. Gray-equivalent weights by relative biological effectiveness where the sievert weights by radiation type, so the two are not interchangeable in general. The sim compares its accumulated mSv against this number directly, which is a disclosed simplification.",
  }),
  nuclearTechLimitMSvPerMissionYear: c({
    value: 20,
    unit: "mSv/mission-year",
    source: "OCHMO-RAD",
    confidence: "measured",
  }),
  surfaceDesignTargetMSvPerDay: c({
    value: 0.8,
    unit: "mSv/day",
    source: "OCHMO-RAD",
    confidence: "measured",
    note: "Galactic-cosmic-ray design target on planetary surfaces.",
  }),
  freeSpaceDesignTargetMSvPerDay: c({
    value: 1.3,
    unit: "mSv/day",
    source: "OCHMO-RAD",
    confidence: "measured",
    note: "Design target in free space behind roughly 10 g/cm^2 aluminium.",
  }),
  /**
   * Shielding attenuation. Two different physical regimes, both tuned curves:
   * solar-particle-event dose falls steeply with areal density, while galactic-cosmic-ray
   * dose falls weakly and saturates (secondary particle production sets a floor).
   */
  speAttenuationLengthGPerCm2: c({
    value: 8,
    unit: "g/cm^2",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "SPE dose modelled as exp(-x / L). TODO: fit against a published SPE depth-dose curve.",
  }),
  gcrAttenuationLengthGPerCm2: c({
    value: 60,
    unit: "g/cm^2",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "GCR dose modelled as floor + (1 - floor) * exp(-x / L).",
  }),
  gcrSaturationFloorFraction: c({
    value: 0.55,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Fraction of GCR dose that shielding cannot remove, from secondary production.",
  }),
} as const;

/** Power generation and storage. */
export const power = {
  solarConstant1AuWPerM2: c({
    value: 1361,
    unit: "W/m^2",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "S(r) = 1361 * (1 AU / r)^2.",
  }),
  marsMeanIrradianceWPerM2: c({
    value: 586.2,
    unit: "W/m^2",
    min: 586,
    max: 590,
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "About 43% of the value at 1 AU. Cross-check on the inverse-square calculation.",
  }),
  cellEfficiencyFraction: c({
    value: 0.3,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Array conversion efficiency. Tunable difficulty lever.",
  }),
  dustLossPerSolFraction: c({
    value: 0.003,
    unit: "fraction/sol",
    min: 0.0028,
    max: 0.0033,
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "0.28-0.33% array power lost per sol to dust accumulation, from MER and InSight observations. Resolved in the 2026-09 verification pass; was a 0.002 placeholder. Drives the dust-storm event.",
  }),
  fissionSurfacePowerKwe: c({
    value: 40,
    unit: "kWe",
    source: "NASA-FSP",
    confidence: "measured",
  }),
  fissionSurfacePowerLifetimeYears: c({
    value: 10,
    unit: "years",
    source: "NASA-FSP",
    confidence: "measured",
  }),
  fissionSurfacePowerMassKg: c({
    value: 6000,
    unit: "kg",
    source: "NASA-FSP",
    confidence: "measured",
    note: "Upper bound: 6000 kg or less.",
  }),
  batterySpecificEnergyWhPerKg: c({
    value: 200,
    unit: "Wh/kg",
    min: 150,
    max: 250,
    source: "GAME-DESIGN",
    confidence: "derived",
    note: "Validation: 3540 kWh of lunar-night storage = 17.7 t at this figure.",
  }),
  batteryDepthOfDischargeFraction: c({
    value: 0.8,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "derived",
  }),
  batteryRoundTripEfficiencyFraction: c({
    value: 0.9,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "derived",
  }),
  issEclssLoadKw: c({
    value: 5.31,
    unit: "kW",
    source: "BVAD-2022",
    confidence: "measured",
    note: "ISS reference load, for sanity-checking habitat sizing.",
  }),
  issThermalControlLoadKw: c({
    value: 8.72,
    unit: "kW",
    source: "BVAD-2022",
    confidence: "measured",
  }),
} as const;

/** Planetary environment. */
export const environment = {
  marsSolHours: c({
    value: 24.6597,
    unit: "h",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "One Mars solar day. Brief rule 3: always convert explicitly, never inline.",
  }),
  marsMeanDistanceAu: c({
    value: 1.5237,
    unit: "AU",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "Semi-major axis, 227.92e6 km / 149597870.7 km. Precision matters: rounding this to 1.524 puts the inverse-square irradiance at 585.99 W/m^2, just outside the published 586-590 W/m^2 band.",
  }),
  lunarNightHours: c({
    value: 354,
    unit: "h",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "About 14.8 Earth days of darkness at low lunar latitudes.",
  }),
  lunarDayHours: c({
    value: 708,
    unit: "h",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "Full synodic lunar day; half of it is night.",
  }),
  marsGravityMPerS2: c({
    value: 3.73,
    unit: "m/s^2",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "Mean surface gravity. Corrected from 3.71 during the 2026-09 verification pass; the NSSDC Mars fact sheet lists 3.73.",
  }),
  moonGravityMPerS2: c({
    value: 1.62,
    unit: "m/s^2",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsSurfacePressurePa: c({
    value: 636,
    unit: "Pa",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "6.36 mb mean surface pressure. Corrected from the commonly quoted ~610 Pa during the 2026-09 verification pass.",
  }),
  marsAtmosphereCo2Fraction: c({
    value: 0.9532,
    unit: "fraction",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsMeanSurfaceTempC: c({
    value: -59,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "214 K. Corrected from -63 during the 2026-09 verification pass.",
  }),
  moonEquatorMinTempC: c({
    value: -178,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "95 K. Corrected from -173 during the 2026-09 verification pass.",
  }),
  moonEquatorMaxTempC: c({
    value: 117,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "390 K. Corrected from +127 during the 2026-09 verification pass.",
  }),
  marsConjunctionPeriodDays: c({
    value: 779.94,
    unit: "days",
    source: "NSSDC-FACTS",
    confidence: "measured",
    note: "Earth-Mars synodic period; conjunction blackout recurs on this cycle.",
  }),
  marsConjunctionBlackoutDays: c({
    value: 14,
    unit: "days",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
} as const;

/** Physical chemistry used by the atmosphere and water models. */
export const physics = {
  universalGasConstantJPerMolK: c({
    value: 8.314462618,
    unit: "J/(mol K)",
    source: "STOICHIOMETRY",
    confidence: "measured",
  }),
  molarMassO2GPerMol: c({
    value: 31.998,
    unit: "g/mol",
    source: "STOICHIOMETRY",
    confidence: "measured",
  }),
  molarMassCo2GPerMol: c({
    value: 44.009,
    unit: "g/mol",
    source: "STOICHIOMETRY",
    confidence: "measured",
  }),
  pascalsPerMmHg: c({
    value: 133.322387415,
    unit: "Pa/mmHg",
    source: "STOICHIOMETRY",
    confidence: "measured",
  }),
  astronomicalUnitKm: c({
    value: 149597870.7,
    unit: "km",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "IAU definition, as echoed by the JPL Horizons response header.",
  }),
  lightSecondsPerAu: c({
    value: 499.004784,
    unit: "s/AU",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "One-way light time per AU; used by the comms model and /api/light-time.",
  }),
  daysPerJulianYear: c({
    value: 365.25,
    unit: "day/yr",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "Calendar constant, not a mission parameter — used only to convert the ESM crew-time terms below from CM-h/yr into a per-day rate.",
  }),
  kcalPerKgFoodDryMass: c({
    value: 5806.45,
    unit: "kcal/kg",
    source: "BVAD-2022",
    confidence: "derived",
    note: "3600 kcal/CM-day (OCHMO TB-047 nominal) divided by 0.62 kg/CM-day (BVAD dry food mass). Derived rather than assumed so that eating at the nominal rate consumes exactly the BVAD ration — a round 4000 kcal/kg would have the crew eating 0.9 kg/day, 45% more than the document says, and would have silently broken the 2.7 t food validation the moment rationing was wired up.",
  }),
} as const;

/** Systems-engineering parameters used by the ESM budget and risk model (P1/P2). */
export const management = {
  esmTransitVolumeKgPerM3: c({
    value: 80.8,
    unit: "kg/m^3",
    source: "BVAD-2022",
    confidence: "measured",
    note: "Shielded pressurised volume equivalency for transit.",
  }),
  esmTransitPowerKgPerKwe: c({
    value: 136,
    unit: "kg/kWe",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  esmSurfacePowerKgPerKwLow: c({
    value: 54,
    unit: "kg/kW",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  esmSurfacePowerKgPerKwMid: c({
    value: 87,
    unit: "kg/kW",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  esmSurfacePowerKgPerKwHigh: c({
    value: 338,
    unit: "kg/kW",
    source: "BVAD-2022",
    confidence: "measured",
  }),
  esmCrewTimeKgPerCrewHour: c({
    value: 1.25,
    unit: "kg/CM-h",
    source: "BVAD-2022",
    confidence: "measured",
    note: "Standard NASA ESM crew-time equivalency. Resolved in the 2026-09 verification pass; was a zero placeholder that disabled the crew-time term entirely.",
  }),
  esmCoolingKgPerW: c({
    value: 0.14,
    unit: "kg/W",
    source: "BVAD-2022",
    confidence: "measured",
    note: "Standard NASA ESM cooling equivalency, stated per watt rather than per kilowatt — kept in the source's own unit, so esm.ts converts at the point of use. Resolved in the 2026-09 verification pass; was a zero placeholder.",
  }),
  contingencyConceptFraction: c({
    value: 0.25,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  contingencyDesignFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  contingencyPriorBuildFraction: c({
    value: 0.075,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  contingencyFabricationFraction: c({
    value: 0.04,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  contingencyFlightFraction: c({
    value: 0.02,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  /**
   * Required mass margin at each review milestone. NASA Ames APR 8070.1 Table 3.1.1.1-1,
   * confirmed by the 2026-09 verification pass as 30/20/15/5 from concept through flight.
   *
   * The project brief listed a fifth point, "PER >10%", between CDR and ship. No source
   * carries it: the Ames table goes CDR straight to SIR at 5%. It has been dropped rather
   * than kept as an unsourced value, which is why ProjectPhase names review milestones now
   * instead of the brief's mixed phase/review labels.
   */
  marginSrrFraction: c({
    value: 0.3,
    unit: "fraction",
    source: "NASA-AMES-STD8070",
    confidence: "measured",
    note: "System Requirements Review. Required margin is greater than this.",
  }),
  marginPdrFraction: c({
    value: 0.2,
    unit: "fraction",
    source: "NASA-AMES-STD8070",
    confidence: "measured",
    note: "Preliminary Design Review. GSFC-STD-1000H corroborates the basic-mass-plus-growth-allowance rule.",
  }),
  marginCdrFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "NASA-AMES-STD8070",
    confidence: "measured",
    note: "Critical Design Review.",
  }),
  marginSirFraction: c({
    value: 0.05,
    unit: "fraction",
    source: "NASA-AMES-STD8070",
    confidence: "measured",
    note: "System Integration Review, the last milestone before flight. Replaces the brief's 2-5% pre-ship band with the single figure the Ames table states.",
  }),
  historicalGrowthMinFraction: c({
    value: 0.2,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
    note: "JPL: mass and power grow 20-48% from Phase B to launch.",
  }),
  historicalGrowthMaxFraction: c({
    value: 0.48,
    unit: "fraction",
    source: "THEMIS-MARGINS",
    confidence: "measured",
  }),
  /** Hourly failure rate multiplier by Technology Readiness Level (1 = least mature). */
  trlBaseFailureRatePerHour: c({
    value: 0.00002,
    unit: "1/h at TRL 9",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Failure rate is base * trlPenalty^(9 - trl). About one failure per 50000 system-hours at TRL 9.",
  }),
  trlFailureRatePenaltyPerLevel: c({
    value: 1.6,
    unit: "multiplier/level",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Lower TRL buys better performance at the cost of reliability (brief: TRL 1-9).",
  }),
} as const;

/**
 * Per-system ESM hardware terms: mass (M), cooling load (C), and crew-time to operate and
 * maintain (CT) — the three BVAD terms `engine/esm.ts` could not source for M4's ESM readout.
 * Supplied 2026-09 by the research team from ISS subsystem trade studies, not invented.
 *
 * `crewHoursPerYear` is stated per crew-member-hour per year, converted to a per-day rate
 * via `units.perYearToPerDay` at the point of use rather than here, matching how
 * `esmCoolingKgPerW` above is kept in its own source unit.
 *
 * Deliberately incomplete, matching exactly what the source material states — a missing
 * field here is not a zero, it is "not reported by this source," and `engine/esm.ts` must
 * never treat the two as the same thing:
 * - `lifeSupport` has no entry at all. The research team explicitly recommended against
 *   assigning "life support" its own hardware mass on top of the five subsystems below
 *   (CO2 scrubber, thermal control, oxygen generator, water recovery, greenhouse) that
 *   already model real life-support hardware — doing so would double-count the same
 *   equipment under two names. BVAD itself only baselines individual life-support
 *   functions, not one merged "life support system" figure.
 * - `waterRecovery` has mass and crew-time but no cooling figure in the source material.
 * - `moxie`, `powerDistribution`, and `comms` have mass only.
 */
export const hardwareEsm = {
  co2Scrubber: {
    massKg: c({
      value: 185.1,
      unit: "kg",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
      note: "ISS 4-Bed Molecular Sieve (4BMS) CO2 removal assembly.",
    }),
    coolingKw: c({
      value: 0.55621,
      unit: "kWth",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
    }),
    crewHoursPerYear: c({
      value: 2.76,
      unit: "CM-h/yr",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
    }),
  },
  thermalControl: {
    massKg: c({
      value: 149.28,
      unit: "kg",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
      note: "ISS-derived internal Thermal Control System (TCS).",
    }),
    coolingKw: c({
      value: 0.51771,
      unit: "kWth",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
    }),
    crewHoursPerYear: c({
      value: 0,
      unit: "CM-h/yr",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
      note: "The source states zero scheduled crew-time for this subsystem, not a missing figure.",
    }),
  },
  oxygenGenerator: {
    massKg: c({
      value: 388.97,
      unit: "kg",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
      note: "ISS Oxygen Generation Assembly (OGA / Sabatier-Process Equipment, SPE).",
    }),
    coolingKw: c({
      value: 1.86834,
      unit: "kWth",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
    }),
    crewHoursPerYear: c({
      value: 10.1,
      unit: "CM-h/yr",
      source: "MIYAJIMA-LSS",
      confidence: "measured",
    }),
  },
  waterRecovery: {
    massKg: c({
      value: 638,
      unit: "kg",
      source: "MIT-16851-WRS",
      confidence: "measured",
      note: "ISS Water Recovery System (WRS), corroborated against NASA NTRS documentation of the same hardware — exact NTRS accession still pending from the research team.",
    }),
    crewHoursPerYear: c({
      value: 8.0,
      unit: "CM-h/yr",
      source: "MIT-16851-WRS",
      confidence: "measured",
    }),
    // No coolingKw: the source material states no cooling figure for the WRS. Left out
    // rather than defaulted to zero — see the block comment above.
  },
  moxie: {
    massKg: c({
      value: 17.1,
      unit: "kg",
      source: "MOXIE-MASS-NASA",
      confidence: "measured",
      note: "Perseverance rover's MOXIE instrument hardware mass. Distinct from MIT-MOXIE-2023, which is cited for MOXIE's production-rate figures, not its mass.",
    }),
  },
  powerDistribution: {
    massKg: c({
      value: 800,
      unit: "kg",
      source: "MARS-POWER-ASTRA",
      confidence: "measured",
      note: "NASA ASTRA Mars surface power-architecture study.",
    }),
  },
  comms: {
    massKg: c({
      value: 61.0,
      unit: "kg",
      source: "SPACECRAFT-SUBSYS-NTRS",
      confidence: "measured",
      note: "NASA Technical Reports Server spacecraft-subsystem mass table.",
    }),
  },
  /** BVAD's plant-growth ESM factor, stated per square metre of crop-tray area. */
  greenhousePerM2: {
    massKgPerM2: c({
      value: 101.5,
      unit: "kg/m^2",
      source: "BVAD-2022",
      confidence: "measured",
    }),
    coolingKwPerM2: c({
      value: 2.6,
      unit: "kWth/m^2",
      source: "BVAD-2022",
      confidence: "measured",
    }),
    crewHoursPerYearPerM2: c({
      value: 13.1,
      unit: "CM-h/yr/m^2",
      source: "BVAD-2022",
      confidence: "measured",
    }),
  },
} as const;

/** Habitat engineering parameters. Tuned for gameplay; disclosed on the Data Sources screen. */
export const habitat = {
  thermalConductanceKwPerK: c({
    value: 0.035,
    unit: "kW/K",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Heat leak to the outside per kelvin of difference, for an insulated surface habitat.",
  }),
  thermalMassMjPerK: c({
    value: 8.0,
    unit: "MJ/K",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Sets how fast the cabin cools when heaters are shed. Tuned so a full heater loss is survivable for hours, not minutes.",
  }),
  freezeRiskTempC: c({
    value: 2,
    unit: "degC",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Below this the water loop is at risk of freezing and a fault is logged.",
  }),
  co2ScrubberKgPerHour: c({
    value: 0.35,
    unit: "kg CO2/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Sized to keep ahead of 4 crew producing 1.0 kg/CM-day.",
  }),
  co2ScrubberPowerKw: c({
    value: 1.2,
    unit: "kW",
    source: "GAME-DESIGN",
    confidence: "tuned",
  }),
  targetO2PartialPressureMmHg: c({
    value: 160,
    unit: "mmHg",
    min: 140,
    max: 180,
    source: "BVAD-2022",
    confidence: "placeholder",
    note: "TODO: source the habitat atmosphere set point from the BVAD atmosphere tables. 160 mmHg is the sea-level-equivalent oxygen partial pressure. Oxygen generation regulates against this, so an unsourced value here changes how much power and water making oxygen costs.",
  }),
  fireRiskO2PartialPressureMmHg: c({
    value: 200,
    unit: "mmHg",
    source: "BVAD-2022",
    confidence: "placeholder",
    note: "TODO: source the upper oxygen limit. Enriched atmospheres burn readily; above this the sim warns.",
  }),
  waterWallShieldingGPerCm2PerKg: c({
    value: 0.0025,
    unit: "g/cm^2 per kg stored",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Stored water doubles as shielding. Tuned so a full 2000 kg tank adds about 5 g/cm^2.",
  }),
} as const;

/** The whole tree, for the source-coverage and placeholder-reporting tests. */
export const CONSTANTS = {
  crew,
  survivalModes,
  lifeSupport,
  food,
  radiation,
  power,
  environment,
  physics,
  management,
  habitat,
} as const;
