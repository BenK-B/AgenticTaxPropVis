import type { BehaviorWeights, EngineState, MetricsSnapshot, Policy } from '@/types';
import type { RNG } from './random';
import { gaussian } from './random';
import { ARCHETYPE_CONFIGS } from './archetypes';
import { calculateBracketTax, calculateBusinessAiTax, calculateEquityCaptureTax, marginalRateFor } from './tax';
import { decideAiShield, decideCapitalFlight, decideEvasion, writeOffFactorFor } from './behavior';
import { runAudits } from './audit';
import { computeTargetPosition } from './position';
import { computeCapitalFlightRate, computeGini } from './metrics';
import {
  aiShieldLog,
  auditCaughtLog,
  auditClearLog,
  evasionLog,
  flightLog,
  writeOffLog,
} from './logMessages';
import {
  BEHAVIOR_LOG_LENGTH,
  FLASH_COLOR_CRITICAL,
  FLASH_COLOR_GOOD,
  FLASH_COLOR_NEUTRAL,
  FLASH_GREEN_MS,
  FLASH_NEUTRAL_MS,
  FLASH_RED_MS,
  FLIGHT_TICKS,
  HISTORY_LENGTH,
} from './constants';

function pushRingBuffer<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

export interface TickResult {
  state: EngineState;
  metrics: MetricsSnapshot;
}

/**
 * Advances the simulation by exactly one tick (1 sim month). Mutates state.agents in place
 * (same array/object references) to avoid per-tick allocation churn at 2,500-5,000 agents.
 * `nowMs` is a performance.now()-space timestamp used only to schedule flash animations that
 * the renderer reads independently, every frame.
 */
