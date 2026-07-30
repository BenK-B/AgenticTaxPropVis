import type { SimDate } from './engine';

export interface MetricsSnapshot {
  tick: number;
  simDate: SimDate;
  taxRevenueCollected: number;
  taxRevenueEvaded: number;
  /** Legal AI-tax shielding/restructuring, distinct from illegal evasion. */
  taxRevenueAvoided: number;
  /** Subset of taxRevenueCollected attributable to the 5 AI/automation tax mechanisms. */
  aiTaxRevenueCollected: number;
  gini: number;
  /** Share of total wealth currently outside the active economy (cumulative stock measure). */
  capitalFlightRate: number;
  activeAgentCount: number;
  totalWealth: number;
}
