import type { Agent, BehaviorWeights, Policy } from '@/types';
import type { RNG } from './random';
import { clamp } from './mathUtils';
import { FLIGHT_TICKS } from './constants';

export function effectiveTaxSensitivity(agent: Agent, weights: BehaviorWeights): number {
  return agent.taxSensitivity * (0.5 + weights.avgTaxSensitivity);
}

/** Higher riskAversion lowers effective risk-taking: multiplier = 1.5 - riskAversion. */
export function effectiveRiskTolerance(agent: Agent, weights: BehaviorWeights): number {
  return agent.riskTolerance * (1.5 - weights.riskAversion);
}

export function writeOffFactorFor(agent: Agent, weights: BehaviorWeights, writeOffBase: number): number {
  return clamp(writeOffBase + effectiveRiskTolerance(agent, weights) * 0.15, 0, 0.4);
}

export function decideEvasion(
  agent: Agent,
  marginalRate: number,
  policy: Policy,
  weights: BehaviorWeights,
  rng: RNG,
): boolean {
  if (agent.complianceStatus !== 'compliant') return false;
  const riskTolerance = effectiveRiskTolerance(agent, weights);
  const pEvasion = clamp(
    0.01 + Math.max(0, marginalRate - 0.25) * 1.5 * riskTolerance - policy.auditBudgetPct * 0.6,
    0,
    0.35,
  );
  if (rng() < pEvasion) {
    agent.complianceStatus = 'evading';
    agent.evasionFraction = 0.2 + rng() * 0.4;
    return true;
  }
  return false;
}

const AI_SHIELD_CAP = 0.5;

export function decideAiShield(agent: Agent, combinedAiRate: number, weights: BehaviorWeights, rng: RNG): boolean {
  if (agent.aiExposure <= 0 || combinedAiRate <= 0) return false;
  if (agent.aiShieldFraction >= AI_SHIELD_CAP) return false;
  const riskTolerance = effectiveRiskTolerance(agent, weights);
  const pRestructure = clamp(combinedAiRate * riskTolerance * 1.2, 0, 0.3);
  if (rng() < pRestructure) {
    agent.aiShieldFraction = Math.min(AI_SHIELD_CAP, agent.aiShieldFraction + 0.05 + rng() * 0.1);
    return true;
  }
  return false;
}

export function decideCapitalFlight(
  agent: Agent,
  marginalRate: number,
  policy: Policy,
  weights: BehaviorWeights,
  rng: RNG,
): boolean {
  if (!agent.isActiveInEconomy || agent.flightProgress > 0) return false;
  const equityCaptureRate = policy.aiTaxMechanisms.equityCapture.enabled
    ? policy.aiTaxMechanisms.equityCapture.rate
    : 0;
  const blendedRate =
    marginalRate * 0.5 + policy.capitalGainsRate * 0.5 + agent.aiExposure * equityCaptureRate * 0.5;
  const pressure = Math.max(0, blendedRate - 0.3);
  const taxSensitivity = effectiveTaxSensitivity(agent, weights);
  const pFlight = clamp(pressure * taxSensitivity * 2, 0, 0.08);
  if (rng() < pFlight) {
    agent.flightProgress = 1 / FLIGHT_TICKS;
    return true;
  }
  return false;
}
