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
    confidence: "placeholder",
    note: "TODO: confirm against BVAD crop area tables. Range taken from the project brief.",
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
    source: "MSL-RAD",
    confidence: "measured",
    note: "0.64 +/- 0.12 mSv/day, Curiosity RAD, unshielded surface.",
  }),
  deepSpaceCruiseMSvPerDay: c({
    value: 1.84,
    unit: "mSv/day",
    min: 1.54,
    max: 2.14,
    source: "MSL-RAD",
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
    source: "NASA-STD-3001",
    confidence: "measured",
  }),
  solarParticleEventLimitMSv: c({
    value: 250,
    unit: "mSv",
    source: "NASA-STD-3001",
    confidence: "measured",
    note: "Per solar particle event.",
  }),
  nuclearTechLimitMSvPerMissionYear: c({
    value: 20,
    unit: "mSv/mission-year",
    source: "NASA-STD-3001",
    confidence: "measured",
  }),
  surfaceDesignTargetMSvPerDay: c({
    value: 0.8,
    unit: "mSv/day",
    source: "NASA-STD-3001",
    confidence: "measured",
    note: "Galactic-cosmic-ray design target on planetary surfaces.",
  }),
  freeSpaceDesignTargetMSvPerDay: c({
    value: 1.3,
    unit: "mSv/day",
    source: "NASA-STD-3001",
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
    value: 588,
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
    value: 0.002,
    unit: "fraction/sol",
    source: "GAME-DESIGN",
    confidence: "placeholder",
    note: "TODO: source against MER/InSight dust obscuration rates. Drives the dust-storm event.",
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
    value: 3.71,
    unit: "m/s^2",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  moonGravityMPerS2: c({
    value: 1.62,
    unit: "m/s^2",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsSurfacePressurePa: c({
    value: 610,
    unit: "Pa",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsAtmosphereCo2Fraction: c({
    value: 0.95,
    unit: "fraction",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsMeanSurfaceTempC: c({
    value: -63,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  moonEquatorMinTempC: c({
    value: -173,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  moonEquatorMaxTempC: c({
    value: 127,
    unit: "degC",
    source: "NSSDC-FACTS",
    confidence: "measured",
  }),
  marsConjunctionPeriodDays: c({
    value: 780,
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
    value: 0,
    unit: "kg/CM-h",
    source: "BVAD-2022",
    confidence: "placeholder",
    note: "TODO: crew-time equivalency factor not yet verified against BVAD. Zero disables the crew-time term in ESM.",
  }),
  esmCoolingKgPerKw: c({
    value: 0,
    unit: "kg/kW",
    source: "BVAD-2022",
    confidence: "placeholder",
    note: "TODO: cooling equivalency factor not yet verified against BVAD. Zero disables the cooling term in ESM.",
  }),
  contingencyConceptFraction: c({
    value: 0.25,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  contingencyDesignFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  contingencyPriorBuildFraction: c({
    value: 0.075,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  contingencyFabricationFraction: c({
    value: 0.04,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  contingencyFlightFraction: c({
    value: 0.02,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  marginPhaseAFraction: c({
    value: 0.3,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
    note: "Required margin is greater than this.",
  }),
  marginPdrFraction: c({
    value: 0.2,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  marginCdrFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  marginPerFraction: c({
    value: 0.1,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  marginPreShipFraction: c({
    value: 0.035,
    unit: "fraction",
    min: 0.02,
    max: 0.05,
    source: "NTRS-MARGINS",
    confidence: "measured",
  }),
  historicalGrowthMinFraction: c({
    value: 0.2,
    unit: "fraction",
    source: "NTRS-MARGINS",
    confidence: "measured",
    note: "JPL: mass and power grow 20-48% from Phase B to launch.",
  }),
  historicalGrowthMaxFraction: c({
    value: 0.48,
    unit: "fraction",
    source: "NTRS-MARGINS",
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
