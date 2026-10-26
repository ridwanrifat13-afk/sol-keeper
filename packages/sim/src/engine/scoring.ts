/**
 * Mission Scoring System (Phase 2 brief M9.4).
 *
 * Deterministic 0–100 scoring engine that evaluates a complete mission log and produces a
 * structured score with per-category breakdowns, highlighted decisions, and percentile ranks
 * against precomputed bot baseline runs.
 *
 * Hard rules:
 * 1. PURE FUNCTION. Zero side effects, zero imports from React, zero external state.
 * 2. DETERMINISTIC. Same log = same score always. No randomness, no Date.now().
 * 3. Structured ScoreEvents with i18n keys and depth levels.
 * 4. Read-only on the event log.
 */
import { INCIDENT_CATALOG } from "./incidents.js";
import { isCrisisScenario, type CrisisScenario } from "../data/crisisScenario.js";
import { crewCondition } from "../models/crew.js";
import type { LogEntry, MissionDifficulty, Scenario, SimState, SurvivalMode } from "../types.js";

// ---------------------------------------------------------------------------
// Types (M9.4)
// ---------------------------------------------------------------------------

export type ScoreComponentId = "outcome" | "margin" | "decision" | "efficiency" | "welfare";

export interface ScoreEvent {
  readonly sol: number;
  readonly hour: number;
  readonly delta: number; // positive = bonus, negative = deduction
  readonly reason: string; // i18n key
  readonly causalEventId?: string; // links to the Black Box log entry
  readonly depth: "all" | "specialist" | "commander";
}

export interface ScoreComponent {
  readonly id: ScoreComponentId;
  readonly label: string; // i18n key
  readonly score: number; // 0–max
  readonly maxScore: number;
  readonly events: readonly ScoreEvent[];
}

export interface HighlightedDecision {
  readonly sol: number;
  readonly station: string;
  readonly chosenOption: string;
  readonly alternativeOption: string;
  readonly netEffect: number; // positive = good call, negative = bad call
  readonly explanation: string; // i18n key
}

export interface BotBaselines {
  /** Map of `${scenarioId}:${difficulty}` -> sorted array of 200 bot scores */
  readonly distributions?: Readonly<Record<string, readonly number[]>>;
  /** Map of `${scenarioId}:${difficulty}` -> bot medians */
  readonly medians?: Readonly<
    Record<
      string,
      {
        readonly prudentBotMedian: number;
        readonly greedyBotMedian: number;
        readonly idleBotMedian: number;
      }
    >
  >;
}

export interface MissionScore {
  readonly total: number; // 0–100, rounded to 1 decimal
  readonly grade: "A+" | "A" | "B" | "C" | "D" | "F";
  readonly components: readonly ScoreComponent[];
  readonly bestDecision: HighlightedDecision;
  readonly costliestDecision: HighlightedDecision;
  readonly percentile: number; // against bot baseline for this scenario + difficulty
  readonly baselineComparison: {
    readonly prudentBotMedian: number;
    readonly greedyBotMedian: number;
    readonly idleBotMedian: number;
  };
  readonly isCrisisReplay: boolean;
}

export type CrisisScoreComponentId = "speed" | "hazard" | "resources" | "crew";

export interface CrisisScoreComponent {
  readonly id: CrisisScoreComponentId;
  readonly label: string;
  readonly score: number;
  readonly maxScore: number;
  readonly detail: string;
}

export interface CrisisHistoricalComparison {
  readonly keyMetricLabel: string;
  readonly playerValue: string;
  readonly historicalValue: string;
  readonly historicalContext: string;
}

