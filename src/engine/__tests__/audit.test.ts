import { describe, expect, it } from 'vitest';
import { runAudits } from '../audit';
import { DEFAULT_POLICY } from '../constants';
import type { Agent, Policy } from '@/types';

function makeAgent(id: string, overrides: Partial<Agent> = {}): Agent {
  return {
    id,
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

/** Always returns 0 so shuffles are stable-ish and every detection roll ("< 0.85") succeeds. */
const alwaysZeroRng = () => 0;

describe('runAudits', () => {
  it('audits no one when auditBudgetPct is 0', () => {
    const agents = Array.from({ length: 20 }, (_, i) => makeAgent(`a${i}`));
    const policy: Policy = { ...DEFAULT_POLICY, auditBudgetPct: 0 };
    const outcomes = runAudits(agents, policy, 1, new Map(), alwaysZeroRng);
    expect(outcomes).toHaveLength(0);
  });

  it('selects roughly auditBudgetPct of the active population', () => {
    const agents = Array.from({ length: 100 }, (_, i) => makeAgent(`a${i}`));
    const policy: Policy = { ...DEFAULT_POLICY, auditBudgetPct: 0.1 };
    const outcomes = runAudits(agents, policy, 1, new Map(), alwaysZeroRng);
    expect(outcomes).toHaveLength(10);
  });

  it('catches and fines an evading agent, resetting compliance and cooldown', () => {
    const evader = makeAgent('evader', { complianceStatus: 'evading', evasionFraction: 0.5, wealth: 10000 });
    const agents = [evader, ...Array.from({ length: 9 }, (_, i) => makeAgent(`clean${i}`))];
    const policy: Policy = { ...DEFAULT_POLICY, auditBudgetPct: 1 };
    const evadedTaxThisTick = new Map([['evader', 1000]]);
    const outcomes = runAudits(agents, policy, 1, evadedTaxThisTick, alwaysZeroRng);

    const evaderOutcome = outcomes.find((o) => o.agentId === 'evader')!;
    expect(evaderOutcome.caught).toBe(true);
    expect(evaderOutcome.fine).toBeCloseTo(1750, 6);
    expect(evader.wealth).toBeCloseTo(10000 - 1750, 6);
    expect(evader.complianceStatus).toBe('audited');
    expect(evader.evasionFraction).toBe(0);
    expect(evader.auditCooldownUntil).toBe(7);
  });

  it('excludes a cooled-down evader from the priority pool', () => {
    // 1 evader still on cooldown + 99 clean agents, budget = 1% -> exactly 1 slot, filled from
    // the general pool since the priority pool is empty (cooldown excludes the only evader).
    const evader = makeAgent('evader', { complianceStatus: 'evading', evasionFraction: 0.5, auditCooldownUntil: 100 });
    const agents = [evader, ...Array.from({ length: 99 }, (_, i) => makeAgent(`clean${i}`))];
    const policy: Policy = { ...DEFAULT_POLICY, auditBudgetPct: 0.01 };
    const evadedTaxThisTick = new Map([['evader', 1000]]);
    const outcomes = runAudits(agents, policy, 1, evadedTaxThisTick, alwaysZeroRng);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].agentId).not.toBe('evader');
    expect(evader.wealth).toBe(20000);
  });

  it('never audits agents who have fully exited the active economy', () => {
    const fled = makeAgent('fled', { isActiveInEconomy: false });
    const agents = [fled, ...Array.from({ length: 9 }, (_, i) => makeAgent(`clean${i}`))];
    const policy: Policy = { ...DEFAULT_POLICY, auditBudgetPct: 1 };
    const outcomes = runAudits(agents, policy, 1, new Map(), alwaysZeroRng);
    expect(outcomes.find((o) => o.agentId === 'fled')).toBeUndefined();
  });
});
