/**
 * Builds the opening `SimState` from a `Scenario` and the run `Params`.
 *
 * Everything produced here is plain, serialisable data — no class instances, no closures —
 * so `structuredClone(state)` is a complete save and two runs can be deep-equal compared.
 */
import { crew as crewConstants, environment, incidents as incidentConstants, physics, radiation } from "../data/constants.js";
import { getScenario } from "../data/scenarios/index.js";
import { pio2MmHg } from "../models/atmosphere.js";
import type {
  CropTray,
  CrewMember,
  Params,
  Scenario,
  SimState,
  StationId,
  SystemId,
  SystemState,
} from "../types.js";
import { auToLightSeconds, partialPressureMmHg } from "../units.js";
import { createRngState } from "./rng.js";
import { STATION_IDS } from "./stations.js";

/** Exported so the Setup UI's own crew-naming step can show the real default a blank field
 *  falls back to as its placeholder, rather than a second, possibly-drifting copy of this
 *  list living in `apps/web`. */
export const CREW_NAMES = ["Ayesha", "Diego", "Mei", "Tunde", "Nadia", "Petra"] as const;

/**
 * Primary/backup stations rotate through `STATION_IDS` by crew index — deterministic, no RNG
 * draw needed. A 2-person crew (First Light) genuinely cannot cover all 5 stations even as a
 * backup: Incident Command and Mission Command sit unstaffed for that scenario by
 * construction, not a bug — a smaller crew is supposed to feel thinner.
 */
function buildCrew(size: number, startingPio2MmHg: number, customNames?: readonly string[]): CrewMember[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `crew-${i + 1}`,
    // A blank/whitespace-only entry (an emptied input, not yet retyped) falls through to the
    // real default pool the same as a missing one — never a visibly empty crew name.
    name: customNames?.[i]?.trim() || CREW_NAMES[i % CREW_NAMES.length] || `Crew ${i + 1}`,
    location: "habitat" as const,
    healthFraction: 1,
    moraleFraction: 1,
    cumulativeDoseMSv: 0,
    eventDoseMSv: 0,
    bodyTempC: 37,
    alive: true,
    hydrationClock: 0,
    starvationClock: 0,
    hypothermiaClock: 0,
    hypoxiaClock: 0,
    injuryFraction: 0,
    fatigueFraction: 0,
    heatStressClock: 0,
    pio2MmHg: startingPio2MmHg,
    primaryStation: STATION_IDS[i % STATION_IDS.length] as StationId,
    backupStation: STATION_IDS[(i + 1) % STATION_IDS.length] as StationId,
  }));
}

function buildSystems(scenario: Scenario): Partial<Record<SystemId, SystemState>> {
  const out: Partial<Record<SystemId, SystemState>> = {};
  for (const spec of scenario.systems) {
    out[spec.id] = {
      id: spec.id,
      trl: spec.trl,
      nominalPowerKw: spec.nominalPowerKw,
      priority: spec.priority,
      operational: true,
      spares: spec.spares,
      poweredThisHour: false,
      efficiencyPenaltyFraction: 0,
      maintenanceCreditUntilHour: 0,
    };
  }
  return out;
}

function buildTrays(scenario: Scenario): CropTray[] {
  return scenario.initial.cropTrays.map((t, i) => ({
    id: `tray-${i + 1}`,
    crop: t.crop,
    areaM2: t.areaM2,
    lightHours: 0,
    healthFraction: 1,
  }));
}

/** Unshielded ambient dose rate for a body, before the habitat shell is applied. */
export function ambientDoseMSvPerDay(body: Scenario["body"]): number {
  return body === "mars"
    ? radiation.marsSurfaceMSvPerDay.value
    : radiation.moonSurfaceMSvPerDay.value;
}

/**
 * `scenario` defaults to the base scenario `params.scenarioId` names — every existing caller
 * (the CLI, the balance harness, e2e fixtures) keeps working unchanged. M9's setup flow is the
 * one real caller that ever passes something else: `engine/setup.ts`'s `buildCustomScenario`
 * layers a player's landing-site/crew-size/power/shielding choices onto the base scenario and
 * hands the result straight through here, so `state.crew.length`/`scenario.crewSize` and
 * `scenario.site`/`state.thermal.outsideTempC` etc. can never silently disagree with what the
 * player actually chose.
 */