export interface ScenarioCrisisScore {
  readonly total: number; // 0-100, rounded to 1 decimal
  readonly grade: "A+" | "A" | "B" | "C" | "D" | "F";
  readonly components: readonly CrisisScoreComponent[];
  readonly historicalComparison: CrisisHistoricalComparison;
  readonly scenarioId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round1 = (x: number): number => Math.round(x * 10) / 10;
const round2 = (x: number): number => Math.round(x * 100) / 100;
const solOf = (hour: number): number => Math.floor(hour / 24) + 1;

/** Maps total score (0-100) and status to letter grade */
export function calculateGrade(
  total: number,
  status: SimState["status"],
): "A+" | "A" | "B" | "C" | "D" | "F" {
  let grade: "A+" | "A" | "B" | "C" | "D" | "F";
  if (total >= 90) grade = "A+";
  else if (total >= 80) grade = "A";
  else if (total >= 70) grade = "B";
  else if (total >= 60) grade = "C";
  else if (total >= 45) grade = "D";
  else grade = "F";

  // Hard rule: On a LOSS outcome, cap at C regardless of component scores
  if (status === "loss" && (grade === "A+" || grade === "A" || grade === "B")) {
    return "C";
  }
  return grade;
}

// ---------------------------------------------------------------------------
// 1. Outcome Evaluator (30 pts)
// ---------------------------------------------------------------------------

function evaluateOutcome(
  finalState: SimState,
  scenario: Scenario,
): { score: number; events: ScoreEvent[] } {
  const events: ScoreEvent[] = [];
  let score = 0;
  const hour = finalState.hour;
  const sol = solOf(hour);

  if (finalState.status === "success") {
    if (finalState.stretchGoalMet) {
      score = 30;
      events.push({
        sol,
        hour,
        delta: 30,
        reason: "scoring.outcome.successWithStretch",
        depth: "all",
      });
    } else {
      score = 24;
      events.push({
        sol,
        hour,
        delta: 24,
        reason: "scoring.outcome.successAllPrimary",
        depth: "all",
      });
    }
  } else if (finalState.status === "partial") {
    // Check if > 50% primary goals were met
    let majorityMet = false;
    if (scenario.primaryGoal.id === "missionGoalsMet") {
      const scienceFrac = finalState.science.points / Math.max(1, scenario.scienceTargetPoints);
      const livingCount = finalState.crew.filter((c) => c.alive).length;
      majorityMet = scienceFrac >= 0.5 && livingCount >= scenario.crewSize * 0.5;
    } else if (scenario.primaryGoal.id === "harvestAllCropTrays") {
      const harvested = finalState.food.trays.filter((tray) =>
        finalState.log.some((e) => e.code === "food.harvest" && e.data["tray"] === tray.id),
      ).length;
      majorityMet = harvested >= finalState.food.trays.length * 0.5;
    } else if (scenario.primaryGoal.id === "surviveFullDurationNoLoss") {
      majorityMet = finalState.crew.some((c) => c.alive);
    }

    if (majorityMet) {
      score = 18;
      events.push({
        sol,
        hour,
        delta: 18,
        reason: "scoring.outcome.partialMajorityGoals",
        depth: "all",
      });
    } else {
      score = 10;
      events.push({
        sol,
        hour,
        delta: 10,
        reason: "scoring.outcome.partialNoGoals",
        depth: "all",
      });
    }
  } else if (finalState.status === "abort") {
    const elapsedRatio = scenario.durationHours > 0 ? hour / scenario.durationHours : 1;
    if (elapsedRatio < 0.2) {
      score = 16;
      events.push({
        sol,
        hour,
        delta: 16,
        reason: "scoring.outcome.abortEarlySafe",
        depth: "all",
      });
    } else {
      score = 8;
      events.push({
        sol,
        hour,
        delta: 8,
        reason: "scoring.outcome.abortLateSafe",
        depth: "all",
      });
    }
  } else {
    // status === "loss"
    const survivors = finalState.crew.filter((c) => c.alive).length;
    if (survivors > 0) {
      score = 3;
      events.push({
        sol,
        hour,
        delta: 3,
        reason: "scoring.outcome.lossWithSurvivors",
        depth: "all",
      });
    } else {
      score = 0;
      events.push({
        sol,
        hour,
        delta: 0,
        reason: "scoring.outcome.lossNoSurvivors",
        depth: "all",
      });
    }
  }

  return { score, events };
}

// ---------------------------------------------------------------------------
// 2. Safety Margin Evaluator (25 pts, penalty model)
// ---------------------------------------------------------------------------

function evaluateSafetyMargin(
  log: readonly LogEntry[],
  finalState: SimState,
): { score: number; events: ScoreEvent[] } {
  const events: ScoreEvent[] = [];
  let totalPenalties = 0;

  // 1. Battery at 0%: 5 per event
  for (const entry of log) {
    if (entry.code === "power.batteryDepleted") {
      totalPenalties += 5;
      events.push({
        sol: solOf(entry.hour),
        hour: entry.hour,
        delta: -5,
        reason: "scoring.margin.batteryDepleted",
        causalEventId: entry.id,
        depth: "specialist",
      });
    }
  }

  // 2. Any crew member in 'critical' condition: 3 per crew member (once, not per hour)
  const criticalCrewIds = new Set<string>();
  for (const member of finalState.crew) {
    if (member.criticalSinceHour !== undefined || !member.alive || member.injuryFraction >= 0.75) {
      criticalCrewIds.add(member.id);
    }
  }
  for (const entry of log) {
    if (
      (entry.kind === "crew" && entry.severity === "critical") ||
      entry.code.startsWith("crew.lost") ||
      entry.code === "crew.co2Idlh"
    ) {
      const crewName = typeof entry.data["crew"] === "string" ? entry.data["crew"] : undefined;
      const matched = finalState.crew.find((c) => c.name === crewName);
      if (matched !== undefined) criticalCrewIds.add(matched.id);
    }
  }
  for (const crewId of criticalCrewIds) {
    totalPenalties += 3;
    const member = finalState.crew.find((c) => c.id === crewId);
    events.push({
      sol: solOf(member?.criticalSinceHour ?? finalState.hour),
      hour: member?.criticalSinceHour ?? finalState.hour,
      delta: -3,
      reason: "scoring.margin.crewCritical",
      depth: "all",
    });
  }

  // 3. Cumulative dose above 400 mSv (any crew member): 4 per crew member
  for (const member of finalState.crew) {
    if (member.cumulativeDoseMSv > 400) {
      totalPenalties += 4;
      events.push({
        sol: solOf(finalState.hour),
        hour: finalState.hour,
        delta: -4,
        reason: "scoring.margin.doseExceeded",
        depth: "specialist",
      });
    }
  }

  // 4. Rationing mode duration penalties:
  // Mode 1 rationing active: 0.05 per hour; mode 2: 0.15 per hour
  let currentMode: SurvivalMode = "nominal";
  let modeStartHour = 0;
  let mode1Hours = 0;
  let mode2Hours = 0;

  for (const entry of log) {
    if (entry.code === "decision.rations.set" && typeof entry.data["mode"] === "string") {
      const newMode = entry.data["mode"] as SurvivalMode;
      const duration = entry.hour - modeStartHour;
      if (currentMode === "mode1") mode1Hours += duration;
      else if (currentMode === "mode2") mode2Hours += duration;
      currentMode = newMode;
      modeStartHour = entry.hour;
    }
  }
  const remainingHours = Math.max(0, finalState.hour - modeStartHour);
  if (currentMode === "mode1") mode1Hours += remainingHours;
  else if (currentMode === "mode2") mode2Hours += remainingHours;

  if (mode1Hours > 0) {
    const penalty = round2(mode1Hours * 0.05);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.rationingMode1",
      depth: "commander",
    });
  }
  if (mode2Hours > 0) {
    const penalty = round2(mode2Hours * 0.15);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.rationingMode2",
      depth: "commander",
    });
  }

  // 5. Environmental excursions from log:
  // - O2 below warning threshold: 0.1 per hour
  // - CO2 above 3 mmHg: 0.08 per hour; above 7.6 mmHg: 0.15 per hour
  // - Water below 5% of daily requirement: 0.1 per hour
  let lowO2Hours = 0;
  let highCo2Hours = 0;
  let veryHighCo2Hours = 0;
  let lowWaterHours = 0;

  for (const entry of log) {
    if (entry.code === "atmosphere.lowOxygen") {
      lowO2Hours += 1;
    } else if (entry.code === "atmosphere.co2AboveLimit") {
      const co2 = typeof entry.data["co2MmHg"] === "number" ? entry.data["co2MmHg"] : 0;
      if (co2 > 7.6) veryHighCo2Hours += 1;
      else if (co2 > 3.0) highCo2Hours += 1;
    } else if (entry.code === "water.belowOneDayReserve") {
      lowWaterHours += 1;
    }
  }

  if (lowO2Hours > 0) {
    const penalty = round2(lowO2Hours * 0.1);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.lowOxygenExcursion",
      depth: "commander",
    });
  }
  if (highCo2Hours > 0) {
    const penalty = round2(highCo2Hours * 0.08);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.highCo2Excursion",
      depth: "commander",
    });
  }
  if (veryHighCo2Hours > 0) {
    const penalty = round2(veryHighCo2Hours * 0.15);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.severeCo2Excursion",
      depth: "commander",
    });
  }
  if (lowWaterHours > 0) {
    const penalty = round2(lowWaterHours * 0.1);
    totalPenalties += penalty;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -penalty,
      reason: "scoring.margin.lowWaterExcursion",
      depth: "commander",
    });
  }

  const score = Math.max(0, round1(25 - totalPenalties));
  return { score, events };
}

