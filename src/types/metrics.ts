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
  /** Total UBI disbursed to active agents this tick — the direct redistribution flow. */
  ubiPaidOut: number;
  /** Public equity fund's running stock of captured-but-not-yet-liquidated AI-linked equity. */
  equityFundBalance: number;
  /** Equity fund proceeds liquidated this tick; 0 except on the once-a-year liquidation tick. */
  equityFundLiquidated: number;
  /** 1,000-token units of AI-attributed compute consumed by the population this tick, after any
   * price-elasticity response to the token tax rate. */
  tokensConsumed: number;
  /** kWh of AI-attributed energy consumed by the population this tick, after any price-elasticity
   * response to the energy tax rate. */
  kwhConsumed: number;
  activeAgentCount: number;
  totalWealth: number;
}