export function tick(state: EngineState, policy: Policy, weights: BehaviorWeights, rng: RNG, nowMs: number): TickResult {
  const { agents } = state;
  const nextTickNumber = state.tick + 1;

  // Resolve last tick's transient 'audited' status back to compliant before this tick runs.
  for (const agent of agents) {
    if (agent.complianceStatus === 'audited') agent.complianceStatus = 'compliant';
  }

  // Wealth percentile (for position targeting) computed once from wealth at the start of the
  // tick. Iterating this sorted copy directly for the main loop (rather than a separate
  // id->percentile Map) avoids allocating ~2,500 Map entries every tick purely for a lookup
  // the loop can get for free from its own index.
  const sortedByWealth = [...agents].sort((a, b) => a.wealth - b.wealth);
  const n = agents.length;

  let taxRevenueCollected = 0;
  let taxRevenueEvaded = 0;
  let taxRevenueAvoided = 0;
  let aiTaxRevenueCollected = 0;
  const evadedTaxThisTick = new Map<string, number>();

  for (let i = 0; i < sortedByWealth.length; i++) {
    const agent = sortedByWealth[i];
    if (!agent.isActiveInEconomy) continue;
    const wealthPercentile = n > 1 ? i / (n - 1) : 0.5;
    const config = ARCHETYPE_CONFIGS[agent.archetype];

    // 1. Income generation.
    const growthFactor = 1 + gaussian(rng, 0, 0.01);
    const monthlyIncome = (agent.income / 12) * growthFactor;
    agent.income *= growthFactor;

    const capitalReturn = config.capitalReturnMonthly
      ? agent.wealth * gaussian(rng, config.capitalReturnMonthly.mean, config.capitalReturnMonthly.stdev)
      : 0;

    // 2. Write-offs (Business_Owner only).
    let taxableIncome = monthlyIncome;
    if (agent.archetype === 'Business_Owner' && config.writeOffBase !== undefined) {
      const writeOffFactor = writeOffFactorFor(agent, weights, config.writeOffBase);
      taxableIncome = monthlyIncome * (1 - writeOffFactor);
      if (writeOffFactor > 0.3) {
        pushRingBuffer(agent.behaviorLog, writeOffLog(nextTickNumber, writeOffFactor), BEHAVIOR_LOG_LENGTH);
      }
    }

    // 3. Tax calculation.
    const marginalRate = marginalRateFor(taxableIncome, policy.brackets);
    const grossIncomeTax = calculateBracketTax(taxableIncome, policy.brackets);
    const grossCapGainsTax = Math.max(0, capitalReturn) * policy.capitalGainsRate;

    const isEvading = agent.complianceStatus === 'evading';
    const incomeTaxPaid = isEvading ? grossIncomeTax * (1 - agent.evasionFraction) : grossIncomeTax;
    const capGainsTaxPaid = isEvading ? grossCapGainsTax * (1 - agent.evasionFraction) : grossCapGainsTax;
    const evadedThisTick = isEvading ? grossIncomeTax - incomeTaxPaid + (grossCapGainsTax - capGainsTaxPaid) : 0;
    if (evadedThisTick > 0) evadedTaxThisTick.set(agent.id, evadedThisTick);

    let aiTaxOwed = 0;
    let aiTaxAvoided = 0;
    let combinedAiRate = 0;
    if (agent.archetype === 'Business_Owner') {
      const result = calculateBusinessAiTax(monthlyIncome, agent.aiExposure, agent.aiShieldFraction, policy.aiTaxMechanisms);
      aiTaxOwed = result.owed;
      aiTaxAvoided = result.shieldedOwed;
      combinedAiRate = result.combinedRate;
    } else if (agent.archetype === 'HNW_Investor') {
      const result = calculateEquityCaptureTax(capitalReturn, agent.aiExposure, agent.aiShieldFraction, policy.aiTaxMechanisms);
      aiTaxOwed = result.owed;
      aiTaxAvoided = result.shieldedOwed;
      combinedAiRate = result.combinedRate;
    }

    const taxPaid = incomeTaxPaid + capGainsTaxPaid + aiTaxOwed;
    taxRevenueCollected += taxPaid;
    taxRevenueEvaded += evadedThisTick;
    taxRevenueAvoided += aiTaxAvoided;
    aiTaxRevenueCollected += aiTaxOwed;

    // 4. Behavioral decisions.
    if (decideEvasion(agent, marginalRate, policy, weights, rng)) {
      pushRingBuffer(agent.behaviorLog, evasionLog(nextTickNumber, agent.evasionFraction, marginalRate), BEHAVIOR_LOG_LENGTH);
    }
    if ((agent.archetype === 'Business_Owner' || agent.archetype === 'HNW_Investor') && combinedAiRate > 0) {
      if (decideAiShield(agent, combinedAiRate, weights, rng)) {
        pushRingBuffer(agent.behaviorLog, aiShieldLog(nextTickNumber, combinedAiRate, agent.aiShieldFraction), BEHAVIOR_LOG_LENGTH);
      }
    }
    if (config.flightEligible) {
      if (decideCapitalFlight(agent, marginalRate, policy, weights, rng)) {
        pushRingBuffer(agent.behaviorLog, flightLog(nextTickNumber, marginalRate, policy.capitalGainsRate), BEHAVIOR_LOG_LENGTH);
      } else if (agent.flightProgress > 0 && agent.flightProgress < 1) {
        agent.flightProgress = Math.min(1, agent.flightProgress + 1 / FLIGHT_TICKS);
        if (agent.flightProgress >= 1) agent.isActiveInEconomy = false;
      }
    }

    // 6. Target position update (actual interpolation happens every render frame, not here).
    computeTargetPosition(agent, wealthPercentile);

    // 8-9. UBI + wealth settle (floored at 0).
    agent.wealth = Math.max(0, agent.wealth + monthlyIncome + capitalReturn - taxPaid + policy.ubiPayout);

    // 7. History push (ring buffer, max 12).
    pushRingBuffer(agent.history, { tick: nextTickNumber, income: monthlyIncome, taxPaid, wealth: agent.wealth }, HISTORY_LENGTH);

    // Green flash: this agent transacted (earned income, paid tax) this tick.
    agent.flashUntil = nowMs + FLASH_GREEN_MS;
    agent.flashColor = FLASH_COLOR_GOOD;
  }

  // 5. Audit & enforcement, once per tick over the whole active population.
  const auditOutcomes = runAudits(agents, policy, nextTickNumber, evadedTaxThisTick, rng);
  for (const outcome of auditOutcomes) {
    const agent = outcome.agent;
    if (outcome.caught) {
      pushRingBuffer(agent.behaviorLog, auditCaughtLog(nextTickNumber, outcome.fine), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_RED_MS;
      agent.flashColor = FLASH_COLOR_CRITICAL;
    } else if (!outcome.wasEvading) {
      pushRingBuffer(agent.behaviorLog, auditClearLog(nextTickNumber), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_NEUTRAL_MS;
      agent.flashColor = FLASH_COLOR_NEUTRAL;
    }
  }

  // 10. Metrics aggregation.
  const gini = computeGini(agents);
  const capitalFlightRate = computeCapitalFlightRate(agents);
  const totalWealth = agents.reduce((sum, agent) => sum + Math.max(0, agent.wealth), 0);
  const activeAgentCount = agents.reduce((sum, agent) => sum + (agent.isActiveInEconomy ? 1 : 0), 0);

  // 11. Advance tick counter and simDate.
  const month = state.simDate.month === 12 ? 1 : state.simDate.month + 1;
  const year = state.simDate.month === 12 ? state.simDate.year + 1 : state.simDate.year;
  const simDate = { year, month };

  const metrics: MetricsSnapshot = {
    tick: nextTickNumber,
    simDate,
    taxRevenueCollected,
    taxRevenueEvaded,
    taxRevenueAvoided,
    aiTaxRevenueCollected,
    gini,
    capitalFlightRate,
    activeAgentCount,
    totalWealth,
  };

  state.tick = nextTickNumber;
  state.simDate = simDate;

  return { state, metrics };
}
