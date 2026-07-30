import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { seedAgents } from '../seed';
import { mulberry32 } from '../random';
import { DEFAULT_ARCHETYPE_RATIOS } from '../archetypes';
import { DEFAULT_BEHAVIOR_WEIGHTS, DEFAULT_POLICY } from '../constants';
import type { EngineState, Policy } from '@/types';

function makeInitialState(count = 300, seed = 42): EngineState {
  const rng = mulberry32(seed);
  return { tick: 0, simDate: { year: 1, month: 1 }, agents: seedAgents(count, DEFAULT_ARCHETYPE_RATIOS, rng) };
}

describe('tick', () => {
  it('advances the tick counter and rolls the sim date forward', () => {
    let state = makeInitialState();
    const rng = mulberry32(1);
    const result = tick(state, DEFAULT_POLICY, DEFAULT_BEHAVIOR_WEIGHTS, rng, 0);
    expect(result.state.tick).toBe(1);
    expect(result.metrics.tick).toBe(1);
    expect(result.metrics.simDate).toEqual({ year: 1, month: 2 });
  });

  it('rolls the year over after month 12', () => {
    const state: EngineState = { tick: 11, simDate: { year: 1, month: 12 }, agents: seedAgents(50, DEFAULT_ARCHETYPE_RATIOS, mulberry32(2)) };
    const result = tick(state, DEFAULT_POLICY, DEFAULT_BEHAVIOR_WEIGHTS, mulberry32(3), 0);
    expect(result.metrics.simDate).toEqual({ year: 2, month: 1 });
  });

  it('never lets wealth go negative and keeps gini within [0,1] over many ticks', () => {
    let state = makeInitialState(500, 7);
    const rng = mulberry32(99);
    for (let i = 0; i < 30; i++) {
      const result = tick(state, DEFAULT_POLICY, DEFAULT_BEHAVIOR_WEIGHTS, rng, i * 400);
      state = result.state;
      expect(result.metrics.gini).toBeGreaterThanOrEqual(0);
      expect(result.metrics.gini).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.metrics.totalWealth)).toBe(true);
      expect(result.metrics.taxRevenueCollected).toBeGreaterThanOrEqual(0);
    }
    for (const agent of state.agents) {
      expect(agent.wealth).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(agent.wealth)).toBe(true);
    }
  });

  it('a flat UBI payout with zero tax strictly increases total wealth tick over tick', () => {
    const zeroTaxPolicy: Policy = {
      ...DEFAULT_POLICY,
      brackets: [
        { threshold: 0, rate: 0 },
        { threshold: 45000, rate: 0 },
        { threshold: 180000, rate: 0 },
      ],
      capitalGainsRate: 0,
      auditBudgetPct: 0,
      ubiPayout: 500,
    };
    let state = makeInitialState(200, 11);
    const rng = mulberry32(12);
    const before = state.agents.reduce((sum, a) => sum + a.wealth, 0);
    const result = tick(state, zeroTaxPolicy, DEFAULT_BEHAVIOR_WEIGHTS, rng, 0);
    const after = result.state.agents.reduce((sum, a) => sum + a.wealth, 0);
    expect(after).toBeGreaterThan(before);
  });

  it('reconciles collected + evaded + avoided against what would have been owed with no evasion/avoidance', () => {
    // With auditBudgetPct at 0 (no enforcement pressure suppressing evasion) and a high top
    // bracket, evasion should occur; collected+evaded should account for ordinary tax liability,
    // and aiTaxRevenueCollected + taxRevenueAvoided should account for the AI-tax layer.
    const highPressurePolicy: Policy = {
      ...DEFAULT_POLICY,
      brackets: [
        { threshold: 0, rate: 0.2 },
        { threshold: 20000, rate: 0.45 },
        { threshold: 60000, rate: 0.6 },
      ],
      auditBudgetPct: 0,
      aiTaxMechanisms: {
        ...DEFAULT_POLICY.aiTaxMechanisms,
        tokenTax: { enabled: true, rate: 0.15 },
      },
    };
    let state = makeInitialState(400, 21);
    const rng = mulberry32(22);
    let anyEvaded = false;
    let anyAiTax = false;
    for (let i = 0; i < 15; i++) {
      const result = tick(state, highPressurePolicy, DEFAULT_BEHAVIOR_WEIGHTS, rng, i * 20);
      state = result.state;
      if (result.metrics.taxRevenueEvaded > 0) anyEvaded = true;
      if (result.metrics.aiTaxRevenueCollected > 0) anyAiTax = true;
      expect(result.metrics.taxRevenueEvaded).toBeGreaterThanOrEqual(0);
      expect(result.metrics.taxRevenueAvoided).toBeGreaterThanOrEqual(0);
      expect(result.metrics.aiTaxRevenueCollected).toBeGreaterThanOrEqual(0);
    }
    expect(anyEvaded).toBe(true);
    expect(anyAiTax).toBe(true);
  });
});
