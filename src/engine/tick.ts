import type { Agent, BehaviorWeights, EngineState, MetricsSnapshot, Policy } from '@/types';
import type { RNG } from './random';
import { gaussian, uniform } from './random';
import { ARCHETYPE_CONFIGS } from './archetypes';
import {
  calculateBracketTax,
  calculateBusinessAiTax,
  calculateEquityCaptureTax,
  calculatePayrollTax,
  marginalRateFor,
} from './tax';
import { decideAiShield, decideCapitalFlight, decideCapitalReturn, decideEvasion, writeOffFactorFor } from './behavior';
import { runAudits } from './audit';
import { computeTargetPosition } from './position';
import { computeCapitalFlightRate, computeGini, inflationFactorAtTick } from './metrics';
import {
  aiShieldLog,
  auditCaughtLog,
  auditClearLog,
  businessFailureLog,
  capitalReturnLog,
  evasionLog,
  expenseShockLog,
  financialDistressLog,
  flightLog,
  incomeBoostLog,
  jobLossLog,
  windfallLog,
  writeOffLog,
} from './logMessages';
import {
  AI_SHIELD_OVERHEAD_RATE,
  BEHAVIOR_LOG_LENGTH,
  DISTRESS_COST_OF_LIVING_MULTIPLIER,
  DISTRESS_DURATION_MONTHS,
  DISTRESS_INCOME_MULTIPLIER,
  EQUITY_FUND_LIQUIDATION_INTERVAL_TICKS,
  FLASH_COLOR_AI_SHIELD,
  FLASH_COLOR_CRITICAL,
  FLASH_COLOR_FLIGHT,
  FLASH_COLOR_GOOD,
  FLASH_COLOR_NEUTRAL,
  FLASH_COLOR_WARNING,
  FLASH_EVENT_MS,
  FLASH_NEUTRAL_MS,
  FLASH_RED_MS,
  FLIGHT_TICKS,
  HISTORY_LENGTH,
  POVERTY_LINE_GROWTH_RATE_ANNUAL,
} from './constants';

/** Mean monthly wage growth pegged to the same rate the poverty line/cost-of-living inflate at,
 * so nominal wages track nominal prices on average — real per-tick noise (gaussian stdev 0.01)
 * is layered on top of this drift, not instead of it. */