// ---------------------------------------------------------------------------
// 3. Decision Quality Evaluator (25 pts)
// ---------------------------------------------------------------------------

function evaluateDecisionQuality(
  log: readonly LogEntry[],
  finalState: SimState,
): { score: number; events: ScoreEvent[] } {
  const events: ScoreEvent[] = [];
  let score = 0;

  // Track incidents and evaluate responses
  for (const incident of finalState.activeIncidents) {
    const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (def === undefined) continue;

    const chosenId = incident.chosenResponseId;
    const defaultId = def.defaultResponseId;

    // Timer expired or default chosen
    if (chosenId === undefined || chosenId === defaultId) {
      score -= 1;
      events.push({
        sol: solOf(incident.resolvedAtHour ?? incident.triggeredAtHour),
        hour: incident.resolvedAtHour ?? incident.triggeredAtHour,
        delta: -1,
        reason: "scoring.decision.timerExpiredDefault",
        causalEventId: incident.cause,
        depth: "specialist",
      });
      continue;
    }

    // Compute counterfactual cost of default response vs chosen response
    const defaultResp = def.responses.find((r) => r.id === defaultId);
    const chosenResp = def.responses.find((r) => r.id === chosenId);

    // Default response cost: declared cost + downstream penalty
    // In our sim, default options are deliberately "do nothing" with leavesOngoing: true
    const defaultBaseCost = (defaultResp?.crewHoursCost ?? 0) + (defaultResp?.sparesCost ?? 0) * 2;
    const defaultOngoingCost = defaultResp?.leavesOngoing ? 10 : 0;
    const defaultTotalCost = defaultBaseCost + defaultOngoingCost;

    // Chosen response downstream cost: declared cost + any downstream failures
    const chosenBaseCost = (chosenResp?.crewHoursCost ?? 0) + (chosenResp?.sparesCost ?? 0) * 2;
    // Check if the chosen response had downstream failures/shortfalls in log
    let downstreamFailuresCost = 0;
    for (const entry of log) {
      if (entry.causedBy?.includes(incident.cause)) {
        if (entry.code.endsWith(".responseFailed")) downstreamFailuresCost += 4;
        if (entry.code.endsWith(".extinguishersExhausted")) downstreamFailuresCost += 3;
        if (entry.severity === "critical") downstreamFailuresCost += 5;
      }
    }
    const chosenTotalCost = chosenBaseCost + downstreamFailuresCost;

    if (chosenTotalCost < defaultTotalCost * 0.9) {
      score += 2;
      events.push({
        sol: solOf(incident.resolvedAtHour ?? incident.triggeredAtHour),
        hour: incident.resolvedAtHour ?? incident.triggeredAtHour,
        delta: 2,
        reason: "scoring.decision.superiorResponse",
        causalEventId: incident.cause,
        depth: "all",
      });
    } else if (Math.abs(chosenTotalCost - defaultTotalCost) <= defaultTotalCost * 0.1) {
      score += 1;
      events.push({
        sol: solOf(incident.resolvedAtHour ?? incident.triggeredAtHour),
        hour: incident.resolvedAtHour ?? incident.triggeredAtHour,
        delta: 1,
        reason: "scoring.decision.acceptableResponse",
        causalEventId: incident.cause,
        depth: "specialist",
      });
    } else {
      events.push({
        sol: solOf(incident.resolvedAtHour ?? incident.triggeredAtHour),
        hour: incident.resolvedAtHour ?? incident.triggeredAtHour,
        delta: 0,
        reason: "scoring.decision.costlyResponse",
        causalEventId: incident.cause,
        depth: "specialist",
      });
    }
  }

  // Proactive bonuses (scan planning actions in log)
  let brownoutBonusCount = 0;
  let rationBonusCount = 0;
  let maintenanceBonusCount = 0;
  let speEvaBonusAwarded = false;
  let speShelterBonusAwarded = false;

  for (let i = 0; i < log.length; i++) {
    const entry = log[i]!;

    // 1. Power priority updated in sol BEFORE brownout: +1 (max 5)
    if (entry.code === "power.brownout" && brownoutBonusCount < 5) {
      const brownoutHour = entry.hour;
      const priorPriorityUpdate = log.some(
        (e) =>
          e.code === "decision.priority.changed" &&
          e.hour >= brownoutHour - 24 &&
          e.hour < brownoutHour,
      );
      if (priorPriorityUpdate) {
        brownoutBonusCount += 1;
        score += 1;
        events.push({
          sol: solOf(brownoutHour),
          hour: brownoutHour,
          delta: 1,
          reason: "scoring.decision.proactivePriorityBonus",
          causalEventId: entry.id,
          depth: "specialist",
        });
      }
    }

    // 2. Ration level reduced in sol BEFORE critical resource warning: +1 (max 3)
    if (
      (entry.code === "water.belowOneDayReserve" || entry.code === "power.batteryDepleted") &&
      rationBonusCount < 3
    ) {
      const warnHour = entry.hour;
      const priorRationReduction = log.some(
        (e) =>
          e.code === "decision.rations.set" &&
          (e.data["mode"] === "mode1" || e.data["mode"] === "mode2") &&
          e.hour >= warnHour - 24 &&
          e.hour < warnHour,
      );
      if (priorRationReduction) {
        rationBonusCount += 1;
        score += 1;
        events.push({
          sol: solOf(warnHour),
          hour: warnHour,
          delta: 1,
          reason: "scoring.decision.proactiveRationBonus",
          causalEventId: entry.id,
          depth: "specialist",
        });
      }
    }

    // 3. Maintenance task scheduled in sol BEFORE failure on that component: +2 (max 4)
    if (entry.kind === "fault" && entry.system !== undefined && maintenanceBonusCount < 4) {
      const faultHour = entry.hour;
      const sys = entry.system;
      const priorMaint = log.some(
        (e) =>
          e.code === "decision.scheduledMaintenance.performed" &&
          e.system === sys &&
          e.hour >= faultHour - 24 &&
          e.hour < faultHour,
      );
      if (priorMaint) {
        maintenanceBonusCount += 2;
        score += 2;
        events.push({
          sol: solOf(faultHour),
          hour: faultHour,
          delta: 2,
          reason: "scoring.decision.proactiveMaintenanceBonus",
          causalEventId: entry.id,
          depth: "specialist",
        });
      }
    }

    // 4. EVA cleared as 'no-go' in sol BEFORE SPE: +2
    if (
      (entry.code === "hazard.spe" || entry.code === "incident.spe-1972.start") &&
      !speEvaBonusAwarded
    ) {
      const speHour = entry.hour;
      const priorNoGo = log.some(
        (e) =>
          e.code === "decision.crewLocation.set" &&
          e.data["location"] !== "eva" &&
          e.hour >= speHour - 24 &&
          e.hour < speHour,
      );
      if (priorNoGo) {
        speEvaBonusAwarded = true;
        score += 2;
        events.push({
          sol: solOf(speHour),
          hour: speHour,
          delta: 2,
          reason: "scoring.decision.evaNoGoBeforeSpeBonus",
          causalEventId: entry.id,
          depth: "all",
        });
      }
    }

    // 5. Crew sheltered before SPE confirmation (not after): +2
    if (
      (entry.code === "hazard.spe" || entry.code === "incident.spe-1972.start") &&
      !speShelterBonusAwarded
    ) {
      const speHour = entry.hour;
      const shelteredEarly = log.some(
        (e) =>
          e.code === "decision.crewLocation.set" &&
          e.data["location"] === "stormShelter" &&
          e.hour < speHour,
      );
      if (shelteredEarly) {
        speShelterBonusAwarded = true;
        score += 2;
        events.push({
          sol: solOf(speHour),
          hour: speHour,
          delta: 2,
          reason: "scoring.decision.earlyShelterBonus",
          causalEventId: entry.id,
          depth: "all",
        });
      }
    }
  }

  // Cap total decision quality score at 25, floor at 0
  const finalScore = Math.max(0, Math.min(25, round1(score)));
  return { score: finalScore, events };
}

