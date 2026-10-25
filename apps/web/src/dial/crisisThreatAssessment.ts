import {
  isCrisisScenario,
  type Scenario,
  type SimState,
} from "@sol-keeper/sim";

export interface CrisisThreatAssessment {
  readonly isCrisis: boolean;
  readonly crisisId: string;
  readonly outcomeLevel: "nominal" | "caution" | "critical";
  /** Short punchy label for the header badge: e.g. "★ Contained — LiOH Adapter Deployed" */
  readonly badgeHeadline: string;
  /** Detailed summary phrase for the badge reason */
  readonly badgeDetail: string;
  /** Player decision made during the crisis */
  readonly decisionTakenText: string;
  /** List of concrete cautions & threats that occurred */
  readonly threatsAndCautions: readonly string[];
  /** Historical telemetry comparison summary */
  readonly historicalComparisonText: string;
}

export function assessCrisisOutcome(
  scenario: Scenario,
  state: SimState,
): CrisisThreatAssessment {
  if (!isCrisisScenario(scenario)) {
    return {
      isCrisis: false,
      crisisId: "",
      outcomeLevel: "nominal",
      badgeHeadline: "",
      badgeDetail: "",
      decisionTakenText: "",
      threatsAndCautions: [],
      historicalComparisonText: "",
    };
  }

  // 1. Apollo 13 CO2 Buildup (1970)
  if (scenario.id === "crisis-apollo13-co2") {
    const incident = state.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13");
    const chosenResponse = incident?.chosenResponseId;
    const isResolved = incident?.resolvedAtHour !== undefined || chosenResponse === "improviseAdapter";
    const co2MmHg = state.atmosphere.co2PartialPressureMmHg;

    if (isResolved || chosenResponse === "improviseAdapter") {
      const co2Formatted = co2MmHg.toFixed(1);
      const isClean = co2MmHg < 10.0;
      return {
        isCrisis: true,
        crisisId: scenario.id,
        outcomeLevel: isClean ? "nominal" : "caution",
        badgeHeadline: isClean
          ? "★ Contained — Improvised LiOH Adapter Installed"
          : "▲ Elevated CO₂ Caution — Adapter Installed Late",
        badgeDetail: `all crew survived · ppCO₂ stabilized at ${co2Formatted} mmHg (below 15.0 mmHg limit)`,
        decisionTakenText: "Fabricated improvised adapter using CM square canisters, flight plan covers, and suit hoses",
        threatsAndCautions: [
          `LM cylindrical LiOH canisters exhausted; Command Module canisters successfully modified to fit Aquarius sockets.`,
          `Cabin ppCO₂ stabilized at ${co2Formatted} mmHg (Historical Apollo 13 flight peak reached 15.0 mmHg).`,
          isClean
            ? "Zero hypercapnia injury or carbon dioxide narcosis sustained by crew."
            : `Elevated CO₂ exposure (${co2Formatted} mmHg) caused mild hyperventilation and headache before stabilization.`,
        ],
        historicalComparisonText: "Matched historical NASA resolution (Houston team Smylie & Centrich improvised adapter).",
      };
    }

    if (chosenResponse === "ventCabinO2") {
      return {
        isCrisis: true,
        crisisId: scenario.id,
        outcomeLevel: "caution",
        badgeHeadline: "▲ Cabin Vented — Severe O₂ Depletion Hazard",
        badgeDetail: "ppCO₂ reduced via atmospheric venting · high consumable penalty incurred",
        decisionTakenText: "Emergency cabin pressure dump and oxygen purge",
        threatsAndCautions: [
          "Emergency cabin venting expelled toxic CO₂ but depleted critical oxygen reserves.",
          "Consumables depletion hazard: Aquarius oxygen margin critically reduced for translunar coast.",
          "Cabin repressurization required continuous high-rate tank flow.",
        ],
        historicalComparisonText: "Diverged from historical NASA protocol; venting risked oxygen starvation before splashdown.",
      };
    }

    // Unresolved / timed out / default ignore
    const co2Formatted = co2MmHg.toFixed(1);
    return {
      isCrisis: true,
      crisisId: scenario.id,
      outcomeLevel: "critical",
      badgeHeadline: "■ Critical Hypercapnia Hazard — LiOH Scrubbers Exhausted",
      badgeDetail: `ppCO₂ reached toxic ceiling (${co2Formatted} mmHg) · crew hypercapnic`,
      decisionTakenText: "No operational adapter installed; square CM canisters remained incompatible",
      threatsAndCautions: [
        `Lethal hypercapnia hazard: Cabin ppCO₂ surged to ${co2Formatted} mmHg, exceeding the 15.0 mmHg ceiling.`,
        "Crew experienced severe respiratory distress, cognitive impairment, and acidosis.",
        "Without improvised scrubbing, Aquarius atmosphere exceeded survivable limits.",
      ],
      historicalComparisonText: "Exceeded historical Apollo 13 peak CO₂ ceiling (15.0 mmHg limit [A13-CO2]).",
    };
  }

  // 2. August 1972 Solar Particle Event (SPE 1972)
  if (scenario.id === "crisis-spe-1972") {
    const maxDose = Math.max(0, ...state.crew.map((c) => c.cumulativeDoseMSv));
    const maxDoseFormatted = Math.round(maxDose);
    const arsVictims = state.crew.filter((c) => c.cumulativeDoseMSv >= 100);
    const evaCrew = state.crew.filter((c) => c.location === "eva");
    const allSheltered = state.crew.every((c) => c.location === "stormShelter");

    if (arsVictims.length > 0 || evaCrew.length > 0) {
      const victimNames = (arsVictims.length > 0 ? arsVictims : evaCrew).map((c) => c.name).join(", ");
      return {
        isCrisis: true,
        crisisId: scenario.id,
        outcomeLevel: "critical",
        badgeHeadline: "■ Acute Radiation Syndrome Hazard — EVA Crew Exposed",
        badgeDetail: `${victimNames} absorbed ${maxDoseFormatted} mSv on EVA (ARS limit breached)`,
        decisionTakenText: "Astronauts remained outside on EVA in 0.5 g/cm² spacesuits during >400 rem flux",
        threatsAndCautions: [
          `Severe proton flux threat: ${victimNames} caught outside during coronal mass ejection impact.`,
          `Acute dose exceeded the 100 mSv threshold (${maxDoseFormatted} mSv absorbed), triggering Acute Radiation Syndrome.`,
          "Crew suffered nausea, hemopoietic bone marrow suppression, and severe tissue irradiation.",
          "NASA radiation biophysics (HRP-ARS / NASA-TP-3643) models unshielded lunar EVA exposure as fatal within 48 hours.",
        ],
        historicalComparisonText: "Diverged from safe baseline: August 1972 event had no astronauts on the Moon; an EVA astronaut would have received >4,000 mSv.",
      };
    }

    if (allSheltered && maxDose < 100) {
      return {
        isCrisis: true,
        crisisId: scenario.id,
        outcomeLevel: "nominal",
        badgeHeadline: "★ Contained — Regolith Storm Shelter Protected Crew",
        badgeDetail: `all crew sheltered · acute dose held to ${maxDoseFormatted} mSv (below 250 mSv limit)`,
        decisionTakenText: "Immediate recall and full crew lock-in inside 20 g/cm² regolith storm shelter",
        threatsAndCautions: [
          ">400 rem (4,000 mSv) solar proton flux impacted the lunar surface during the solar storm.",
          `20 g/cm² regolith storm shelter successfully attenuated radiation to ${maxDoseFormatted} mSv (safely below 250 mSv acute limit).`,
          "Zero crew members developed Acute Radiation Syndrome (ARS).",
        ],
        historicalComparisonText: "Validated NASA storm shelter architecture: regolith overburden preserved crew viability.",
      };
    }

    // Sheltered in habitat only (5 g/cm2), not storm shelter
    return {
      isCrisis: true,
      crisisId: scenario.id,
      outcomeLevel: "caution",
      badgeHeadline: "▲ Elevated Radiation Caution — Base Shelter Only",
      badgeDetail: `acute dose reached ${maxDoseFormatted} mSv · regolith storm shelter underutilized`,
      decisionTakenText: "Crew sheltered inside habitat hull (5 g/cm²) without entering regolith shelter",
      threatsAndCautions: [
        `Coronal mass ejection proton flux partially penetrated thin habitat shielding (${maxDoseFormatted} mSv absorbed).`,
        "Elevated career radiation dose penalty incurred by all base occupants.",
        "Regolith storm shelter was required to keep acute dose below conservative spaceflight limits.",
      ],
      historicalComparisonText: "Exceeded recommended 30-day acute radiation margin (NASA-TP-3643).",
    };
  }

  // 3. Mir Station Fire (1997)
  if (scenario.id === "crisis-mir-fire") {
    const incident = state.activeIncidents.find((i) => i.definitionId === "mir-fire-1997");
    const isResolved = incident?.resolvedAtHour !== undefined || incident?.chosenResponseId !== undefined;
    const extinguishersLeft = state.safetyConsumables.fireExtinguishers;
    const respiratorsLeft = state.safetyConsumables.respiratorCartridges;
    const extinguishersUsed = Math.max(0, 3 - extinguishersLeft);

    if (isResolved || extinguishersUsed > 0) {
      const isClean = extinguishersLeft >= 0 && state.crew.every((c) => c.alive);
      return {
        isCrisis: true,
        crisisId: scenario.id,
        outcomeLevel: isClean ? "nominal" : "caution",
        badgeHeadline: isClean
          ? "★ Contained — Mir Fire Extinguished & Smoke Scrubbed"
          : "▲ Toxic Combustion Caution — Prolonged Fire Suppression",
        badgeDetail: `fire suppressed · ${extinguishersUsed} extinguisher(s) spent · respirators donned`,
        decisionTakenText: "Direct attack with foam/water extinguishers while donning respirators and isolating ventilation",
        threatsAndCautions: [
          "Defective Vika TGK oxygen candle burst into a blowtorch flame in the Kvant-1 module.",
          `Crew expended ${extinguishersUsed} fire extinguishers and used respirator cartridges (${respiratorsLeft} remaining).`,
          "Dense black smoke and carbon monoxide scrubbed by life support loop; docked Soyuz lifeboat preserved.",
        ],
        historicalComparisonText: "Matched historical Mir resolution (Commander Valeri Korzun extinguished candle at minute 14 [NASA-SP-4030]).",
      };
    }

    return {
      isCrisis: true,
      crisisId: scenario.id,
      outcomeLevel: "critical",
      badgeHeadline: "■ Uncontrolled Fire Hazard — Smoke & Toxic Combustion",
      badgeDetail: "flame uncontained · docked Soyuz escape route obstructed by smoke",
      decisionTakenText: "No active suppression deployed; fire allowed to burn uncontrolled",
      threatsAndCautions: [
        "Critical combustion hazard: Flame charred Kvant-1 bulkheads and released toxic perchlorates.",
        "Dense smoke obstructed escape hatch to the docked Soyuz return capsule.",
        "Oxygen candle burned uninhibited, consuming station oxygen and generating toxic carbon monoxide.",
      ],
      historicalComparisonText: "Failed to match historical 14-minute suppression timeline (NASA-SP-4030).",
    };
  }

  return {
    isCrisis: false,
    crisisId: "",
    outcomeLevel: "nominal",
    badgeHeadline: "",
    badgeDetail: "",
    decisionTakenText: "",
    threatsAndCautions: [],
    historicalComparisonText: "",
  };
}
