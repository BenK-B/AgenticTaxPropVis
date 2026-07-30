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
   * Fraction of after-tax ordinary income (wages/business profit, not capital gains) that
   * accrues to net worth each month — the rest is consumed as cost of living and simply leaves
   * the model. Without this, 100% of net income would compound into wealth every tick, which
   * makes low-wealth agents cross any poverty-line threshold almost immediately regardless of
   * tax policy. Capital gains (HNW_Investor) aren't subject to this — they accrue in full.
   */
  savingsRate: number;
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