// ---------------------------------------------------------------------------
// 4. Resource Efficiency Evaluator (10 pts)
// ---------------------------------------------------------------------------

function evaluateResourceEfficiency(
  log: readonly LogEntry[],
  finalState: SimState,
  scenario: Scenario,
): { score: number; events: ScoreEvent[] } {
  const events: ScoreEvent[] = [];
  let score = 10;

  // 1. Improvised repairs: -0.5 each
  for (const entry of log) {
    if (entry.code.endsWith(".resolved") && entry.data["improvised"] === 1) {
      score -= 0.5;
      events.push({
        sol: solOf(entry.hour),
        hour: entry.hour,
        delta: -0.5,
        reason: "scoring.efficiency.improvisedRepairDeduction",
        causalEventId: entry.id,
        depth: "specialist",
      });
    }
  }

  // 2. Failed repair attempts: -1 each
  for (const entry of log) {
    if (entry.code.endsWith(".responseFailed")) {
      score -= 1;
      events.push({
        sol: solOf(entry.hour),
        hour: entry.hour,
        delta: -1,
        reason: "scoring.efficiency.failedRepairDeduction",
        causalEventId: entry.id,
        depth: "specialist",
      });
    }
  }

  // 3. End-of-mission food surplus > 20% of initial stores: -1
  if (finalState.food.storedDryMassKg > scenario.initial.foodDryMassKg * 1.2) {
    score -= 1;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: -1,
      reason: "scoring.efficiency.overProvisionedFoodDeduction",
      depth: "all",
    });
  }

  // 4. Spare consumed on repair that itself failed within 10 sols (240 hours): -0.5
  for (const entry of log) {
    if (entry.code === "system.repaired" && entry.system !== undefined) {
      const repairHour = entry.hour;
      const sys = entry.system;
      const refailedSoon = log.some(
        (e) =>
          e.hour > repairHour &&
          e.hour <= repairHour + 240 &&
          e.system === sys &&
          (e.code === "system.failed" || e.kind === "fault"),
      );
      if (refailedSoon) {
        score -= 0.5;
        events.push({
          sol: solOf(repairHour),
          hour: repairHour,
          delta: -0.5,
          reason: "scoring.efficiency.prematureRefailureDeduction",
          causalEventId: entry.id,
          depth: "commander",
        });
      }
    }
  }

  const finalScore = Math.max(0, round1(score));
  return { score: finalScore, events };
}

