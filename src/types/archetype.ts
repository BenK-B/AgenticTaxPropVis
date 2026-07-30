export type Archetype = 'W2_Worker' | 'Freelancer' | 'Business_Owner' | 'HNW_Investor';

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
}
