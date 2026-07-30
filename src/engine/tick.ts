import type { Agent, BehaviorWeights, EngineState, MetricsSnapshot, Policy } from '@/types';
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
  EQUITY_FUND_LIQUIDATION_INTERVAL_TICKS,
  FLASH_COLOR_AI_SHIELD,
  FLASH_COLOR_CRITICAL,
  FLASH_COLOR_FLIGHT,
  FLASH_COLOR_NEUTRAL,
  FLASH_COLOR_WARNING,
  FLASH_EVENT_MS,
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
  // Captured equity accrues into the public fund rather than being recognized as revenue the
  // month it's taken (see the equity-fund liquidation block below), so it's tracked separately
  // from aiTaxRevenueCollected until the fund actually sells a slice of it.
  let equityCapturedThisTick = 0;
  let tokensConsumed = 0;
  let kwhConsumed = 0;
  const evadedTaxThisTick = new Map<string, number>();
  // Income per active agent this tick, kept for the UBI taper ranking after the pot is known.
  const activeIncomeRecords: { agent: Agent; monthlyIncome: number; taxPaid: number }[] = [];

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
    let equityCapturedOwed = 0;
    let aiTaxAvoided = 0;
    let combinedAiRate = 0;
    if (agent.archetype === 'Business_Owner') {
      const result = calculateBusinessAiTax(monthlyIncome, agent.aiExposure, agent.aiShieldFraction, policy.aiTaxMechanisms);
      aiTaxOwed = result.owed;
      aiTaxAvoided = result.shieldedOwed;
      combinedAiRate = result.combinedRate;
      tokensConsumed += result.tokensUsed;
      kwhConsumed += result.kwhUsed;
    } else if (agent.archetype === 'HNW_Investor') {
      const result = calculateEquityCaptureTax(capitalReturn, agent.aiExposure, agent.aiShieldFraction, policy.aiTaxMechanisms);
      equityCapturedOwed = result.owed;
      aiTaxAvoided = result.shieldedOwed;
      combinedAiRate = result.combinedRate;
    }

    // Captured equity still leaves the investor's wealth this tick (the stake is transferred
    // out of their portfolio), even though it isn't recognized as revenue/AI-tax-collected until
    // the fund liquidates it — see the equity-fund block after this loop.
    const taxPaid = incomeTaxPaid + capGainsTaxPaid + aiTaxOwed + equityCapturedOwed;
    taxRevenueCollected += incomeTaxPaid + capGainsTaxPaid + aiTaxOwed;
    taxRevenueEvaded += evadedThisTick;
    taxRevenueAvoided += aiTaxAvoided;
    aiTaxRevenueCollected += aiTaxOwed;
    equityCapturedThisTick += equityCapturedOwed;

    // 4. Behavioral decisions. Flashes here are reserved for genuinely rare, notable
    // state changes (not routine per-tick activity) — colored to match BehaviorLogFeed's
    // kind coloring, so the canvas and the Inspector's log agree on what each color means.
    if (decideEvasion(agent, marginalRate, policy, weights, rng)) {
      pushRingBuffer(agent.behaviorLog, evasionLog(nextTickNumber, agent.evasionFraction, marginalRate), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_EVENT_MS;
      agent.flashColor = FLASH_COLOR_WARNING;
    }
    if ((agent.archetype === 'Business_Owner' || agent.archetype === 'HNW_Investor') && combinedAiRate > 0) {
      if (decideAiShield(agent, combinedAiRate, weights, rng)) {
        pushRingBuffer(agent.behaviorLog, aiShieldLog(nextTickNumber, combinedAiRate, agent.aiShieldFraction), BEHAVIOR_LOG_LENGTH);
        agent.flashUntil = nowMs + FLASH_EVENT_MS;
        agent.flashColor = FLASH_COLOR_AI_SHIELD;
      }
    }
    if (config.flightEligible) {
      if (decideCapitalFlight(agent, marginalRate, policy, weights, rng)) {
        pushRingBuffer(agent.behaviorLog, flightLog(nextTickNumber, marginalRate, policy.capitalGainsRate), BEHAVIOR_LOG_LENGTH);
        agent.flashUntil = nowMs + FLASH_EVENT_MS;
        agent.flashColor = FLASH_COLOR_FLIGHT;
      } else if (agent.flightProgress > 0 && agent.flightProgress < 1) {
        agent.flightProgress = Math.min(1, agent.flightProgress + 1 / FLIGHT_TICKS);
        if (agent.flightProgress >= 1) agent.isActiveInEconomy = false;
      }
    }

    // 6. Target position update (actual interpolation happens every render frame, not here).
    computeTargetPosition(agent, wealthPercentile);

    // 9. Wealth settle from ordinary income/tax (floored at 0). UBI, if any, is applied in a
    // second pass below once the AI-tax pot and each active agent's income rank are known;
    // the history snapshot is pushed there too, once each agent's final wealth for the tick
    // (including UBI) is known.
    //
    // Only `savingsRate` of net ordinary income becomes net worth — the rest is cost of living
    // and simply leaves the model. Without this, 100% of after-tax income would compound into
    // wealth every month, which pushed low-wealth agents across any poverty-line threshold in a
    // tick or two regardless of policy. Capital gains (net of their own tax/equity-capture) are
    // investment growth, not consumable income, so they still accrue in full.
    const netOrdinaryIncome = monthlyIncome - incomeTaxPaid - aiTaxOwed;
    const netCapitalIncome = capitalReturn - capGainsTaxPaid - equityCapturedOwed;
    agent.wealth = Math.max(0, agent.wealth + netOrdinaryIncome * config.savingsRate + netCapitalIncome);
    activeIncomeRecords.push({ agent, monthlyIncome, taxPaid });
  }

  // 7b. Equity fund: captured equity accrues as a public stake (see above) rather than being
  // spendable immediately. Once a year (every 12 ticks) the fund sells off a configured slice
  // of its accumulated holdings; only that liquidated cash reaches the AI-tax revenue pot (and
  // therefore UBI) — modeling a sovereign-wealth-fund-style dividend rather than an instant tax.
  state.equityFundBalance += equityCapturedThisTick;
  let equityFundLiquidated = 0;
  if (nextTickNumber % EQUITY_FUND_LIQUIDATION_INTERVAL_TICKS === 0 && state.equityFundBalance > 0) {
    equityFundLiquidated = state.equityFundBalance * policy.aiTaxMechanisms.equityCapture.annualLiquidationPct;
    state.equityFundBalance -= equityFundLiquidated;
    taxRevenueCollected += equityFundLiquidated;
    aiTaxRevenueCollected += equityFundLiquidated;
  }

  // 8. UBI: redistributes exactly the AI/automation tax pot collected this tick (not general
  // revenue) across active agents. taperStrength reweights who gets how much without changing
  // the total — 0 is a flat equal split, 1 gives the lowest earners ~2x the flat share and the
  // highest earners ~0.
  let ubiPaidOut = 0;
  if (policy.ubi.enabled && aiTaxRevenueCollected > 0 && activeIncomeRecords.length > 0) {
    activeIncomeRecords.sort((a, b) => a.monthlyIncome - b.monthlyIncome);
    const recordCount = activeIncomeRecords.length;
    const weights = activeIncomeRecords.map((_, i) => {
      const incomePercentile = recordCount > 1 ? i / (recordCount - 1) : 0.5;
      return Math.max(0, 1 + policy.ubi.taperStrength * (1 - 2 * incomePercentile));
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      for (let i = 0; i < activeIncomeRecords.length; i++) {
        const share = (weights[i] / totalWeight) * aiTaxRevenueCollected;
        activeIncomeRecords[i].agent.wealth += share;
        ubiPaidOut += share;
      }
    }
  }

  // 7. History push (ring buffer, max 12) — after UBI, so it reflects each agent's true
  // final wealth for the tick.
  for (const record of activeIncomeRecords) {
    pushRingBuffer(
      record.agent.history,
      { tick: nextTickNumber, income: record.monthlyIncome, taxPaid: record.taxPaid, wealth: record.agent.wealth },
      HISTORY_LENGTH,
    );
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
    ubiPaidOut,
    equityFundBalance: state.equityFundBalance,
    equityFundLiquidated,
    tokensConsumed,
    kwhConsumed,
    activeAgentCount,
    totalWealth,
  };

  state.tick = nextTickNumber;
  state.simDate = simDate;

  return { state, metrics };
}