// ---------------------------------------------------------------------------
// 5. Crew Welfare Evaluator (10 pts)
// ---------------------------------------------------------------------------

function evaluateCrewWelfare(
  log: readonly LogEntry[],
  finalState: SimState,
): { score: number; events: ScoreEvent[] } {
  const events: ScoreEvent[] = [];
  let score = 0;

  // 1. Average crew morale across all crew, normalized 0–1: x 4 pts
  const living = finalState.crew.filter((c) => c.alive);
  const avgMorale =
    living.length > 0
      ? living.reduce((sum, c) => sum + c.moraleFraction, 0) / living.length
      : 0;
  const moraleScore = round1(avgMorale * 4);
  score += moraleScore;
  events.push({
    sol: solOf(finalState.hour),
    hour: finalState.hour,
    delta: moraleScore,
    reason: "scoring.welfare.averageMoraleScore",
    depth: "all",
  });

  // 2. Overtime ceiling <= 48 consecutive hours: 3 pts (-1 per crew member who exceeded)
  // Check if overtimeAuthorized was set continuously for > 48h
  let consecutiveOvertimeHours = 0;
  let maxConsecutiveOvertime = 0;
  let currentOvertime = false;
  let lastHour = 0;

  for (const entry of log) {
    if (entry.code === "decision.overtimeAuthorized.set") {
      const auth = entry.data["authorized"] === 1;
      if (currentOvertime) {
        consecutiveOvertimeHours += entry.hour - lastHour;
        maxConsecutiveOvertime = Math.max(maxConsecutiveOvertime, consecutiveOvertimeHours);
      }
      currentOvertime = auth;
      lastHour = entry.hour;
      if (!auth) consecutiveOvertimeHours = 0;
    }
  }
  if (currentOvertime) {
    consecutiveOvertimeHours += finalState.hour - lastHour;
    maxConsecutiveOvertime = Math.max(maxConsecutiveOvertime, consecutiveOvertimeHours);
  }

  if (maxConsecutiveOvertime <= 48) {
    score += 3;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: 3,
      reason: "scoring.welfare.overtimeWithinBounds",
      depth: "all",
    });
  } else {
    // Pro-rate penalty: deduct 1 per living crew member up to 3
    const penalty = Math.min(3, living.length);
    const award = Math.max(0, 3 - penalty);
    score += award;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: award - 3,
      reason: "scoring.welfare.overtimeExceededDeduction",
      depth: "specialist",
    });
  }

  // 3. No crew member entering 'impaired' state from a PREVENTABLE cause: 3 pts
  // Preventable = caused by player planning decision (e.g. extreme rationing, excessive overtime)
  const preventableImpairment = finalState.crew.some(
    (c) => c.fatigueFraction >= 0.5 && maxConsecutiveOvertime > 48,
  );
  if (!preventableImpairment) {
    score += 3;
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: 3,
      reason: "scoring.welfare.noPreventableImpairment",
      depth: "all",
    });
  } else {
    events.push({
      sol: solOf(finalState.hour),
      hour: finalState.hour,
      delta: 0,
      reason: "scoring.welfare.preventableImpairmentOccurred",
      depth: "specialist",
    });
  }

  const finalScore = Math.max(0, round1(score));
  return { score: finalScore, events };
}

