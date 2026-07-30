import { beforeEach, describe, expect, it } from 'vitest';
import { useSimStore } from '../useSimStore';
import { engineRunner } from '../engineBridge';

describe('useSimStore + engineRunner (headless, no React/canvas)', () => {
  beforeEach(() => {
    useSimStore.getState().reset();
  });

  it('seeds a default population accessible through the engine runner', () => {
    const agents = engineRunner.getAgentsRef();
    expect(agents.length).toBe(useSimStore.getState().agentCountConfig);
    expect(agents[0].id).toBe('agent-0');
  });

  it('step() advances the tick and appends to metricsHistory without a render loop running', () => {
    useSimStore.getState().step();
    const state = useSimStore.getState();
    expect(state.tick).toBe(1);
    expect(state.metricsHistory).toHaveLength(1);
    expect(state.metricsHistory[0].tick).toBe(1);
  });

  it('reset() reproduces an identical population given the same fixed seed', () => {
    useSimStore.getState().step();
    useSimStore.getState().step();
    const wealthAfterTicks = engineRunner.getAgentsRef()[0].wealth;

    useSimStore.getState().reset();
    const wealthAfterReset = engineRunner.getAgentsRef()[0].wealth;

    useSimStore.getState().step();
    useSimStore.getState().step();
    const wealthAfterReplay = engineRunner.getAgentsRef()[0].wealth;

    expect(wealthAfterReplay).toBeCloseTo(wealthAfterTicks, 6);
    expect(wealthAfterReset).not.toBeCloseTo(wealthAfterTicks, 6);
  });

  it('selectAgent() populates selectedAgentSnapshot from the live engine state', () => {
    const firstAgentId = engineRunner.getAgentsRef()[0].id;
    useSimStore.getState().selectAgent(firstAgentId);
    expect(useSimStore.getState().selectedAgentSnapshot?.id).toBe(firstAgentId);

    useSimStore.getState().step();
    // engineRunner emits an updated snapshot on every tick while an agent is selected.
    expect(useSimStore.getState().selectedAgentSnapshot?.history.length).toBeGreaterThan(0);
  });

  it('setPolicy pushes changes into the engine without needing a restart', () => {
    useSimStore.getState().setPolicy({ auditBudgetPct: 0.1 });
    expect(useSimStore.getState().policy.auditBudgetPct).toBe(0.1);
  });

  it('setUbi updates only the targeted field', () => {
    useSimStore.getState().setUbi({ enabled: true });
    expect(useSimStore.getState().policy.ubi.enabled).toBe(true);
    expect(useSimStore.getState().policy.ubi.taperStrength).toBe(0);
    useSimStore.getState().setUbi({ taperStrength: 0.7 });
    expect(useSimStore.getState().policy.ubi).toEqual({ enabled: true, taperStrength: 0.7 });
  });

  it('setAiTaxMechanism updates only the targeted mechanism', () => {
    useSimStore.getState().setAiTaxMechanism('tokenTax', { enabled: true, rate: 0.2 });
    const policy = useSimStore.getState().policy;
    expect(policy.aiTaxMechanisms.tokenTax).toEqual({ enabled: true, rate: 0.2 });
    expect(policy.aiTaxMechanisms.energyTax.enabled).toBe(false);
  });

  it('setArchetypeRatio renormalizes the remaining archetypes to keep the total at 1', () => {
    useSimStore.getState().setArchetypeRatio('HNW_Investor', 0.5);
    const ratios = useSimStore.getState().archetypeRatios;
    const total = Object.values(ratios).reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(ratios.HNW_Investor).toBeCloseTo(0.5, 6);
  });
});