export function createInitialState(params: Params, scenario: Scenario = getScenario(params.scenarioId)): SimState {
  const init = scenario.initial;

  const startTempC = 22;
  const initialO2MmHg = partialPressureMmHg(
    init.o2Kg,
    physics.molarMassO2GPerMol.value,
    init.habitatVolumeM3,
    startTempC,
  );
  const initialCo2MmHg = partialPressureMmHg(
    init.co2Kg,
    physics.molarMassCo2GPerMol.value,
    init.habitatVolumeM3,
    startTempC,
  );
  const crew = buildCrew(params.crewSize, pio2MmHg(initialO2MmHg, initialCo2MmHg), params.crewNames);

  return {
    hour: 0,

    environment: {
      irradianceWPerM2: 0,
      dustObscurationFraction: 0,
      dustObscurationFloorFraction: 0,
      outsideTempC:
        scenario.body === "mars"
          ? environment.marsMeanSurfaceTempC.value
          : environment.moonEquatorMinTempC.value,
      isDaylight: false,
      stormActive: false,
    },

    power: {
      generationKw: 0,
      demandKw: 0,
      servedKw: 0,
      batteryEnergyKwh: init.batteryEnergyKwh,
      batteryCapacityKwh: init.batteryCapacityKwh,
      shedSystems: [],
      arrayAreaLossM2: 0,
    },

    thermal: {
      habitatTempC: startTempC,
      heaterKw: 0,
      radiatorKw: 0,
      crewHeatKw: 0,
      lossKw: 0,
      controlMode: "comfort",
    },

    atmosphere: {
      o2Kg: init.o2Kg,
      co2Kg: init.co2Kg,
      habitatVolumeM3: init.habitatVolumeM3,
      o2PartialPressureMmHg: initialO2MmHg,
      co2PartialPressureMmHg: initialCo2MmHg,
      scrubberEfficiencyFraction: 1,
      cumulativeCo2ExposureAboveLimitMmHgHours: 0,
      chronicCo2PenaltyApplied: false,
      co2ScrubberMode: "full",
    },

    water: {
      potableKg: init.potableWaterKg,
      wasteKg: 0,
      recoveryFraction: 0, // set by the water model on the first tick
      cumulativeLossKg: 0,
      intakeFraction: 1,
      reclamationMode: "baseline",
    },

    food: {
      storedDryMassKg: init.foodDryMassKg,
      mode: "nominal",
      trays: buildTrays(scenario),
      cumulativeHarvestKg: 0,
      intakeFraction: 1,
    },

    radiation: {
      ambientMSvPerDay: ambientDoseMSvPerDay(scenario.body),
      shieldingGPerCm2: init.shieldingGPerCm2,
      solarParticleEventActive: false,
    },

    crew,
    systems: buildSystems(scenario),
    activeIncidents: [],
    printQueue: [],

    comms: {
      oneWayLightSeconds:
        scenario.body === "mars"
          ? auToLightSeconds(environment.marsMeanDistanceAu.value - 1)
          : 1.28,
      blackout: false,
      priority: "science",
    },

    isru: {
      moxieRunning: false,
      moxieO2ProducedKg: 0,
      electrolysisO2ProducedKg: 0,
    },

    safetyConsumables: {
      fireExtinguishers: incidentConstants.mirFireExtinguisherInitialStock.value,
      respiratorCartridges: incidentConstants.mirRespiratorCartridgeInitialStock.value,
    },

    science: { points: 0 },

    // Day 0's budget, computed the same way engine/crewHours.ts recomputes it at every later
    // day boundary — health/morale both start at 1, so the full pooled figure applies here
    // directly rather than needing a TickContext this function doesn't have yet.
    crewHours: {
      budgetTodayHours: params.crewSize * crewConstants.dailyAssignableWorkHoursPerCrew.value,
      spentTodayHours: 0,
      queue: [],
      overtimeAuthorized: false,
      unboostedBudgetTodayHours: params.crewSize * crewConstants.dailyAssignableWorkHoursPerCrew.value,
    },
    crewActivityFraction: 1,

    rng: createRngState(params.seed),
    log: [],
    status: "running",
  };
}