// ---------------------------------------------------------------------------
// Highlighted Decisions Selection
// ---------------------------------------------------------------------------

function findHighlightedDecisions(
  components: readonly ScoreComponent[],
  log: readonly LogEntry[],
): { bestDecision: HighlightedDecision; costliestDecision: HighlightedDecision } {
  // 1. bestDecision: highest positive delta in 'decision' component
  const decisionComponent = components.find((c) => c.id === "decision");
  const positiveDecisionEvents = (decisionComponent?.events ?? []).filter((e) => e.delta > 0);
  positiveDecisionEvents.sort((a, b) => b.delta - a.delta);

  let bestDecision: HighlightedDecision;
  if (positiveDecisionEvents.length > 0) {
    const bestEvent = positiveDecisionEvents[0]!;
    bestDecision = {
      sol: bestEvent.sol,
      station: "incidentCommand",
      chosenOption: "mitigate",
      alternativeOption: "default",
      netEffect: bestEvent.delta,
      explanation: bestEvent.reason,
    };
  } else {
    bestDecision = {
      sol: 1,
      station: "incidentCommand",
      chosenOption: "nominal",
      alternativeOption: "none",
      netEffect: 0,
      explanation: "scoring.decision.nominalOperations",
    };
  }

  // 2. costliestDecision: lowest (most negative) delta across ALL components,
  // linked to a player action (must have causalEventId)
  const allEvents = components.flatMap((c) => c.events);
  const negativePlayerEvents = allEvents.filter(
    (e) => e.delta < 0 && e.causalEventId !== undefined,
  );

  // If tied, prefer the event with the longest downstream causal chain in the log
  function causalChainLength(parentId?: string): number {
    if (!parentId) return 0;
    return log.filter((e) => e.causedBy?.includes(parentId)).length;
  }

  negativePlayerEvents.sort((a, b) => {
    if (a.delta !== b.delta) return a.delta - b.delta; // lowest first
    return causalChainLength(b.causalEventId) - causalChainLength(a.causalEventId);
  });

  let costliestDecision: HighlightedDecision;
  if (negativePlayerEvents.length > 0) {
    const worstEvent = negativePlayerEvents[0]!;
    costliestDecision = {
      sol: worstEvent.sol,
      station: "incidentCommand",
      chosenOption: "default",
      alternativeOption: "mitigate",
      netEffect: worstEvent.delta,
      explanation: worstEvent.reason,
    };
  } else {
    costliestDecision = {
      sol: 1,
      station: "incidentCommand",
      chosenOption: "nominal",
      alternativeOption: "none",
      netEffect: 0,
      explanation: "scoring.decision.noCostlyErrors",
    };
  }

  return { bestDecision, costliestDecision };
}

// ---------------------------------------------------------------------------
// Percentile & Comparison
// ---------------------------------------------------------------------------