const MONTHLY_WAGE_DRIFT = (1 + POVERTY_LINE_GROWTH_RATE_ANNUAL) ** (1 / 12) - 1;

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
    let config = ARCHETYPE_CONFIGS[agent.archetype];

    if (!agent.isActiveInEconomy) {
      // Capital flight isn't a one-way wealth freeze — the assets still exist and keep growing
      // somewhere else, untaxed, outside this jurisdiction's tax base. A cooled-off agent can
      // reconsider returning once the tax pressure that drove them out has genuinely eased.
      if (config.capitalReturnMonthly) {
        const fledReturn = agent.wealth * gaussian(rng, config.capitalReturnMonthly.mean, config.capitalReturnMonthly.stdev);
        agent.wealth = Math.max(0, agent.wealth + fledReturn);
      }
      const lastKnownMarginalRate = marginalRateFor(agent.income / 12, policy.brackets);
      if (decideCapitalReturn(agent, lastKnownMarginalRate, policy, weights, rng)) {
        pushRingBuffer(agent.behaviorLog, capitalReturnLog(nextTickNumber), BEHAVIOR_LOG_LENGTH);
        agent.flashUntil = nowMs + FLASH_EVENT_MS;
        agent.flashColor = FLASH_COLOR_GOOD;
      }
      continue;
    }

    // Business failure: a Business_Owner who's run out of money has, in effect, had their
    // business fail — they don't keep operating indefinitely at $0 net worth. They go back to
    // wage work, losing the write-off shelter and capital-return mechanic that came with running
    // a business, in exchange for W2 income stability.
    if (agent.archetype === 'Business_Owner' && agent.wealth <= 0) {
      agent.archetype = 'W2_Worker';
      agent.pendingCapitalGain = 0;
      config = ARCHETYPE_CONFIGS[agent.archetype];
      pushRingBuffer(agent.behaviorLog, businessFailureLog(nextTickNumber), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_RED_MS;
      agent.flashColor = FLASH_COLOR_CRITICAL;
    }

    // Financial distress: hitting $0 net worth has real consequences in reality — credit damage,
    // eviction risk, unreliable transportation, payday-loan-priced necessities — that compound
    // the difficulty of climbing back out, not just reflect being poor. Every month spent at $0
    // refreshes the window; it then lingers for a while after recovering above $0, since real
    // instability/credit damage doesn't clear the instant a bill gets paid.
    if (agent.wealth <= 0) {
      if (agent.distressMonthsRemaining <= 0) {
        pushRingBuffer(agent.behaviorLog, financialDistressLog(nextTickNumber), BEHAVIOR_LOG_LENGTH);
        agent.flashUntil = nowMs + FLASH_RED_MS;
        agent.flashColor = FLASH_COLOR_CRITICAL;
      }
      agent.distressMonthsRemaining = DISTRESS_DURATION_MONTHS;
    } else if (agent.distressMonthsRemaining > 0) {
      agent.distressMonthsRemaining -= 1;
    }
    const inDistress = agent.distressMonthsRemaining > 0;

    const wealthPercentile = n > 1 ? i / (n - 1) : 0.5;

    // 0. Life shocks: a temporary income disruption/boost (job loss, raise, business swing) and
    // an independent one-off lump sum to wealth (emergency expense, windfall). Layered on top of
    // the steady drift below so wealth can genuinely fall as well as rise — otherwise it only
    // ratchets upward (see savingsRate), which is why nobody ever falls back under a poverty-line
    // threshold once the sim has run a while.
    const shocks = config.lifeShocks;
    if (agent.incomeShockMonthsRemaining > 0) {
      agent.incomeShockMonthsRemaining -= 1;
      if (agent.incomeShockMonthsRemaining <= 0) agent.incomeShockMultiplier = 1;
    } else if (rng() < shocks.negativeIncomeShock.pMonthly) {
      agent.incomeShockMultiplier = uniform(rng, shocks.negativeIncomeShock.multiplierRange[0], shocks.negativeIncomeShock.multiplierRange[1]);
      const months = Math.round(uniform(rng, shocks.negativeIncomeShock.durationMonthsRange[0], shocks.negativeIncomeShock.durationMonthsRange[1]));
      agent.incomeShockMonthsRemaining = months;
      pushRingBuffer(agent.behaviorLog, jobLossLog(nextTickNumber, months), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_RED_MS;
      agent.flashColor = FLASH_COLOR_CRITICAL;
    } else if (rng() < shocks.positiveIncomeShock.pMonthly) {
      agent.incomeShockMultiplier = uniform(rng, shocks.positiveIncomeShock.multiplierRange[0], shocks.positiveIncomeShock.multiplierRange[1]);
      const months = Math.round(uniform(rng, shocks.positiveIncomeShock.durationMonthsRange[0], shocks.positiveIncomeShock.durationMonthsRange[1]));
      agent.incomeShockMonthsRemaining = months;
      pushRingBuffer(agent.behaviorLog, incomeBoostLog(nextTickNumber, months), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_EVENT_MS;
      agent.flashColor = FLASH_COLOR_GOOD;
    }

    let wealthShockAmount = 0;
    if (rng() < shocks.negativeWealthShock.pMonthly) {
      const amount = uniform(rng, shocks.negativeWealthShock.monthsOfIncomeRange[0], shocks.negativeWealthShock.monthsOfIncomeRange[1]) * (agent.income / 12);
      wealthShockAmount -= amount;
      pushRingBuffer(agent.behaviorLog, expenseShockLog(nextTickNumber, amount), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_EVENT_MS;
      agent.flashColor = FLASH_COLOR_WARNING;
    } else if (rng() < shocks.positiveWealthShock.pMonthly) {
      const amount = uniform(rng, shocks.positiveWealthShock.monthsOfIncomeRange[0], shocks.positiveWealthShock.monthsOfIncomeRange[1]) * (agent.income / 12);
      wealthShockAmount += amount;
      pushRingBuffer(agent.behaviorLog, windfallLog(nextTickNumber, amount), BEHAVIOR_LOG_LENGTH);
      agent.flashUntil = nowMs + FLASH_EVENT_MS;
      agent.flashColor = FLASH_COLOR_GOOD;
    }

    // Cost of living: re-rolled once per sim-year (not every tick) so a given year's cost is a
    // single random draw — a genuinely expensive or cheap year — rather than smoothing to the
    // archetype's average, then amortized evenly across that year's 12 ticks.
    if (nextTickNumber % 12 === 1) {
      const base = uniform(rng, config.costOfLivingAnnualRange[0], config.costOfLivingAnnualRange[1]);
      agent.costOfLivingAnnual = base * inflationFactorAtTick(nextTickNumber);
    }

    // 1. Income generation. Financial distress dents earning capacity a bit (unreliable
    // transportation, disrupted logistics, employers wary of instability).
    const growthFactor = 1 + MONTHLY_WAGE_DRIFT + gaussian(rng, 0, 0.01);
    const monthlyIncome =
      (agent.income / 12) * growthFactor * agent.incomeShockMultiplier * (inDistress ? DISTRESS_INCOME_MULTIPLIER : 1);
    agent.income *= growthFactor;

    // Capital appreciation (business equity or investment portfolio, depending on archetype).
    // Only taxed once a year on the NET accumulated gain (see the settlement block below), not
    // on every up month — taxing each positive month independently, with no credit for down
    // months, would overtax volatile returns far above the nominal capital gains rate.
    const capitalReturn = config.capitalReturnMonthly
      ? agent.wealth * gaussian(rng, config.capitalReturnMonthly.mean, config.capitalReturnMonthly.stdev)
      : 0;
    agent.pendingCapitalGain += capitalReturn;

    // 2. Write-offs (Business_Owner and Freelancer — Schedule-C-style deductions apply to any
    // self-employed/1099 income, just at different scale): a real reinvestment/business-expense
    // cost, not a free tax shelter — the written-off amount is money actually spent (equipment,
    // home office, mileage, etc.), so it comes out of personal take-home the same as any other
    // expense, not just off taxable income.
    let taxableEarnedIncome = monthlyIncome;
    let writeOffAmount = 0;
    if (config.writeOffBase !== undefined) {
      const writeOffFactor = writeOffFactorFor(agent, weights, config.writeOffBase);
      writeOffAmount = monthlyIncome * writeOffFactor;
      taxableEarnedIncome = monthlyIncome - writeOffAmount;
      if (writeOffFactor > 0.3) {
        pushRingBuffer(agent.behaviorLog, writeOffLog(nextTickNumber, writeOffFactor), BEHAVIOR_LOG_LENGTH);
      }
    }

    // 2b. Payroll / self-employment tax (FICA-equivalent) on earned income, separate from bracket
    // income tax and capital gains.
    const payrollTaxGross = calculatePayrollTax(taxableEarnedIncome, agent.archetype);

    // 3. Ordinary income tax, after a standard-deduction-equivalent exclusion.
    const taxableIncome = Math.max(0, taxableEarnedIncome - policy.standardDeductionAnnual / 12);
    const marginalRate = marginalRateFor(taxableIncome, policy.brackets);
    const grossIncomeTax = calculateBracketTax(taxableIncome, policy.brackets);

    const isEvading = agent.complianceStatus === 'evading';
    const incomeTaxPaid = isEvading ? grossIncomeTax * (1 - agent.evasionFraction) : grossIncomeTax;
    const payrollTaxPaid = isEvading ? payrollTaxGross * (1 - agent.evasionFraction) : payrollTaxGross;

    let aiTaxOwed = 0;
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
      // The behavioral pressure signal doesn't depend on this month's capital-return sign (see
      // calculateEquityCaptureTax) — actual dollars owed are only computed at annual settlement.
      combinedAiRate = policy.aiTaxMechanisms.equityCapture.enabled ? policy.aiTaxMechanisms.equityCapture.rate : 0;
    }
    // Legal tax avoidance (AI shielding) has real overhead in reality — accountants,
    // restructuring, compliance — not a costless shelter. Still net-beneficial, just not free.
    const shieldOverheadCost = aiTaxAvoided * AI_SHIELD_OVERHEAD_RATE;

    // 3b. Capital gains settlement: once a year, tax the NET accumulated gain — losses carry
    // forward to offset future gains (agent.pendingCapitalGain is only reset when it was
    // positive and got taxed), like real capital-loss carryforward, rather than taxing every up
    // month with no credit for down months.
    let capGainsTaxPaid = 0;
    let equityCapturedOwed = 0;
    let capGainsEvaded = 0;
    let equityCaptureAvoided = 0;
    if (nextTickNumber % 12 === 0 && agent.pendingCapitalGain > 0) {
      const settledGain = agent.pendingCapitalGain;
      const grossCapGainsTax = settledGain * policy.capitalGainsRate;
      capGainsTaxPaid = isEvading ? grossCapGainsTax * (1 - agent.evasionFraction) : grossCapGainsTax;
      capGainsEvaded = grossCapGainsTax - capGainsTaxPaid;
      if (agent.archetype === 'HNW_Investor') {
        const eqResult = calculateEquityCaptureTax(settledGain, agent.aiExposure, agent.aiShieldFraction, policy.aiTaxMechanisms);
        equityCapturedOwed = eqResult.owed;
        equityCaptureAvoided = eqResult.shieldedOwed;
      }
      agent.pendingCapitalGain = 0;
    }
    const equityShieldOverheadCost = equityCaptureAvoided * AI_SHIELD_OVERHEAD_RATE;

    const evadedThisTick =
      (isEvading ? grossIncomeTax - incomeTaxPaid + (payrollTaxGross - payrollTaxPaid) : 0) + capGainsEvaded;
    if (evadedThisTick > 0) evadedTaxThisTick.set(agent.id, evadedThisTick);

    // Captured equity still leaves the investor's wealth this tick (the stake is transferred
    // out of their portfolio), even though it isn't recognized as revenue/AI-tax-collected until
    // the fund liquidates it — see the equity-fund block after this loop.
    const taxPaid = incomeTaxPaid + payrollTaxPaid + capGainsTaxPaid + aiTaxOwed + equityCapturedOwed;
    taxRevenueCollected += incomeTaxPaid + payrollTaxPaid + capGainsTaxPaid + aiTaxOwed;
    taxRevenueEvaded += evadedThisTick;
    taxRevenueAvoided += aiTaxAvoided + equityCaptureAvoided;
    aiTaxRevenueCollected += aiTaxOwed;
    equityCapturedThisTick += equityCapturedOwed;

    // 4. Behavioral decisions. Flashes here are reserved for genuinely rare, notable
    // state changes (not routine per-tick activity) — colored to match BehaviorLogFeed's
    // kind coloring, so the canvas and the Inspector's log agree on what each color means.
    if (decideEvasion(agent, marginalRate, policy, weights, rng, config.evasionOpportunity)) {
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

    // 9. Wealth settle from ordinary income/tax/cost-of-living (floored at 0). UBI, if any, is
    // applied in a second pass below once the AI-tax pot and each active agent's income rank are
    // known; the history snapshot is pushed there too, once each agent's final wealth for the
    // tick (including UBI) is known.
    //
    // Take-home pay must first cover cost of living (see the annual re-roll above) — a real,
    // must-pay expense independent of income level or source. Only `savingsRate` of whatever's
    // left over after that accrues to net worth (the rest is further discretionary spending). If
    // cost of living exceeds take-home pay, the full shortfall comes straight out of wealth — you
    // can't scale down your rent by a "savings rate" when you're underwater. Capital gains (net of
    // their own tax/equity-capture, only realized at annual settlement) are investment growth,
    // not consumable income, so the underlying appreciation still accrues in full every month.
    // Financial distress also makes necessities themselves cost more in practice — no bulk
    // buying, payday-loan-priced emergencies, higher insurance/deposit costs when your credit is
    // damaged — on top of the direct income hit above.
    const netOrdinaryIncome = monthlyIncome - writeOffAmount - incomeTaxPaid - payrollTaxPaid - aiTaxOwed - shieldOverheadCost;
    const costOfLivingMonthly = (agent.costOfLivingAnnual / 12) * (inDistress ? DISTRESS_COST_OF_LIVING_MULTIPLIER : 1);
    const disposableIncome = netOrdinaryIncome - costOfLivingMonthly;
    const netWealthFromIncome = disposableIncome >= 0 ? disposableIncome * config.savingsRate : disposableIncome;
    const netCapitalIncome = capitalReturn - capGainsTaxPaid - equityCapturedOwed - equityShieldOverheadCost;
    agent.wealth = Math.max(0, agent.wealth + netWealthFromIncome + netCapitalIncome + wealthShockAmount);
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
