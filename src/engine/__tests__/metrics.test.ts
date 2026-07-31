import { describe, expect, it } from 'vitest';
import { computeCapitalFlightRate, computeGini } from '../metrics';
import type { Agent } from '@/types';

function makeAgent(wealth: number, overrides: Partial<Agent> = {}): Agent {
  return {
    id: Math.random().toString(36),
    archetype: 'W2_Worker',
    income: 50000,
    wealth,
    riskTolerance: 0.5,
    taxSensitivity: 0.5,
    complianceStatus: 'compliant',
    evasionFraction: 0,
    isActiveInEconomy: true,
    flightProgress: 0,
    auditCooldownUntil: 0,
    aiExposure: 0,
    costOfLivingAnnual: 30000,
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

describe('computeGini', () => {
  it('is ~0 when wealth is perfectly equal', () => {
    const agents = Array.from({ length: 50 }, () => makeAgent(10000));
    expect(computeGini(agents)).toBeCloseTo(0, 6);
  });

  it('approaches (n-1)/n when one agent holds all the wealth', () => {
    const n = 20;
    const agents = [makeAgent(1_000_000), ...Array.from({ length: n - 1 }, () => makeAgent(0))];
    expect(computeGini(agents)).toBeCloseTo((n - 1) / n, 6);
  });

  it('is 0 for an empty population', () => {
    expect(computeGini([])).toBe(0);
  });

  it('increases as wealth concentrates further', () => {
    const moderate = [makeAgent(5000), makeAgent(5000), makeAgent(10000), makeAgent(20000)];
    const concentrated = [makeAgent(1000), makeAgent(1000), makeAgent(1000), makeAgent(37000)];
    expect(computeGini(concentrated)).toBeGreaterThan(computeGini(moderate));
  });
});

describe('computeCapitalFlightRate', () => {
  it('is 0 when every agent is still active', () => {
    const agents = Array.from({ length: 10 }, () => makeAgent(1000));
    expect(computeCapitalFlightRate(agents)).toBe(0);
  });

  it('reflects the wealth share held by agents who have fully exited', () => {
    const agents = [
      makeAgent(3000, { isActiveInEconomy: false }),
      makeAgent(1000, { isActiveInEconomy: false }),
      makeAgent(6000, { isActiveInEconomy: true }),
    ];
    expect(computeCapitalFlightRate(agents)).toBeCloseTo(0.4, 6);
  });

  it('is 0 when total wealth is 0', () => {
    const agents = [makeAgent(0), makeAgent(0)];
    expect(computeCapitalFlightRate(agents)).toBe(0);
  });
});
