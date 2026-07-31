export type Archetype = 'W2_Worker' | 'Freelancer' | 'Business_Owner' | 'HNW_Investor';

/** A temporary multiplier applied to monthly income for a run of months, then it reverts to normal. */
export interface IncomeShockSpec {
  /** Probability of a fresh shock starting this tick, given the agent isn't already mid-shock. */
  pMonthly: number;
  multiplierRange: [number, number];
  durationMonthsRange: [number, number];
}

/** A one-off lump sum applied directly to wealth, sized as a multiple of one month's income. */
export interface WealthShockSpec {
  pMonthly: number;
  monthsOfIncomeRange: [number, number];
}

/**
 * Stochastic life events layered on top of the steady income/capital-return drift — job loss,
 * a slow season, a business slump or boom, a promotion, an emergency expense, a windfall. Without
 * these, wealth only ratchets upward for everyone (see savingsRate above), which is why nobody
 * ever falls back under a poverty-line threshold once the sim has run a while: real households
 * move both directions, not just up.
 */
export interface LifeShockConfig {
  negativeIncomeShock: IncomeShockSpec;
  positiveIncomeShock: IncomeShockSpec;
  negativeWealthShock: WealthShockSpec;
  positiveWealthShock: WealthShockSpec;
}

export interface ArchetypeConfig {
  archetype: Archetype;
  color: string;
  /** Annual base income, drawn log-normally: exp(mu + sigma * z). */
  incomeLogNormal: { mu: number; sigma: number };
  /** wealth = income * uniform(range) * noise */
  wealthMultiplierRange: [number, number];
  /**
   * Fraction of after-tax ordinary income left over *after* cost-of-living (see
   * costOfLivingAnnualRange below) that accrues to net worth each month — the rest is further
   * discretionary/lifestyle spending and simply leaves the model. Without this, 100% of leftover
   * income would compound into wealth every tick. Capital gains (HNW_Investor) aren't subject to
   * this — they accrue in full. If cost-of-living exceeds take-home pay in a given month, the
   * full shortfall (not scaled by savingsRate) comes straight out of wealth — you can't choose
   * not to pay rent.
   */
  savingsRate: number;
  /**
   * Annual cost-of-living (rent, food, insurance, and other must-pay expenses), drawn uniformly
   * from this range and re-rolled once per sim-year per agent, then amortized monthly. Weighted
   * by archetype/job type — a Business_Owner or HNW_Investor's lifestyle burn is heavier than a
   * W2 worker's. Deducted from wealth every tick regardless of income source, so a low earner
   * (or a wealthy agent having a rare bad income year) can see net worth stagnate or fall, not
   * just grow more slowly.
   */
  costOfLivingAnnualRange: [number, number];
  /**
   * 0-1: how *able* an agent is to conceal income from the tax authority, independent of
   * willingness. Real W2 wages are third-party withheld/reported, making evasion nearly
   * impossible regardless of how tax-averse the earner is; self-employment/cash income is far
   * easier to underreport. Multiplies decideEvasion's whole propensity (baseline + rate-driven).
   */
  evasionOpportunity: number;
  /**
   * 0-1: given an audit actually happens, how likely it is to catch real evasion. Wage evasion
   * (already rare, see evasionOpportunity) leaves an obvious paper trail against W2 reporting;
   * cash/self-employment income is genuinely harder to verify; sophisticated HNW returns are
   * harder to fully unwind despite deep audit resources, matching real-world IRS experience.
   */
  auditDetectionRate: number;
  riskToleranceRange: [number, number];
  taxSensitivityRange: [number, number];
  /** Fraction of revenue/gains tied to AI or automation, drawn uniform(range). */
  aiExposureRange: [number, number];
  /** Business_Owner only: base fraction of taxable income written off via reinvestment. */
  writeOffBase?: number;
  /** HNW_Investor only: monthly passive capital return as a fraction of wealth. */
  capitalReturnMonthly?: { mean: number; stdev: number };
  flightEligible: boolean;
  lifeShocks: LifeShockConfig;
}
