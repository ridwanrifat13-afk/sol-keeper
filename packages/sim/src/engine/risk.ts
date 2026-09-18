/**
 * Reliability as a function of Technology Readiness Level, and the 5x5 risk matrix used by
 * the Launch Packing screen (P2).
 *
 * The teaching point: a lower TRL usually buys better performance per kilogram, and the
 * player pays for it in failure rate and in the contingency mass they must carry.
 */
import { management } from "../data/constants.js";
import { clamp } from "../units.js";

/** Hourly probability that a system with the given TRL suffers a failure. */
export function failureRatePerHour(trl: number): number {
  const level = clamp(Math.round(trl), 1, 9);
  const base = management.trlBaseFailureRatePerHour.value;
  const penalty = management.trlFailureRatePenaltyPerLevel.value;
  return base * Math.pow(penalty, 9 - level);
}

/** Mass contingency fraction required at a given design maturity. */
export type Maturity = "concept" | "design" | "priorBuild" | "fabrication" | "flight";

export function contingencyFraction(maturity: Maturity): number {
  switch (maturity) {
    case "concept":
      return management.contingencyConceptFraction.value;
    case "design":
      return management.contingencyDesignFraction.value;
    case "priorBuild":
      return management.contingencyPriorBuildFraction.value;
    case "fabrication":
      return management.contingencyFabricationFraction.value;
    case "flight":
      return management.contingencyFlightFraction.value;
  }
}

export type ProjectPhase = "phaseA" | "pdr" | "cdr" | "per" | "preShip";

export function requiredMarginFraction(phase: ProjectPhase): number {
  switch (phase) {
    case "phaseA":
      return management.marginPhaseAFraction.value;
    case "pdr":
      return management.marginPdrFraction.value;
    case "cdr":
      return management.marginCdrFraction.value;
    case "per":
      return management.marginPerFraction.value;
    case "preShip":
      return management.marginPreShipFraction.value;
  }
}

/** 5x5 matrix. Likelihood and consequence are each 1-5; the product bands the risk. */
export type RiskBand = "low" | "medium" | "high";

export function riskBand(likelihood: number, consequence: number): RiskBand {
  const l = clamp(Math.round(likelihood), 1, 5);
  const c = clamp(Math.round(consequence), 1, 5);
  const score = l * c;
  if (score >= 15) return "high";
  if (score >= 6) return "medium";
  return "low";
}