function computePercentile(
  total: number,
  scenario: Scenario,
  difficulty: MissionDifficulty,
  baselines?: BotBaselines,
): {
  percentile: number;
  baselineComparison: {
    prudentBotMedian: number;
    greedyBotMedian: number;
    idleBotMedian: number;
  };
} {
  const bucketKey = `${scenario.id}:${difficulty}`;
  const distribution = baselines?.distributions?.[bucketKey];
  const medians = baselines?.medians?.[bucketKey] ?? {
    prudentBotMedian: 78,
    greedyBotMedian: 62,
    idleBotMedian: 22,
  };

  let percentile = 50;
  if (distribution && distribution.length > 0) {
    const belowCount = distribution.filter((score) => score < total).length;
    percentile = Math.round((belowCount / distribution.length) * 100);
  } else {
    // Estimate percentile based on bot medians
    if (total >= medians.prudentBotMedian) percentile = 85;
    else if (total >= medians.greedyBotMedian) percentile = 55;
    else if (total >= medians.idleBotMedian) percentile = 25;
    else percentile = 10;
  }

  return { percentile, baselineComparison: medians };
}

// ---------------------------------------------------------------------------
// Main Scoring Engine Entry Point (M9.4)
// ---------------------------------------------------------------------------

/**
 * Evaluates a complete mission run and produces a deterministic MissionScore.
 *
 * @param log Full chronological event log from SimState.log
 * @param finalState The terminal SimState at run completion
 * @param scenario The Scenario definition
 * @param difficulty The chosen MissionDifficulty
 * @param baselines Optional precomputed bot baseline scores for percentile lookup
 */
export function scoreMission(
  log: readonly LogEntry[],
  finalState: SimState,
  scenario: Scenario,
  difficulty: MissionDifficulty,
  baselines?: BotBaselines,
): MissionScore {
  // 1. Outcome (30 pts)
  const outcomeResult = evaluateOutcome(finalState, scenario);
  const outcomeComponent: ScoreComponent = {
    id: "outcome",
    label: "scoring.component.outcome",
    score: outcomeResult.score,
    maxScore: 30,
    events: outcomeResult.events,
  };

  // 2. Safety Margin (25 pts)
  const marginResult = evaluateSafetyMargin(log, finalState);
  const marginComponent: ScoreComponent = {
    id: "margin",
    label: "scoring.component.margin",
    score: marginResult.score,
    maxScore: 25,
    events: marginResult.events,
  };

  // 3. Decision Quality (25 pts)
  const decisionResult = evaluateDecisionQuality(log, finalState);
  const decisionComponent: ScoreComponent = {
    id: "decision",
    label: "scoring.component.decision",
    score: decisionResult.score,
    maxScore: 25,
    events: decisionResult.events,
  };

  // 4. Resource Efficiency (10 pts)
  const efficiencyResult = evaluateResourceEfficiency(log, finalState, scenario);
  const efficiencyComponent: ScoreComponent = {
    id: "efficiency",
    label: "scoring.component.efficiency",
    score: efficiencyResult.score,
    maxScore: 10,
    events: efficiencyResult.events,
  };

  // 5. Crew Welfare (10 pts)
  const welfareResult = evaluateCrewWelfare(log, finalState);
  const welfareComponent: ScoreComponent = {
    id: "welfare",
    label: "scoring.component.welfare",
    score: welfareResult.score,
    maxScore: 10,
    events: welfareResult.events,
  };

  const components: readonly ScoreComponent[] = [
    outcomeComponent,
    marginComponent,
    decisionComponent,
    efficiencyComponent,
    welfareComponent,
  ];

  const total = round1(
    outcomeComponent.score +
      marginComponent.score +
      decisionComponent.score +
      efficiencyComponent.score +
      welfareComponent.score,
  );

  const grade = calculateGrade(total, finalState.status);
  const { bestDecision, costliestDecision } = findHighlightedDecisions(components, log);
  const { percentile, baselineComparison } = computePercentile(
    total,
    scenario,
    difficulty,
    baselines,
  );

  const isCrisisReplay = scenario.id.startsWith("crisis-");

  return {
    total,
    grade,
    components,
    bestDecision,
    costliestDecision,
    percentile,
    baselineComparison,
    isCrisisReplay,
  };
}

// ---------------------------------------------------------------------------
// Crisis Replay Scoring Engine (M9.4)
// ---------------------------------------------------------------------------

/**
 * Evaluates a historical Crisis Replay and produces a ScenarioCrisisScore.
 *
 * Components:
 * - Resolution speed (40): 40 * (1 - playerMinutes / (crisisMaxDurationHours * 60))
 * - Peak hazard (30): 30 * (1 - playerPeakMetric / lethalThreshold)
 * - Resources conserved (20): 20 * (sparesRemaining / sparesAtOnset)
 * - Crew condition (10): all nominal = 10, one impaired = 6, one critical = 2, any lost = 0
 */
