/**
 * M9.3 — Crisis Scenario: Mir Space Station Fire (February 23, 1997)
 *
 * Sourced from NASA-SP-4030 (The Mir Complex: NASA Investigation),
 * NASA-SMA-MIR-COLLISION, and MIR-FIRE-LINENGER.
 *
 * On February 23, 1997, at 22:35 Moscow time, cosmonaut Aleksandr Lazutkin lit
 * a supplemental solid-fuel oxygen generation candle (Vika / TGK) in the Kvant-1 module.
 * The canister malfunctioned, bursting into a blowtorch flame that charred the aluminum
 * hull, blocked the primary Soyuz escape route, and filled the station with suffocating,
 * toxic smoke.
 */
import type { SimState } from "../../types.js";
import type { CrisisScenario } from "../crisisScenario.js";
import { incidents as incidentConstants } from "../constants.js";

export const crisisMirFire: CrisisScenario = {
  id: "crisis-mir-fire",
  body: "moon",
  site: { name: "Low Earth Orbit (51.6° Inclination) · Mir Kvant-1", latDeg: 51.6, lonDeg: 0 },
  primaryGoal: {
    id: "surviveFullDurationNoLoss",
    briefKey: "crisis.mirFire.goal.primary",
  },
  stretchGoal: {
    id: "noSystemLeftFailed",
    briefKey: "crisis.mirFire.goal.stretch",
  },
  scienceTargetPoints: 0,
  durationHours: 4,
  crisisMaxDurationHours: 12,
  crewSize: 6,

  initial: {
    o2Kg: 120,
    co2Kg: 0.08,
    potableWaterKg: 400,
    foodDryMassKg: 80,
    batteryEnergyKwh: 50,
    batteryCapacityKwh: 70,
    habitatVolumeM3: 350, // Mir core + Kvant-1 complex volume [NASA-SP-4030]
    solarArrayAreaM2: 76,
    fissionReactorKwe: 0,
    shieldingGPerCm2: 15,
    cropTrays: [],
  },

  systems: [
    { id: "powerDistribution", trl: 9, nominalPowerKw: 1.0, priority: 0, spares: 2 },
    { id: "lifeSupport", trl: 9, nominalPowerKw: 0.8, priority: 1, spares: 1 },
    { id: "thermalControl", trl: 8, nominalPowerKw: 0.6, priority: 2, spares: 1 },
    { id: "comms", trl: 9, nominalPowerKw: 0.3, priority: 3, spares: 1 },
  ],

  scripted: [],

  briefingKey: "crisis.mirFire.briefing",
  crisisOnsetDescription: "crisis.mirFire.onset",

  availableMaterials: [
    "3 water/foam fire extinguishers",
    "4 full respirator cartridges",
    "emergency filter masks",
    "hermetic hatch dogging wrench",
  ],

  entryState: {
    hour: 0,
    safetyConsumables: {
      fireExtinguishers: 3,
      respiratorCartridges: 4,
    },
    crew: [
      {
        id: "korzun",
        name: "Valeri Korzun (CDR)",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.85,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "incidentCommand",
        backupStation: "power",
      },
      {
        id: "kaleri",
        name: "Aleksandr Kaleri (FE)",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.85,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "power",
        backupStation: "lifeSupport",
      },
      {
        id: "linenger",
        name: "Jerry Linenger (Cosmonaut-Researcher)",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.9,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "lifeSupport",
        backupStation: "incidentCommand",
      },
      {
        id: "tsibliyev",
        name: "Vasily Tsibliyev (CDR Mir-23)",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.85,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "incidentCommand",
        backupStation: "comms",
      },
      {
        id: "lazutkin",
        name: "Aleksandr Lazutkin (FE Mir-23)",
        location: "habitat",
        healthFraction: 0.7,
        moraleFraction: 0.75,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.2,
        injuryFraction: 0.3,
        primaryStation: "lifeSupport",
        backupStation: "power",
      },
      {
        id: "ewald",
        name: "Reinhold Ewald (ESA Astronaut)",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.85,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "comms",
        backupStation: "missionCommand",
      },
    ],
    activeIncidents: [
      {
        id: "fire-mir97",
        definitionId: "fire-mir97",
        triggeredAtHour: 0,
        cause: "hazard.componentRisk",
        detectedAtHour: 0,
      },
    ],
  },

  historicalOutcome: {
    summary: "crisis.mirFire.outcome.summary",
    keyMetric: {
      label: "Time to Fire Suppression",
      historicalValue: incidentConstants.mirFireDurationMinutes.value, // 14 minutes [NASA-SP-4030]
      unit: "min",
      playerValue: (state: SimState) => {
        const incident = state.activeIncidents.find((i) => i.definitionId === "fire-mir97");
        if (incident?.chosenResponseId === "fight") {
          return 14;
        }
        if (incident?.chosenResponseId === "evacuate") {
          return 30;
        }
        if (incident?.chosenResponseId === "ignore") {
          return 60;
        }
        return 14;
      },
    },
    resolution: "crisis.mirFire.outcome.resolution",
    sourceId: "NASA-SP-4030",
    nasaLink: "https://spaceflight.nasa.gov/history/shuttle-mir/",
  },
};
