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
  // --- M7.7 §1: the real, pooled crew-hours budget (docs/DECISION_AUDIT.md found
  // crewHoursCost was declared everywhere and enforced nowhere). Read directly from the
  // BVAD-2022 PDF, section 3.3.4 "Crewtime Estimates", Table 3-28: "Assuming the exercise
  // time is 0.5 CM-h/d shorter due to working against gravity [than in orbit], a crewmember
  // will have 69.7 CM-h/wk of VST [Variably-Scheduled Time] ... on a planetary surface" —
  // the surface figure, not the orbital 67.2 CM-h/wk one, since every Sol Keeper scenario is
  // a surface habitat. VST is explicitly "available for either maintaining the life support
  // system or for other activities" — the assignable-work pool this budget models.
  dailyAssignableWorkHoursPerCrew: c({
    value: 69.7 / 7,
    unit: "CM-h/CM-d",
    source: "BVAD-2022",
    confidence: "derived",
    note: "69.7 CM-h/wk (planetary surface VST, BVAD-2022 section 3.3.4 Table 3-28) / 7 days = 9.957 CM-h/CM-d.",
  }),
  minSustainedAssignableWorkHoursPerCrew: c({
    value: 50 / 7,
    unit: "CM-h/CM-d",
    source: "BVAD-2022",
    confidence: "derived",
    note: "\"Minimally, a crewmember might be expected to work at least 50 CM-h/wk\" (BVAD-2022, same section) — the floor a badly degraded crew (low health/morale) can still be scaled down to, never below.",
  }),
  overtimeCeilingFractionOfAverage: c({
    value: 1.1,
    unit: "fraction",
    source: "BVAD-2022",
    confidence: "measured",
    note: "\"The maximum available VST might be 10% greater than the average values but, based on Skylab experience, this rate can only be maintained for periods of 28 days or less.\" Working above this fraction of the daily budget is what the overtime-fatigue mechanic actually penalises.",
  }),
  overtimeFatiguePerHourAboveCeiling: c({
    value: 0.03,
    unit: "fraction/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "fatigueFraction gained per crew-hour worked beyond overtimeCeilingFractionOfAverage's threshold. No NASA figure quantifies fatigue accrual this precisely; the 28-day sustainability window above is the real anchor for *when* overtime becomes a problem, this is how fast the game feels it.",
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
  // --- prudentBot rationing thresholds (Phase 2, engine/bots.ts) — gameplay tuning, not a
  // physiological figure: how many days of food-at-current-ration count as "thin margin"
  // before the bot proactively rations down, and how many count as "safe" before it eases
  // back off. Deliberately asymmetric (recover only once well clear of the down threshold)
  // so the bot does not oscillate mode every tick near a single boundary.
  rationDownAtDaysRemaining: c({ value: 10, unit: "days", source: "GAME-DESIGN", confidence: "tuned" }),
  rationRecoverAtDaysRemaining: c({ value: 25, unit: "days", source: "GAME-DESIGN", confidence: "tuned" }),
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

  // --- Acute Radiation Syndrome (docs/INCIDENTS_AND_THRESHOLDS.md S1.6). Named [HRP-ARS] by
  // that document; this project has not yet located and read the specific NASA Human
  // Research Program document behind it, unlike OCHMO-RAD above — placeholder, not measured,
  // until it is.
  arsOnsetMSv: c({
    value: 100,
    unit: "mSv",
    source: "HRP-ARS",
    confidence: "placeholder",
    note: "TODO: 0.1-0.2 Gy acute dose, ARS onset threshold (CDC: mild symptoms from 0.3 Gy). Compared directly against eventDoseMSv, the same disclosed mSv-vs-Gy simplification solarParticleEvent30DayLimitMGyEq already uses.",
  }),
  arsSevereMSv: c({
    value: 2000,
    unit: "mSv",
    source: "HRP-ARS",
    confidence: "placeholder",
    note: "TODO: ~2 Gy, ~5% lethality without care, minor blood-system damage begins 0.5-1 Gy.",
  }),
  arsLethalMSv: c({
    value: 3250,
    unit: "mSv",
    source: "HRP-ARS",
    confidence: "placeholder",
    note: "TODO: ~3.25 Gy, ~50% mortality within 60 days without care. Crossing this during a single event is treated as fatal at the moment it's crossed — real ARS mortality is probabilistic and plays out over days to weeks, not instantly, which is a disclosed simplification at the same level of abstraction healthFraction<=0 already uses elsewhere in this model.",
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
  marsDepartureWindowDays: c({
    value: 60,
    unit: "days",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Width of the low-delta-v departure window at the start of each marsConjunctionPeriodDays cycle (Phase 2 ABORT gating). No sourced figure gives an exact window width; 60 days is a placeholder-grade estimate disclosed as tuned, not a claimed trajectory-analysis result.",
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
  // --- M7.5: choked (sonic) orifice flow, for the depress-mir97 incident's leak-decay
  // physics (docs/INCIDENT_MAGNITUDES.md #1). Standard textbook values for dry air, not
  // specific to this incident.
  molarMassAirGPerMol: c({
    value: 28.97,
    unit: "g/mol",
    source: "STOICHIOMETRY",
    confidence: "measured",
  }),
  specificHeatRatioAir: c({
    value: 1.4,
    unit: "dimensionless",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "Cp/Cv for a diatomic gas (air is ~99% N2 + O2) at moderate temperature.",
  }),
  dischargeCoefficientSharpOrifice: c({
    value: 0.6,
    unit: "dimensionless",
    source: "STOICHIOMETRY",
    confidence: "measured",
    note: "Standard fluid-dynamics discharge coefficient (Cd) for flow through a sharp-edged circular orifice — the textbook value docs/INCIDENT_MAGNITUDES.md's own choked-flow derivation uses, not fitted to this specific incident.",
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
  // --- M7.7 §5: replaces the old flat, unconditional 15%/hour auto-repair
  // (docs/DECISION_AUDIT.md flagged it as decision-independent and able to silently undo an
  // incident's consequence). Same TRL-scaled shape as the failure-rate curve above, mirrored
  // rather than opposed: a lower-TRL system is both more likely to break and harder to fix
  // well, same as it is more fragile above.
  repairAttemptCrewHours: c({
    value: 2,
    unit: "CM-h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Crew-hours a single repair attempt costs, spent whether or not it succeeds — same hour, not queued (an ordinary repair is one action, not a multi-day project, unlike an incident response).",
  }),
  repairSuccessBaseFraction: c({
    value: 0.35,
    unit: "fraction at TRL 1",
    source: "GAME-DESIGN",
    confidence: "tuned",
  }),
  repairSuccessPerTrlLevel: c({
    value: 0.075,
    unit: "fraction/level",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "successFraction = repairSuccessBaseFraction + (trl-1) x this, clamped to 0.95 — a TRL-9 system's repair succeeds ~95% of an attempt, a TRL-1 one ~35%, both further scaled by stationPerformance.",
  }),
  improvisedRepairPenaltyFraction: c({
    value: 0.5,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Success-probability multiplier when spares are insufficient and the crew improvises instead (docs/INCIDENT_MAGNITUDES.md's own pattern for a degraded, not-as-good-as-original fix).",
  }),
  improvisedRepairEfficiencyPenaltyFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Permanent SystemState.efficiencyPenaltyFraction applied when an improvised (spares-short) repair still succeeds — the system works again, just not at full rated capacity, ever again this run.",
  }),
  incidentDetectionBaseDelayHours: c({
    value: 1,
    unit: "h at stationPerformance=1",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "M7.7 §2: an incident's owning station rolls chance(1 / max(1, this / stationPerformance)) each hour post-trigger until detected, on top of automaticDetectionFloorChancePerHour below. A fully-staffed, nominal station detects almost immediately.",
  }),
  automaticDetectionFloorChancePerHour: c({
    value: 0.35,
    unit: "1/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "A real spacecraft's caution-and-warning system (smoke/fire alarms, pressure-loss alarms) notices a fire or a hull leak whether or not a specific crew member is dedicated to watching for it — station staffing should make detection *faster*, not the only way it can happen at all. Without this floor, a scenario whose crew is too small to staff an incident's owning station (Incident Command and Mission Command own no hardware and can go unstaffed by design on a 2-person crew, engine/stations.ts) made that incident permanently undetectable — found empirically: First Light's depress-mir97 killed crew in every affected seed with zero chance to ever respond.",
  }),
  // --- M7.7 §5: the other two events.ts literals docs/DECISION_AUDIT.md found unsourced,
  // relocated with their existing values unchanged (not retuned).
  pumpFailureTargetCoinFlip: c({
    value: 0.5,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Which of waterRecovery/thermalControl a scripted pumpFailure hits — an arbitrary 50/50, no decision can influence it.",
  }),
  cropBlightDamageMinFraction: c({
    value: 0.5,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
  }),
  cropBlightDamageMaxFraction: c({
    value: 1,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "cropBlight damage = magnitude x range(cropBlightDamageMinFraction, cropBlightDamageMaxFraction).",
  }),
  unassignedStationEmergencyPerformanceFraction: c({
    value: 0.5,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "engine/stations.ts's stationPerformance: when a station has nobody at all assigned as primary or backup (First Light's 2-person roster structurally cannot cover Incident Command or Mission Command, engine/stations.ts) or its assigned coverers have all died, the best-conditioned surviving crew member still responds as an ad hoc stand-in, at this further penalty on top of their own condition — a real crew of any size keeps fighting a fire or patching a leak, nobody needs a station badge to try to save their own life. Found necessary empirically: without any fallback, a hard-0 performance made every Incident-Command-owned incident (depress-mir97 chief among them) mathematically unwinnable on First Light regardless of bot skill, since no response through that station could ever succeed or even be attempted.",
  }),
  longMissionRemainingHours: c({
    value: 1000,
    unit: "h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "engine/bots.ts's prudentBot: above this much mission time still remaining, a response flagged permanentPenalty (a never-recovers degradation, not a probabilistic improvised-repair one) is avoided in favor of a real non-permanent alternative when one exists. Found necessary empirically (docs/M7.8_DIAGNOSIS.md): on The Long Night (2124h, roughly 3x First Light/Jezero's own ~720-750h), o2tank-apollo13's improviseAdapter permanently degrades co2Scrubber efficiency — a cost that compounds for however much mission remains, and on this scenario specifically that's most of it, unlike the shorter missions it was tuned against. 1000h sits below Long Night's own duration and above the two short scenarios', so it targets the one case the cost actually behaves differently on.",
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
      note: "ISS Water Recovery System (WRS), from the \"ESM for ISS Water Recovery System\" table (Mass 638 kg, Volume 0.5 m^3, Power 0.99 kW, Crew Time 8.0 ch/y) — the same table's 0.99 kW figure lines up with this system's own nominalPowerKw in the Jezero scenario (0.9 kW), an independent cross-check.",
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
      value: 1250,
      unit: "kg",
      source: "RUCKER-2015-SURFACE-POWER",
      confidence: "derived",
      note: "1 km of low-voltage DC cable (1,100 kg/km) plus one inverter/junction box (150 kg). Every term is quoted from Rucker's study: it assumes 1,100 kg/km for low-voltage cable (a 1,028-1,349 kg/km range), about 150 kg for the inverter/junction box, and states the power unit sits 'at least one kilometer from the crew habitat' for crew radiation separation — so the cable run length is the study's own figure, not a chosen one. Replaces an earlier 800 kg that the research team supplied without a citation and that no located NASA document states at any cable length; the high-voltage option in the same study would instead be 60 kg/km + 150 kg = 210 kg, which is the trade the paper exists to make.",
    }),
  },
  comms: {
    massKg: c({
      value: 18,
      unit: "kg",
      source: "SPACECRAFT-SUBSYS-NTRS",
      confidence: "measured",
      note: "NASA CR-189186, Table 6-1 (TT&C RF Communications Mass and Power) gives S-Band/SGLS TT&C hardware — 2 omni antennas, 2 telemetry transmitters, 2 command receivers, waveguide/coax and misc — as 18 kg total, 28 W. C-Band (17 kg) and Ku-Band (16 kg) options in the same table were not used; S-Band/SGLS is the more conventional TT&C baseline. This replaces an earlier 61.0 kg figure the research team supplied without a confirmed citation — once the actual table was located and read (not just cited by title), it did not contain that number at any frequency band, and 18 kg is what the real source states.",
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
    source: "OCHMO-TB003",
    confidence: "derived",
    note: "Sea-level-equivalent oxygen partial pressure, the normoxic reference point oxygen generation regulates against. OCHMO-TB-003 Rev A states sea-level total pressure as 1 ATM = 760 mmHg = 14.7 psia and sea-level composition as 20.95% oxygen (760 x 0.2095 = 159.2 mmHg), and separately that ISS cabin pressure 'is typically maintained at 14.7 psia with 21% O2, which is equivalent to sea level' (760 x 0.21 = 159.6). 160 is that figure rounded. Resolved 2026-09; was a placeholder.",
  }),
  waterWallShieldingGPerCm2PerKg: c({
    value: 0.0025,
    unit: "g/cm^2 per kg stored",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Stored water doubles as shielding. Tuned so a full 2000 kg tank adds about 5 g/cm^2.",
  }),
} as const;

/**
 * Phase 2 (M7) lethality thresholds. `docs/INCIDENTS_AND_THRESHOLDS.md` is the primary
 * research artifact behind this whole group — every note below names the section it
 * implements, so a value can be checked against that document's own math, not just this
 * file's paraphrase of it.
 */
export const physiology = {
  // --- Oxygen: PIO2 (S1.1, OCHMO-TB-003) ---
  pio2NormoxiaLowMmHg: c({
    value: 145,
    unit: "mmHg",
    source: "OCHMO-TB003",
    confidence: "measured",
    note: "PIO2 (inspired O2 partial pressure, not cabin ppO2) normoxia band lower bound.",
  }),
  pio2NormoxiaHighMmHg: c({ value: 155, unit: "mmHg", source: "OCHMO-TB003", confidence: "measured" }),
  pio2HypoxiaLowerLimitMmHg: c({
    value: 127,
    unit: "mmHg",
    source: "OCHMO-TB003",
    confidence: "measured",
    note: "Below this: mild hypoxia (impaired). Performance penalty grows as PIO2 falls further.",
  }),
  pio2CriticalMmHg: c({
    value: 100,
    unit: "mmHg",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Below this: critical. S1.1 states the impaired-to-unconscious boundary has no single NASA number; 100 mmHg PIO2 gives the critical band real width above the also-tuned hypoxiaCriticalToLostHours clock.",
  }),
  pio2HyperoxiaIndefiniteMmHg: c({ value: 356, unit: "mmHg", source: "OCHMO-TB003", confidence: "measured" }),
  pio2HyperoxiaShortTermMmHg: c({ value: 791, unit: "mmHg", source: "OCHMO-TB003", confidence: "measured" }),
  cabinPressureLowPsia: c({ value: 5.0, unit: "psia", source: "OCHMO-TB003", confidence: "measured" }),
  cabinPressureHighPsia: c({ value: 15.0, unit: "psia", source: "OCHMO-TB003", confidence: "measured" }),
  minDiluentFraction: c({ value: 0.3, unit: "fraction", source: "OCHMO-TB003", confidence: "measured" }),
  waterVapourPressureBodyMmHg: c({
    value: 47,
    unit: "mmHg",
    source: "OCHMO-TB003",
    confidence: "derived",
    note: "Standard respiratory physiology (water-vapour partial pressure at core body temperature). Used by the same document's own conversion: PIO2 = (P_total - 47) x FO2.",
  }),
  diluentGasPressureMmHg: c({
    value: 599,
    unit: "mmHg",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "The sim tracks only O2 and CO2 partial pressure, not a full nitrogen mass balance (the same gap the M6 fire-risk disclosure names). This holds diluent gas at a fixed partial pressure — real ECLSS systems regulate it to a roughly fixed set point rather than letting it drift — so totalPressureMmHg = o2 + co2 + this, and FO2 = o2/total. Chosen so nominal cabin conditions (160 mmHg O2, ~1 mmHg CO2) land near the 760 mmHg sea-level total pressure already used for the O2 set point. Disclosed on Data Sources as a simplification.",
  }),
  hypoxiaCriticalToLostHours: c({
    value: 2,
    unit: "h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Time sustained below pio2CriticalMmHg before unconsciousness/death. S1.1 states this step explicitly has no NASA number.",
  }),

  // --- Carbon dioxide (S1.2) ---
  co2ImmediatelyDangerousMmHg: c({
    value: 30.4,
    unit: "mmHg",
    source: "OCHMO-TB004",
    confidence: "placeholder",
    note: "TODO: OCHMO-TB-004 is named by docs/INCIDENTS_AND_THRESHOLDS.md S1.2 but this project has not independently located and read it yet (unlike TB-003/TB-047, which were). 30.4 mmHg (~4%, IDLH) is the stated figure; treat as unverified until the document itself is opened.",
  }),

  // --- Thirst (S1.3, NASA-SPACEBIO-1975 / NTRS 19760019741) ---
  thirstSurvivalIdealHours: c({
    value: 336,
    unit: "h",
    source: "NASA-SPACEBIO-1975",
    confidence: "measured",
    note: "~14 days survival without water under ideal (18-22 degC cabin, rest) conditions.",
  }),
  thirstSurvivalFloorHours: c({
    value: 6,
    unit: "h",
    source: "NASA-SPACEBIO-1975",
    confidence: "measured",
    note: "Source states death 'within hours' under highly unfavourable conditions; 6 h is the clock's clamp floor.",
  }),
  thirstFEnvHeatFactor: c({
    value: 0.5,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "fEnv multiplier for a hot/low-humidity cabin, in survivalHours = 336 x fEnv x fWork (S1.3). The source gives the 336h/6h anchors, not this curve's intermediate shape; calibrated with thirstFWorkEvaFactor so EVA-in-heat approaches the 6h floor — see docs/BALANCE.md.",
  }),
  thirstFWorkEvaFactor: c({
    value: 0.35,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "fWork multiplier during EVA/heavy work. See thirstFEnvHeatFactor.",
  }),

  // --- Hunger (S1.4, NASA-NUTRITION-2015 / NTRS 20150000512) ---
  starvationLethalDeficitKcal: c({
    value: 216_000,
    unit: "kcal",
    source: "NASA-NUTRITION-2015",
    confidence: "derived",
    note: "60 days x 3600 kcal/day nominal requirement — the source's total-starvation upper survival bound, expressed as an accumulated deficit. Labeled 'measured-projection' by the source itself, not a physiological constant.",
  }),
  starvationAdaptationMaxFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Metabolic adaptation reduces required intake by up to this much after two weeks of restriction, reconciling the source's two anchors (60-day total starvation; 1000 kcal/day survivable 'potentially beyond 4-6 months'). See docs/BALANCE.md.",
  }),

  // --- Cold (S1.5, NASA-HYPOTHERMIA-2008 / NTRS 20080014194) ---
  hypothermiaImmersion4CHours: c({
    value: 12,
    unit: "h",
    source: "NASA-HYPOTHERMIA-2008",
    confidence: "measured",
    note: "Water immersion at 4.4 degC (40 degF) in a suit alone. Used directly for the suit/EVA thermal-failure path — never scaled by kAir — since that is where the source's own conditions actually apply.",
  }),
  hypothermiaRaft4CHours: c({
    value: 22,
    unit: "h",
    source: "NASA-HYPOTHERMIA-2008",
    confidence: "measured",
    note: "Life raft at 4.4 degC water and rain, in the suit.",
  }),
  hypothermiaAirFactorKAir: c({
    value: 10,
    unit: "multiplier",
    source: "NASA-HYPOTHERMIA-2008",
    confidence: "derived",
    note: "Converts the water-immersion anchor to a cabin-air cold path: survivalHoursAir(T) = 12h x kAir x g(T), g(4.4 degC)=1. Air removes body heat roughly an order of magnitude slower than water at the same temperature (conduction/convection); the source itself states this order-of-magnitude factor, so it is attributed to the document rather than to GAME-DESIGN even though it is not a simple arithmetic derivation. The single most important derived number in the cold model — see docs/BALANCE.md.",
  }),
  hypothermiaImmersionRefTempC: c({
    value: 4.4,
    unit: "degC",
    source: "NASA-HYPOTHERMIA-2008",
    confidence: "measured",
    note: "The water temperature the 12h/22h immersion anchors were measured at (40 degF). g(T) in survivalHoursAir(T) is anchored to 1.0 here.",
  }),
  hypothermiaAirGFloorFraction: c({
    value: 0.1,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "g(T) at or below freezing, so survivalHoursAir converges toward the 12h immersion figure itself as the doc requires ('a cabin at or below freezing converges toward the immersion figure'), rather than a fresh, unrelated number.",
  }),

  // --- Condition-ladder stage boundaries, as fractions of each clock (0=fine, 1=lost).
  // The doc states these numbers itself, per clock, explicitly labelled tuned (S1.3/1.4/1.5).
  hydrationImpairedFraction: c({ value: 0.2, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),
  hydrationCriticalFraction: c({ value: 0.55, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),
  starvationImpairedFraction: c({ value: 0.25, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),
  starvationCriticalFraction: c({ value: 0.6, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),
  hypothermiaImpairedFraction: c({ value: 0.2, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),
  hypothermiaCriticalFraction: c({ value: 0.55, unit: "fraction", source: "GAME-DESIGN", confidence: "tuned" }),

  // --- Heat stress / wet-bulb (M7.5, docs/INCIDENT_MAGNITUDES.md #3): "ADD A WET-BULB CHECK
  // to the thermal model... this gives heat a failure path of its own, mirroring the cold
  // path." A standing model addition, not exclusive to the coolant-ms22 incident that
  // surfaced the sourced threshold — any sustained cabin overheat (a jammed heater, a bad
  // thermal-control repair) now degrades crew the same way. Capped at "critical", never
  // "lost": no sourced heat-death timeline exists the way NASA-HYPOTHERMIA-2008 gives cold
  // (12h/22h immersion anchors) — inventing one would violate brief rule 1, so heat stress is
  // scoped honestly to "makes stations perform worse", same treatment as fatigue and injury.
  heatStressWetBulbTempC: c({
    value: 31,
    unit: "degC",
    source: "NSF-MS22",
    confidence: "measured",
    note: "measured-reported: the crewed MS-22 thermal-abort criteria's descent-module limit at ~95% relative humidity (the wet-bulb limit, where sweating stops shedding heat), per NASASpaceflight's reporting. The sim assumes near-95% RH in a sealed, crewed habitat rather than tracking humidity as its own state — a disclosed simplification.",
  }),
  heatStressCriticalToImpairedHours: c({
    value: 4,
    unit: "h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Time sustained above heatStressWetBulbTempC before heat stress reaches its capped 'critical' ceiling — no sourced timeline exists (see the group comment above), so this mirrors hypoxiaCriticalToLostHours's own treatment of an unsourced time-at-threshold step.",
  }),

  // --- Abort timing (S1.9, NASA-ORION-FS) ---
  lunarReturnTransitNominalDays: c({
    value: 6,
    unit: "d",
    source: "NASA-ORION-FS",
    confidence: "measured",
    note: "Artemis I actual return-transit phase (flight days 20-26).",
  }),
  lunarReturnTransitRangeLowDays: c({
    value: 9,
    unit: "d",
    source: "NASA-ORION-FS",
    confidence: "measured",
    note: "Planned lunar return transit range, per the Orion overview fact sheet; the game uses the 6-day Artemis-I figure and keeps this range available for harder difficulty presets.",
  }),
  lunarReturnTransitRangeHighDays: c({ value: 19, unit: "d", source: "NASA-ORION-FS", confidence: "measured" }),
} as const;

/**
 * Historical incident analogues (Phase 2 brief, engine/incidents.ts). One sourced incident
 * so far; the other six are the brief's own explicit instruction — "add to DATA_SOURCES.md
 * as unverified... use placeholders for numbers, never invent them" — until the team
 * supplies documents for each.
 */
export const incidents = {
  // Shared base per-hour trigger chance for every "componentRisk" incident (fire-mir97,
  // depress-mir97, o2tank-apollo13, coolant-ms22, scrubber-iss) before Mission Difficulty's
  // own incidentRateMultiplier is applied. Tuned during M7 balance passes, not measured:
  // deliberately independent of engine/risk.ts's TRL-based system-reliability rate (Phase 1
  // tuned that one for a game where nothing was meant to be lethal — reusing it here made
  // every one of these five incidents fire only about once every 20+ missions). See
  // docs/BALANCE.md for the resulting pass-rate distribution this value produces.
  componentRiskBaseChancePerHour: c({
    value: 0.0045,
    unit: "1/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
  }),
  mirFireDurationMinutes: c({
    value: 14,
    unit: "min",
    source: "NASA-SP-4030",
    confidence: "measured",
    note: "Mir fire, February 1997. A documented alternative figure of 90 seconds exists and is historically disputed; shown in the in-game fact card as a real example of uncertainty even in flown history.",
  }),
  // --- M7.5: depress-mir97 (docs/INCIDENT_MAGNITUDES.md #1). No leak rate or pressure curve
  // was ever published for the real Progress-Mir/Spektr collision, so the rate is DERIVED
  // from choked (sonic) orifice flow physics — physics.molarMassAirGPerMol,
  // physics.specificHeatRatioAir, physics.dischargeCoefficientSharpOrifice — plus the one
  // measured quantity that was published (Spektr's volume), not invented.
  depressMir97SpektrVolumeM3: c({
    value: 62,
    unit: "m^3",
    source: "NASA-SHUTTLE-MIR",
    confidence: "measured",
    url: "https://spaceflight.nasa.gov/history/shuttle-mir/spacecraft/s-mir-spektr-main.htm",
    note: "Spektr's pressurised volume. Used as the leak-physics worked example's V; the sim itself scales the leak by the current scenario's whole habitatVolumeM3 (no sub-module architecture exists), a disclosed simplification.",
  }),
  depressMir97HoleDiameterMm: c({
    value: 8,
    unit: "mm",
    min: 8,
    max: 12,
    source: "NASA-SMA-MIR-COLLISION",
    confidence: "derived",
    note: "No hole size was published for the real event; docs/INCIDENT_MAGNITUDES.md's own derived range is 8-12 mm (its own worked example used 10 mm). This sim uses the small end: at the 1-hour tick resolution, one full hour of undiminished exposure always elapses before any response can apply (the smallest non-zero warning window this engine can represent), which is already a coarser approximation of the addendum's own \"20-40 minutes of game time\" decision window than a sub-hour tick would give. Choosing 10 mm on top of that coarseness made the smallest scenario (First Light, 120 m^3) lose ~25% of cabin O2 in that one unavoidable hour — a single incident regularly deciding the mission on its own rather than compounding with the others the way M7.5 intends. 8 mm keeps the leak genuinely severe (~15-20% in that hour, scenario-dependent) without letting the tick-resolution coarseness alone determine the outcome.",
  }),
  depressMir97SealedModulePowerLossFraction: c({
    value: 0.5,
    unit: "fraction",
    source: "NASA-SMA-MIR-COLLISION",
    confidence: "measured",
    note: "\"Sealing Spektr cost about half of Mir's power, because Spektr's arrays were isolated with it.\" The model for M7.5's residual-cost principle: the good response (seal the module) permanently loses this fraction of generation capacity, not a free fix.",
  }),
  // --- M7.5: o2tank-apollo13, reframed as a CO2-rise incident (docs/INCIDENT_MAGNITUDES.md
  // #2) — the real crew-threatening consequence of the LM lifeboat scenario was CO2 buildup
  // from running 3 crew on a 2-crew scrubber, not oxygen loss. Figures come from crew
  // debrief and accident-review-board material reported secondhand (labelled
  // "measured-reported" in each note rather than a separate confidence tier), not a primary
  // NASA document — upgrade if the Apollo 13 Mission Report ECS section turns up the same
  // numbers directly.
  apollo13ScrubberCapacityFractionDuringIncident: c({
    value: 1 / 3,
    unit: "fraction",
    source: "A13-CO2",
    confidence: "derived",
    note: "The LM's LiOH canisters were sized for 2 crew for 2 days but carried 3 crew for ~4 days — roughly 3x the design demand, i.e. ~1/3 of needed capacity available.",
  }),
  apollo13PeakCo2MmHg: c({
    value: 15,
    unit: "mmHg",
    source: "A13-CO2",
    confidence: "measured",
    note: "measured-reported: Jack Swigert's crew-debrief recollection of the ppCO2 reading at the worst point, not a primary instrument record.",
  }),
  apollo13HoursToPeakCo2: c({
    value: 36,
    unit: "h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "docs/INCIDENT_MAGNITUDES.md's own calibration target (\"tune ONLY the cabin volume and mixing efficiency so the curve reaches 15 mmHg at about 36 h\"), reconciling A13-CO2's qualitative timeline (\"began to threaten the crew after about a day and a half\") with the specific peak reading above — a tuning choice traceable to that source, not GAME-DESIGN's own invention, but attributed here per the brief's rule that every 'tuned' confidence value cites GAME-DESIGN.",
  }),
  apollo13PostFixCo2MmHg: c({
    value: 2,
    unit: "mmHg",
    source: "A13-CO2",
    confidence: "measured",
    note: "measured-reported: the accident review board's reported ppCO2 after the improvised adapter, stayed below this for the rest of the return.",
  }),
  apollo13ScrubberDegradationAfterFixFraction: c({
    value: 0.1,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "The improvised adapter isn't as good as the original hardware — docs/INCIDENT_MAGNITUDES.md: \"the adapter degrades scrubber efficiency slightly for the rest of the mission.\" No figure was published for how much; this is the residual cost of choosing the good response, not a free fix.",
  }),
  // --- M7.7 §7: o2tank-apollo13's rationActivity, fixing docs/DECISION_AUDIT.md's one
  // confirmed cosmetic decision (it wrote the same nothing as the incident's own default).
  rationActivityMetabolicReductionFraction: c({
    value: 0.3,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Real, lasting reduction to crewActivityFraction (models/atmosphere.ts's CO2 production term, models/thermal.ts's crewHeatKw) once chosen — \"reduced crew metabolic rate and CO2 production\", the brief's own words.",
  }),
  rationActivityCrewHoursPenaltyHours: c({
    value: 4,
    unit: "CM-h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "One-time cost to the day's remaining crew-hours budget — \"at the cost of crew-hours available for work.\"",
  }),
  // --- M7.5: coolant-ms22 (docs/INCIDENT_MAGNITUDES.md #3). Roscosmos/NASA statements via
  // news agencies, not a primary NASA document — labelled measured-reported.
  ms22CabinPeakTempC: c({
    value: 30,
    unit: "degC",
    source: "MS22-THERMAL",
    confidence: "measured",
    note: "measured-reported: crew habitation module temperature after the leak, per Roscosmos statements reported by TASS. Roscosmos explicitly denied reports of 50 degC — a useful negative bound.",
  }),
  ms22EquipmentBayPeakTempC: c({
    value: 40,
    unit: "degC",
    source: "MS22-THERMAL",
    confidence: "measured",
    note: "measured-reported: instrumentation/equipment compartment peak, same source. The sim has no separate equipment-bay temperature state; this is used as a fixed +10 degC offset over cabin temperature, a disclosed simplification.",
  }),
  ms22HoursToStabilize: c({
    value: 24,
    unit: "h",
    source: "MS22-THERMAL",
    confidence: "measured",
    note: "measured-reported: \"most of the coolant had leaked out within a day\"; temperatures stabilised at ~30 degC after ground teams powered down spacecraft systems.",
  }),
  ms22EquipmentBayFailureTempC: c({
    value: 40,
    unit: "degC",
    source: "NSF-MS22",
    confidence: "measured",
    note: "measured-reported: service-module abort criterion.",
  }),
  ms22ComputerFailureTempC: c({
    value: 45,
    unit: "degC",
    source: "NSF-MS22",
    confidence: "measured",
    note: "measured-reported: main-computer abort criterion.",
  }),
  ms22CropHealthLossFromShedLoad: c({
    value: 0.15,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "docs/INCIDENT_MAGNITUDES.md's residual cost for the only real MS-22 mitigation (shedding load): \"crops lose light\" while non-essential systems are off. No figure was published; this is the game's stand-in cost, not a free fix.",
  }),
  spe1972DoseMultiplier: c({
    value: 1500,
    unit: "multiplier",
    source: "HRP-ARS",
    confidence: "derived",
    note: "M7.6 Part D.10: reclassified from a placeholder. Moon baseline 1.37 mSv/day x 1500 ~= 86 mSv/h ~= 0.5 Gy over 6 h, matching HRP-ARS's own measured statement that a large unshielded SPE delivers >0.5 Gy over several hours. August 1972, one of the largest SPEs on record and considered potentially lethal to an unshielded crew in some historical estimates (AGU-KNIPP-2018) — this multiplier is what makes the modelled incident's dose spike land in that real, dangerous band rather than being swamped by Mars's tiny ambient rate.",
  }),
  scrubberIssFailureRateMultiplier: c({
    value: 3,
    unit: "multiplier",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "M7.6 Part D.12: reclassified from a placeholder. ICES-2019-CDRA documents CDRA sorbent-bed degradation \"after many operating cycles\" as a real, recurring ISS maintenance problem, but states no specific post-failure failure-rate multiplier — this figure (how much more failure-prone the scrubber is right after this incident, versus its base TRL-scaled rate) is a tuned game-design choice consistent with that documented pattern, not a cited number (brief rule 1: every 'tuned' confidence value cites GAME-DESIGN as its source, its real-world anchor disclosed here in the note instead).",
  }),
  duststorm2018ObscurationSpikeFraction: c({
    value: 0.15,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "M7.6 Part D.11: reclassified from a placeholder. The 2018 storm's own dust optical depth (tau) reached 10.8 versus a pre-storm background of about 1.2 (JPL-DUSTSTORM2018-TAU) — \"the highest ever recorded on Mars\" — but this sim tracks obscuration as a 0-1 fraction, not optical depth, so no invented tau-to-fraction conversion is applied; the real severity comparison instead justifies treating this as a large, near-maximal one-time spike on top of power.dustLossPerSolFraction's (NSSDC-FACTS) own ordinary per-hour buildup, magnitude itself tuned (brief rule 1: every 'tuned' confidence value cites GAME-DESIGN as its source, its real-world anchor disclosed here in the note instead).",
  }),
  // --- M7.6 Part D.9: fire-mir97 residual cost. NASA-MIR-FIRE-25YR (primary) and
  // MIR-FIRE-LINENGER (firsthand crew account, secondhand relative to a primary NASA
  // document, same "measured-reported" tier as A13-CO2/MS22-THERMAL) supply the real facts;
  // magnitudes not directly stated by either are tuned and disclosed as such.
  mirFireSmokeRecoveryHours: c({
    value: 24,
    unit: "h",
    source: "MIR-FIRE-LINENGER",
    confidence: "measured",
    note: "measured-reported: Linenger's own account puts full respirator use at 45 min-1 h before switching to filter masks, then \"probably a day or so\" before things were properly cleaned out, plus a specific ~24 h spent mopping condensation. This sim models one recovery window covering that whole tail, using the more precisely stated 24 h cleanup figure rather than the brief's own less-precisely-sourced \"36 hours\" — the discrepancy is disclosed here for the lead developer to reconcile if a firmer primary source turns up.",
  }),
  mirFireSmokeFatiguePerHour: c({
    value: 0.01,
    unit: "fraction/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Crew fatigueFraction added each hour of mirFireSmokeRecoveryHours, representing smoke-inhalation and reduced-air-quality impairment — \"smoke degrades air quality and crew performance for a recovery period.\" No figure was published for the magnitude; this reaches a moderate ~0.24 total fatigue contribution over the full window, tuned to be felt without being decisive on its own.",
  }),
  mirFireCleanupCrewHours: c({
    value: 4,
    unit: "CM-h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"Cleanup costs crew-hours.\" MIR-FIRE-LINENGER's own account describes roughly 24 elapsed hours of one crew member mopping up water — a real-time duration, not directly a crew-hours budget debit (this sim's crew-hours model bills effort, not wall-clock elapsed time an already-busy crew works through regardless) — so this is a tuned stand-in of comparable weight to the incident's own other crew-hours costs, not a literal conversion of that figure.",
  }),
  mirFirePanelDamageEfficiencyPenaltyFraction: c({
    value: 0.05,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"Damaged equipment stays damaged.\" NASA-MIR-FIRE-25YR: \"some of Kvant-1's solar panels were charred\" — real, permanent equipment damage from the fire itself, applied regardless of which response is chosen (unlike the existing response-dependent consequences). No magnitude was published for how much capability was lost; this is a modest, tuned permanent efficiencyPenaltyFraction on powerDistribution standing in for it (brief rule 1: every 'tuned' confidence value cites GAME-DESIGN as its source, its real-world anchor disclosed here in the note instead).",
  }),
  // --- M7.6 Part D.10: spe-1972's own "electronics take a degradation roll" residual cost.
  spe1972ElectronicsDegradationChance: c({
    value: 0.4,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "A single historical data point (the August 1972 event genuinely did degrade Intelsat IV F-2's arrays, AGU-KNIPP-2018) gives no rate to derive a trigger probability from; tuned so the roll is a real, felt risk without being certain every time.",
  }),
  spe1972ElectronicsDegradationFraction: c({
    value: 0.05,
    unit: "fraction",
    source: "AGU-KNIPP-2018",
    confidence: "measured",
    note: "Rauschenbach (1980), cited by AGU-KNIPP-2018: \"an ~5% drop in solar cell power generation capability for the INTELSAT IV F-2 solar panel arrays during the 4 August SEP event, roughly equivalent to 2 years of magnetospheric trapped-radiation exposure to the panels.\" Applied here as a permanent efficiencyPenaltyFraction on comms — this sim's own established stand-in for sensitive spacecraft electronics (engine/incidents.ts's coolant-ms22 equipment-strain check uses the same proxy) — on the roll above succeeding.",
  }),
  // --- M7.6 Part D.11: duststorm-2018's own permanent/cumulative residual costs.
  duststorm2018DustFloorIncreaseFraction: c({
    value: 0.05,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"Dust accumulation on arrays is PERMANENT and cumulative (InSight declined over years; cleaning is not free).\" LORENZ-2020-INSIGHT-DUST: InSight's own arrays declined ~0.28%/sol with no full recovery possible short of a dust-devil-scale event, and the mission ultimately died of accumulated dust that was never cleaned. This sim tracks one storm-scale incident, not a multi-year daily accumulation model, so that real per-sol rate is used qualitatively rather than converted directly: each time this incident resolves, environment.dustObscurationFraction gains a permanent floor it can never be cleaned below, increasing by this tuned fraction per event (brief rule 1: every 'tuned' confidence value cites GAME-DESIGN as its source, its real-world anchor disclosed here in the note instead).",
  }),
  duststorm2018BatteryDegradationFraction: c({
    value: 0.03,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"Deep battery discharge cycles permanently reduce usable capacity\" — a real, well-documented property of battery chemistry in general, but no source here ties a specific percentage to this sim's own abstracted battery model or to the 2018 storm's own discharge depth specifically, so the magnitude is tuned. Applied once, permanently, to power.batteryCapacityKwh, only if the battery is at or below its depth-of-discharge floor when this incident's response resolves.",
  }),
  // --- M7.6 Part D.12: scrubber-iss's own repeat-degradation and chronic-exposure costs.
  scrubberIssRepeatDegradationFraction: c({
    value: 0.05,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"A repaired bed runs at reduced capacity for the rest of the mission.\" ICES-2019-CDRA documents real, repeated CDRA sorbent-bed degradation after many operating cycles but states no specific percentage; this permanent, cumulative efficiencyPenaltyFraction on co2Scrubber (stacking multiplicatively across repeated swapCartridge successes, mirroring SystemState.efficiencyPenaltyFraction's own established stacking pattern) is tuned to that documented mechanism (brief rule 1: every 'tuned' confidence value cites GAME-DESIGN as its source, its real-world anchor disclosed here in the note instead).",
  }),
  co2ChronicExposureThresholdMmHgHours: c({
    value: 72,
    unit: "mmHg*h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "\"Cumulative CO2 exposure above 3 mmHg [survivalModes' own co2LimitMmHg, OCHMO-TB047] is tracked and carries lasting performance cost.\" No specific integrated-exposure threshold is published for a lasting (not acute) cognitive effect; 72 mmHg-hours is a tuned choice representing sustained, moderate above-limit exposure (e.g. 3 mmHg over limit for a full day, or 1 mmHg over for three days) rather than a brief spike.",
  }),
  co2ChronicExposureFatiguePenalty: c({
    value: 0.15,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "One-time, permanent fatigueFraction increase applied to every living crew member the first time co2ChronicExposureThresholdMmHgHours is crossed — a real, felt, lasting consequence standing in for OCHMO's own documented concern about chronic sub-acute CO2 exposure's cognitive effects, which this sim does not model in full clinical detail.",
  }),
} as const;

/**
 * Mission Difficulty presets (Phase 2 brief): scenario parameters only, never physics.
 * Every value here is a multiplier applied to something already sourced elsewhere
 * (failureRatePerHour's TRL penalty, an incident's own warningTimeHours) — never a second
 * copy of a physical constant, so there is exactly one place a "physics" value could leak
 * into a difficulty preset by mistake, and it isn't here.
 */
export const missionDifficulty = {
  training: {
    incidentRateMultiplier: c({ value: 0.5, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    failureRateMultiplier: c({ value: 0.5, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    // 1.5 -> 3.0 (M7.8 Part D, docs/M7.8_DIAGNOSIS.md): depress-mir97's own base
    // warningTimeHours (1) is already at the gentle end of its derived hole-diameter range
    // (constants.depressMir97HoleDiameterMm's own note — 8mm, not the 12mm worked example),
    // so its severity isn't the right lever. Measured: with detection delay (M7.7 §2) eating
    // into the *scaled* window before a decision can even be offered, 64 of 69 (93%) of First
    // Light Training's remaining prudentBot losses were this single incident's own kill clock
    // outrunning any response, regardless of which one was chosen — the brief's own "warning
    // time" lever, not a hazard rate.
    warningTimeMultiplier: c({ value: 3.0, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
  },
  nominal: {
    incidentRateMultiplier: c({ value: 1.0, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    failureRateMultiplier: c({ value: 1.0, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    // 1.0 -> 2.0, same reasoning as training above — see its own note.
    warningTimeMultiplier: c({ value: 2.0, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
  },
  flightRated: {
    incidentRateMultiplier: c({ value: 3.2, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    failureRateMultiplier: c({ value: 2.2, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
    warningTimeMultiplier: c({ value: 0.6, unit: "multiplier", source: "GAME-DESIGN", confidence: "tuned" }),
  },
} as const;

/**
 * M7.7 §3: science-points accrual rates. All tuned — no NASA document states a "points"
 * value for anything; what's real is which activities the Station rules name as
 * science-generating (crop biology, ISRU, and "science data return" under Communications)
 * and that jezero-outpost's real primaryGoal (engine/goals.ts) now actually requires them.
 */
export const science = {
  pointsPerHarvestKg: c({ value: 2, unit: "points/kg", source: "GAME-DESIGN", confidence: "tuned" }),
  pointsPerMoxieProducedKg: c({ value: 5, unit: "points/kg", source: "GAME-DESIGN", confidence: "tuned" }),
  pointsPerCommsUptimeHour: c({
    value: 0.5,
    unit: "points/h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Accrues while comms is operational, powered, and not in a blackout — routine science downlink, not a data-volume model.",
  }),
} as const;

/**
 * M7.7 §6: abort criteria. All tuned thresholds — the brief names the *kinds* of signal
 * (crew critical with no repair path, consumables short of the mission's own duration,
 * dose approaching the career limit, habitat integrity lost) but no NASA document states
 * game-numeric trigger points for any of them.
 */
export const abort = {
  doseFractionOfCareerLimit: c({
    value: 0.9,
    unit: "fraction",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "Any crew member's cumulativeDoseMSv crossing this fraction of radiation.careerLimitMSv is an abort signal — before the hard PARTIAL-ending threshold at 1.0, giving a bot/player room to act.",
  }),
  crewCriticalSustainedHours: c({
    value: 12,
    unit: "h",
    source: "GAME-DESIGN",
    confidence: "tuned",
    note: "A crew member continuously at CrewCondition \"critical\" for this long, with no incident actively being worked to address it, is the game's stand-in for \"no repair path\".",
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
  physiology,
  incidents,
  missionDifficulty,
  science,
  abort,
} as const;
