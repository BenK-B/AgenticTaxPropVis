export type Archetype = 'W2_Worker' | 'Freelancer' | 'Business_Owner' | 'HNW_Investor';

export interface ArchetypeConfig {
  archetype: Archetype;
  color: string;
  /** Annual base income, drawn log-normally: exp(mu + sigma * z). */
  incomeLogNormal: { mu: number; sigma: number };
  /** wealth = income * uniform(range) * noise */
  wealthMultiplierRange: [number, number];
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
