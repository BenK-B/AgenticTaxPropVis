import { describe, expect, it } from 'vitest';
import {
  decideAiShield,
  decideCapitalFlight,
  decideEvasion,
  effectiveRiskTolerance,
  effectiveTaxSensitivity,
  writeOffFactorFor,
} from '../behavior';
import { DEFAULT_POLICY } from '../constants';
import type { Agent, BehaviorWeights, Policy } from '@/types';

const NEUTRAL_WEIGHTS: BehaviorWeights = { avgTaxSensitivity: 0.5, riskAversion: 0.5 };

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    archetype: 'Freelancer',
    income: 50000,
    wealth: 20000,
    riskTolerance: 0.5,
    taxSensitivity: 0.5,
    complianceStatus: 'compliant',
    evasionFraction: 0,
    isActiveInEconomy: true,
    flightProgress: 0,
    auditCooldownUntil: 0,
    aiExposure: 0.3,
    aiShieldFraction: 0,
    incomeShockMultiplier: 1,
    incomeShockMonthsRemaining: 0,
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    targetPosition: { x: 0.5, y: 0.5 },
    flashUntil: 0,
    flashColor: '',
    history: [],
    behaviorLog: [],
    ...overrides,
  };
}

/** Sequence-based stub RNG so tests can control exactly what each rng() call returns. */
function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('effectiveTaxSensitivity / effectiveRiskTolerance', () => {
  it('midpoint weight (0.5) yields a 1.0 multiplier', () => {
    const agent = makeAgent({ taxSensitivity: 0.6, riskTolerance: 0.4 });
    expect(effectiveTaxSensitivity(agent, NEUTRAL_WEIGHTS)).toBeCloseTo(0.6, 6);
    expect(effectiveRiskTolerance(agent, NEUTRAL_WEIGHTS)).toBeCloseTo(0.4, 6);
  });

  it('higher riskAversion lowers effective risk tolerance', () => {
    const agent = makeAgent({ riskTolerance: 0.4 });
    const cautious = effectiveRiskTolerance(agent, { avgTaxSensitivity: 0.5, riskAversion: 1 });
    const reckless = effectiveRiskTolerance(agent, { avgTaxSensitivity: 0.5, riskAversion: 0 });
    expect(cautious).toBeLessThan(reckless);
  });
});

describe('writeOffFactorFor', () => {
  it('clamps to the 0-0.4 range', () => {
    const highRisk = makeAgent({ riskTolerance: 1 });
    const factor = writeOffFactorFor(highRisk, { avgTaxSensitivity: 0.5, riskAversion: 0 }, 0.12);
    expect(factor).toBeLessThanOrEqual(0.4);
    expect(factor).toBeGreaterThanOrEqual(0);
  });
});

describe('decideEvasion', () => {
  it('triggers when the roll lands under the computed probability', () => {
    const agent = makeAgent({ riskTolerance: 1 });
    const triggered = decideEvasion(agent, 0.5, DEFAULT_POLICY, NEUTRAL_WEIGHTS, stubRng([0.01, 0.3]));
    expect(triggered).toBe(true);
    expect(agent.complianceStatus).toBe('evading');
    expect(agent.evasionFraction).toBeGreaterThanOrEqual(0.2);
    expect(agent.evasionFraction).toBeLessThanOrEqual(0.6);
  });

  it('does not trigger when the roll lands above the computed probability', () => {
    const agent = makeAgent({ riskTolerance: 1 });
    const triggered = decideEvasion(agent, 0.5, DEFAULT_POLICY, NEUTRAL_WEIGHTS, stubRng([0.99]));
    expect(triggered).toBe(false);
    expect(agent.complianceStatus).toBe('compliant');
  });

  it('never re-rolls an agent that is already evading or audited', () => {
    const evading = makeAgent({ complianceStatus: 'evading' });
    expect(decideEvasion(evading, 0.9, DEFAULT_POLICY, NEUTRAL_WEIGHTS, stubRng([0]))).toBe(false);
  });

  it('a higher marginal rate strictly increases evasion probability, all else equal', () => {
    // Compare via two deterministic rolls placed between the low- and high-pressure probabilities.
    const lowPressureAgent = makeAgent({ riskTolerance: 0.9 });
    const highPressureAgent = makeAgent({ riskTolerance: 0.9 });
    const roll = 0.15;
    const lowTriggered = decideEvasion(lowPressureAgent, 0.26, DEFAULT_POLICY, NEUTRAL_WEIGHTS, stubRng([roll]));
    const highTriggered = decideEvasion(highPressureAgent, 0.6, DEFAULT_POLICY, NEUTRAL_WEIGHTS, stubRng([roll]));
    expect(highTriggered).toBe(true);
    expect(lowTriggered).toBe(false);
  });
});

describe('decideAiShield', () => {
  it('does nothing when the agent has no AI exposure', () => {
    const agent = makeAgent({ aiExposure: 0 });
    expect(decideAiShield(agent, 0.3, NEUTRAL_WEIGHTS, stubRng([0]))).toBe(false);
  });

  it('increases aiShieldFraction (capped at 0.5) when triggered', () => {
    const agent = makeAgent({ aiExposure: 0.5, riskTolerance: 1 });
    const triggered = decideAiShield(agent, 0.3, NEUTRAL_WEIGHTS, stubRng([0.01, 0.5]));
    expect(triggered).toBe(true);
    expect(agent.aiShieldFraction).toBeGreaterThan(0);
    expect(agent.aiShieldFraction).toBeLessThanOrEqual(0.5);
  });

  it('stops triggering once the shield cap is reached', () => {
    const agent = makeAgent({ aiExposure: 0.5, riskTolerance: 1, aiShieldFraction: 0.5 });
    expect(decideAiShield(agent, 0.3, NEUTRAL_WEIGHTS, stubRng([0]))).toBe(false);
  });
});

describe('decideCapitalFlight', () => {
  const flightPolicy: Policy = {
    ...DEFAULT_POLICY,
    capitalGainsRate: 0.2,
    aiTaxMechanisms: {
      ...DEFAULT_POLICY.aiTaxMechanisms,
      equityCapture: { enabled: true, rate: 0.3, annualLiquidationPct: 0.08 },
    },
  };

  it('is more likely for AI-exposed investors once equity capture is enabled', () => {
    // Chosen so unexposed pressure sits below the 0.3 floor (pFlight = 0) while exposed
    // pressure clears it — isolating the aiExposure*equityCapture term's effect.
    const exposedAgent = makeAgent({ archetype: 'HNW_Investor', aiExposure: 0.9, taxSensitivity: 1 });
    const unexposedAgent = makeAgent({ archetype: 'HNW_Investor', aiExposure: 0, taxSensitivity: 1 });
    const marginalRate = 0.3;
    const roll = 0.05;
    const exposedTriggered = decideCapitalFlight(exposedAgent, marginalRate, flightPolicy, NEUTRAL_WEIGHTS, stubRng([roll]));
    const unexposedTriggered = decideCapitalFlight(unexposedAgent, marginalRate, flightPolicy, NEUTRAL_WEIGHTS, stubRng([roll]));
    expect(exposedTriggered).toBe(true);
    expect(unexposedTriggered).toBe(false);
  });

  it('does not re-roll an agent that is already mid-flight', () => {
    const agent = makeAgent({ archetype: 'HNW_Investor', flightProgress: 0.3 });
    expect(decideCapitalFlight(agent, 0.9, flightPolicy, NEUTRAL_WEIGHTS, stubRng([0]))).toBe(false);
  });
});
