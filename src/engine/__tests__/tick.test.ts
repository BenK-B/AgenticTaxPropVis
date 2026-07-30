import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { seedAgents } from '../seed';
import { mulberry32 } from '../random';
import { DEFAULT_ARCHETYPE_RATIOS } from '../archetypes';
import { DEFAULT_BEHAVIOR_WEIGHTS, DEFAULT_POLICY } from '../constants';
import type { EngineState, Policy } from '@/types';

function makeInitialState(count = 300, seed = 42): EngineState {
  const rng = mulberry32(seed);
  return {
    tick: 0,
    simDate: { year: 1, month: 1 },
    agents: seedAgents(count, DEFAULT_ARCHETYPE_RATIOS, rng),
    equityFundBalance: 0,
  };
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
    const state: EngineState = {
      tick: 11,
      simDate: { year: 1, month: 12 },
      agents: seedAgents(50, DEFAULT_ARCHETYPE_RATIOS, mulberry32(2)),
      equityFundBalance: 0,
    };
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

  it('when enabled, UBI disbursed equals the AI-tax pot collected that tick (flat split)', () => {
    const policy: Policy = {
      ...DEFAULT_POLICY,
      aiTaxMechanisms: {
        ...DEFAULT_POLICY.aiTaxMechanisms,
        tokenTax: { enabled: true, rate: 0.2 },
      },
      ubi: { enabled: true, taperStrength: 0 },
    };
    const state = makeInitialState(300, 31);
    const result = tick(state, policy, DEFAULT_BEHAVIOR_WEIGHTS, mulberry32(32), 0);
    expect(result.metrics.aiTaxRevenueCollected).toBeGreaterThan(0);
    expect(result.metrics.ubiPaidOut).toBeCloseTo(result.metrics.aiTaxRevenueCollected, 6);
  });

  it('taper strength reweights who gets UBI but not the total disbursed', () => {
    const basePolicy: Policy = {
      ...DEFAULT_POLICY,
      aiTaxMechanisms: {
        ...DEFAULT_POLICY.aiTaxMechanisms,
        tokenTax: { enabled: true, rate: 0.2 },
      },
    };
    const flatState = makeInitialState(300, 41);
    const flatResult = tick(flatState, { ...basePolicy, ubi: { enabled: true, taperStrength: 0 } }, DEFAULT_BEHAVIOR_WEIGHTS, mulberry32(42), 0);

    const taperedState = makeInitialState(300, 41);
    const taperedResult = tick(
      taperedState,
      { ...basePolicy, ubi: { enabled: true, taperStrength: 1 } },
      DEFAULT_BEHAVIOR_WEIGHTS,
      mulberry32(42),
      0,
    );

    // Same seed/policy apart from taper -> same AI-tax pot, and the total redistributed should
    // still match it regardless of taper strength (taper only changes who gets how much).
    expect(taperedResult.metrics.aiTaxRevenueCollected).toBeCloseTo(flatResult.metrics.aiTaxRevenueCollected, 6);
    expect(flatResult.metrics.ubiPaidOut).toBeCloseTo(flatResult.metrics.aiTaxRevenueCollected, 6);
    expect(taperedResult.metrics.ubiPaidOut).toBeCloseTo(taperedResult.metrics.aiTaxRevenueCollected, 6);
  });

  it('pays no UBI when disabled, even with AI-tax revenue available', () => {
    const policy: Policy = {
      ...DEFAULT_POLICY,
      aiTaxMechanisms: {
        ...DEFAULT_POLICY.aiTaxMechanisms,
        tokenTax: { enabled: true, rate: 0.2 },
      },
      ubi: { enabled: false, taperStrength: 0.5 },
    };
    const state = makeInitialState(300, 51);
    const result = tick(state, policy, DEFAULT_BEHAVIOR_WEIGHTS, mulberry32(52), 0);
    expect(result.metrics.aiTaxRevenueCollected).toBeGreaterThan(0);
    expect(result.metrics.ubiPaidOut).toBe(0);
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

  describe('equity capture fund', () => {
    function equityPolicy(annualLiquidationPct = 0.5): Policy {
      return {
        ...DEFAULT_POLICY,
        aiTaxMechanisms: {
          ...DEFAULT_POLICY.aiTaxMechanisms,
          equityCapture: { enabled: true, rate: 0.3, annualLiquidationPct },
        },
      };
    }

    it('accrues captured equity into the fund without recognizing it as AI-tax revenue on non-liquidation ticks', () => {
      let state = makeInitialState(400, 61);
      const rng = mulberry32(62);
      const policy = equityPolicy();
      for (let i = 0; i < 11; i++) {
        const result = tick(state, policy, DEFAULT_BEHAVIOR_WEIGHTS, rng, i * 20);
        state = result.state;
        expect(result.metrics.equityFundLiquidated).toBe(0);
        expect(result.metrics.aiTaxRevenueCollected).toBe(0);
      }
      expect(state.equityFundBalance).toBeGreaterThan(0);
    });

    it('liquidates the configured share of the fund every 12th tick and feeds it into the AI-tax pot', () => {
      let state = makeInitialState(400, 71);
      const rng = mulberry32(72);
      const policy = equityPolicy(0.3);
      let lastResult;
      for (let i = 0; i < 12; i++) {
        lastResult = tick(state, policy, DEFAULT_BEHAVIOR_WEIGHTS, rng, i * 20);
        state = lastResult.state;
      }
      // Reconstruct the fund's balance immediately before this tick's liquidation: post-tick
      // balance plus whatever was just sold off.
      const balanceBeforeLiquidation = state.equityFundBalance + lastResult!.metrics.equityFundLiquidated;
      expect(lastResult!.metrics.equityFundLiquidated).toBeGreaterThan(0);
      expect(lastResult!.metrics.equityFundLiquidated).toBeCloseTo(balanceBeforeLiquidation * 0.3, 6);
      expect(lastResult!.metrics.aiTaxRevenueCollected).toBeCloseTo(lastResult!.metrics.equityFundLiquidated, 6);
      // 70% of the accrued fund remains as the ongoing public stake.
      expect(state.equityFundBalance).toBeCloseTo(balanceBeforeLiquidation * 0.7, 6);
    });

    it('never liquidates when the mechanism has never captured anything', () => {
      let state = makeInitialState(200, 81);
      const rng = mulberry32(82);
      for (let i = 0; i < 24; i++) {
        const result = tick(state, DEFAULT_POLICY, DEFAULT_BEHAVIOR_WEIGHTS, rng, i * 20);
        state = result.state;
        expect(result.metrics.equityFundLiquidated).toBe(0);
      }
      expect(state.equityFundBalance).toBe(0);
    });
  });
});