export function scoreCrisisReplay(
  log: readonly LogEntry[],
  finalState: SimState,
  scenario: Scenario,
): ScenarioCrisisScore {
  const isCrisis = isCrisisScenario(scenario);
  const crisisScenario = isCrisis ? (scenario as CrisisScenario) : undefined;
  const maxDurationHours = crisisScenario?.crisisMaxDurationHours ?? scenario.durationHours;

  // 1. Resolution speed (40 pts)
  const playerMinutes = finalState.hour * 60;
  const maxMinutes = maxDurationHours * 60;
  let speedScore = 0;
  if (playerMinutes < maxMinutes) {
    speedScore = Math.max(0, round1(40 * (1 - playerMinutes / maxMinutes)));
  }

  // 2. Peak hazard (30 pts)
  let hazardScore = 0;
  let peakMetricStr = "";
  if (scenario.id === "crisis-apollo13-co2") {
    const lethalThreshold = 30.4; // mmHg
    const co2Values = [
      finalState.atmosphere.co2PartialPressureMmHg,
      ...log.map((e) => (typeof e.data["co2MmHg"] === "number" ? e.data["co2MmHg"] : 0)),
    ];
    const peakCO2 = Math.max(...co2Values);
    hazardScore = Math.max(0, round1(30 * (1 - peakCO2 / lethalThreshold)));
    peakMetricStr = `${round1(peakCO2)} mmHg`;
  } else if (scenario.id === "crisis-spe-1972") {
    const lethalThreshold = 3000; // mGy / mSv
    const doses = finalState.crew.map((c) => Math.max(c.eventDoseMSv, c.cumulativeDoseMSv));
    const peakDose = Math.max(0, ...doses);
    hazardScore = Math.max(0, round1(30 * (1 - peakDose / lethalThreshold)));
    peakMetricStr = `${Math.round(peakDose)} mSv`;
  } else {
    // crisis-mir-fire or general
    const hasExtinguishers = finalState.safetyConsumables.fireExtinguishers > 0;
    hazardScore = hasExtinguishers ? 30 : 15;
    peakMetricStr = hasExtinguishers ? "Contained" : "Extinguishers Exhausted";
  }

  // 3. Resources conserved (20 pts)
  const sparesAtOnset = scenario.systems.reduce((sum, s) => sum + s.spares, 0);
  const sparesRemaining = Object.values(finalState.systems).reduce(
    (sum, s) => sum + (s?.spares ?? 0),
    0,
  );
  let resourcesScore = 0;
  if (sparesAtOnset > 0) {
    resourcesScore = Math.max(0, Math.min(20, round1(20 * (sparesRemaining / sparesAtOnset))));
  } else {
    resourcesScore = 0;
  }

  // 4. Crew condition (10 pts)
  const conditions = finalState.crew.map((c) => crewCondition(c));
  let crewScore = 10;
  if (conditions.includes("lost")) {
    crewScore = 0;
  } else if (conditions.includes("critical")) {
    crewScore = 2;
  } else if (conditions.includes("impaired")) {
    crewScore = 6;
  } else {
    crewScore = 10;
  }

  const components: CrisisScoreComponent[] = [
    {
      id: "speed",
      label: "scoring.crisis.speed",
      score: speedScore,
      maxScore: 40,
      detail: `${finalState.hour}h elapsed / ${maxDurationHours}h limit`,
    },
    {
      id: "hazard",
      label: "scoring.crisis.hazard",
      score: hazardScore,
      maxScore: 30,
      detail: `Peak hazard: ${peakMetricStr}`,
    },
    {
      id: "resources",
      label: "scoring.crisis.resources",
      score: resourcesScore,
      maxScore: 20,
      detail: `${sparesRemaining} / ${sparesAtOnset} spares remaining`,
    },
    {
      id: "crew",
      label: "scoring.crisis.crew",
      score: crewScore,
      maxScore: 10,
      detail: `Worst crew condition: ${
        conditions.includes("lost")
          ? "Lost"
          : conditions.includes("critical")
            ? "Critical"
            : conditions.includes("impaired")
              ? "Impaired"
              : "Nominal"
      }`,
    },
  ];

  const total = round1(speedScore + hazardScore + resourcesScore + crewScore);
  const grade = calculateGrade(total, finalState.status);

  // Historical comparison
  let historicalComparison: CrisisHistoricalComparison;
  if (crisisScenario?.historicalOutcome) {
    const ho = crisisScenario.historicalOutcome;
    const playerVal = ho.keyMetric.playerValue(finalState);
    historicalComparison = {
      keyMetricLabel: ho.keyMetric.label,
      playerValue: `${playerVal} ${ho.keyMetric.unit}`,
      historicalValue: `${ho.keyMetric.historicalValue} ${ho.keyMetric.unit}`,
      historicalContext: ho.resolution,
    };
  } else {
    historicalComparison = {
      keyMetricLabel: "Peak Hazard",
      playerValue: peakMetricStr,
      historicalValue: "Historical Benchmark",
      historicalContext: "Historical Apollo / Mir mission data",
    };
  }

  return {
    total,
    grade,
    components,
    historicalComparison,
    scenarioId: scenario.id,
  };
}
